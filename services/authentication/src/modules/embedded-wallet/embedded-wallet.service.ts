import {
  BaseProjectQueryFilter,
  BlockchainMicroservice,
  CreateEWIntegrationDto,
  CreateOasisSignatureDto,
  DefaultUserRole,
  EmbeddedWalletSignaturesQueryFilter,
  GetQuotaDto,
  Mailing,
  MySql,
  ProductCode,
  QuotaCode,
  Scs,
  ServiceName,
  SpendCreditDto,
  SqlModelStatus,
  env,
  getEnvSecrets,
  spendCreditAction,
} from '@apillon/lib';
import { ServiceContext } from '@apillon/service-lib';
import { v4 as uuid } from 'uuid';
import {
  AuthenticationErrorCode,
  DbTables,
  Defaults,
} from '../../config/types';
import {
  AuthenticationCodeException,
  AuthenticationValidationException,
} from '../../lib/exceptions';
import { EmbeddedWalletIntegration } from './models/embedded-wallet-integration.model';
import { OasisSignature } from './models/oasis-signature.model';

export class EmbeddedWalletService {
  static async getEmbeddedWalletInfo(
    event: { project_uuid: string },
    context: ServiceContext,
  ) {
    const [quotas, numOfIntegrations, numOfSignatures] = await Promise.all([
      new Scs(context).getQuotas(
        new GetQuotaDto({
          project_uuid: event.project_uuid,
        }),
      ),
      new EmbeddedWalletIntegration(
        {
          project_uuid: event.project_uuid,
        },
        context,
      ).getNumOfIntegrations(),
      new OasisSignature(
        { project_uuid: event.project_uuid },
        context,
      ).getNumOfSignaturesForCurrentMonth(),
    ]);

    return {
      maxNumOfEWIntegrations:
        quotas.find((q) => q.id === QuotaCode.MAX_EMBEDDED_WALLET_INTEGRATIONS)
          ?.value || Defaults.MAX_EMBEDDED_WALLET_INTEGRATIONS,
      numOfEWIntegrations: numOfIntegrations,
      maxNumOfEWSignatures:
        quotas.find((q) => q.id === QuotaCode.MAX_EMBEDDED_WALLET_SIGNATURES)
          ?.value || Defaults.MAX_EMBEDDED_WALLET_SIGNATURES,
      numOfEWSignaturesForCurrentMonth: numOfSignatures,
    };
  }

  static async listEmbeddedWalletIntegrations(
    event: { query: BaseProjectQueryFilter },
    context: ServiceContext,
  ) {
    return await new EmbeddedWalletIntegration(
      { project_uuid: event.query.project_uuid },
      context,
    ).getList(context, new BaseProjectQueryFilter(event.query));
  }

  static async getEmbeddedWalletIntegration(
    event: { integration_uuid: string },
    context: ServiceContext,
  ) {
    const ewIntegration = await new EmbeddedWalletIntegration(
      {},
      context,
    ).populateByUUIDAndCheckAccess(event.integration_uuid);

    const dateFrom = new Date();
    dateFrom.setMonth(dateFrom.getMonth() - 1);
    const usage = await ewIntegration.getUsageByDay(dateFrom);

    return { ...ewIntegration.serializeByContext(context), usage };
  }

  static async createEmbeddedWalletIntegration(
    event: { body: CreateEWIntegrationDto },
    context: ServiceContext,
  ) {
    const ewIntegration = new EmbeddedWalletIntegration(
      event.body,
      context,
    ).populate({ integration_uuid: uuid() });

    await ewIntegration.validateOrThrow(AuthenticationValidationException);

    ewIntegration.canAccess(context);

    //Check quota
    const [quotas, numOfIntegrations] = await Promise.all([
      new Scs(context).getQuotas(
        new GetQuotaDto({
          quota_id: QuotaCode.MAX_EMBEDDED_WALLET_INTEGRATIONS,
          project_uuid: ewIntegration.project_uuid,
        }),
      ),
      ewIntegration.getNumOfIntegrations(),
    ]);

    if (quotas.length && quotas[0].value <= numOfIntegrations) {
      throw new AuthenticationCodeException({
        code: AuthenticationErrorCode.MAX_NUMBER_OF_EMBEDDED_WALLET_INTEGRATIONS_REACHED,
        status: 400,
      });
    }

    await ewIntegration.insert();

    // Set mailerlite field indicating the user created an embedded wallet integration
    new Mailing(context).setMailerliteField('has_wallet_integration');

    return ewIntegration.serialize(context.getSerializationStrategy());
  }

  static async updateEmbeddedWalletIntegration(
    event: { integration_uuid: string; body: any },
    context: ServiceContext,
  ) {
    const ewIntegration = await new EmbeddedWalletIntegration(
      {},
      context,
    ).populateByUUIDAndCheckAccess(event.integration_uuid);

    ewIntegration.populate(event.body);
    await ewIntegration.validateOrThrow(AuthenticationValidationException);
    await ewIntegration.update();

    return ewIntegration.serialize(context.getSerializationStrategy());
  }

  static async createOasisSignature(
    event: { body: CreateOasisSignatureDto },
    context: ServiceContext,
  ) {
    // Get embedded wallet integration
    const ewIntegration = await new EmbeddedWalletIntegration(
      {},
      context,
    ).populateByUUID(event.body.integration_uuid, 'integration_uuid');

    if (!ewIntegration.exists()) {
      throw new AuthenticationCodeException({
        status: 404,
        code: AuthenticationErrorCode.EMBEDDED_WALLET_INTEGRATION_NOT_FOUND,
      });
    }

    if (
      !!ewIntegration.whitelistedDomains &&
      !ewIntegration.whitelistedDomains.split(',').some((domain) => {
        const regexPattern = domain
          .trim()
          .replace(/\./g, '\\.')
          .replace(/\*/g, '.*');
        return new RegExp(regexPattern).test(event.body.origin);
      })
    ) {
      throw new AuthenticationCodeException({
        status: 403,
        code: AuthenticationErrorCode.EMBEDDED_WALLET_INTEGRATION_DOMAIN_NOT_WHITELISTED,
      });
    }

    const project_uuid = ewIntegration.project_uuid;

    const [quotas, numOfSignatures] = await Promise.all([
      new Scs(context).getQuotas(
        new GetQuotaDto({
          quota_id: QuotaCode.MAX_EMBEDDED_WALLET_SIGNATURES,
          project_uuid,
        }),
      ),
      new OasisSignature(
        { project_uuid },
        context,
      ).getNumOfSignaturesForCurrentMonth(),
    ]);

    if (quotas.length && quotas[0].value <= numOfSignatures) {
      throw new AuthenticationCodeException({
        code: AuthenticationErrorCode.MAX_NUMBER_OF_EMBEDDED_WALLET_SIGNATURES_REACHED,
        status: 400,
      });
    }

    const timestamp = Math.ceil(new Date().getTime() / 1000) + 3600;

    const signatureRes = (
      await new BlockchainMicroservice(context).createOasisSignature({
        data: event.body.data,
        timestamp,
      })
    ).data;

    const oasisSignature = new OasisSignature({}, context).populate({
      status: SqlModelStatus.INACTIVE,
      embeddedWalletIntegration_id: ewIntegration.id,
      project_uuid,
      dataHash: signatureRes.dataHash,
    });

    await oasisSignature.validateOrThrow(AuthenticationValidationException);

    const spendCredit: SpendCreditDto = new SpendCreditDto(
      {
        project_uuid,
        product_id: ProductCode.OASIS_SIGNATURE,
        referenceTable: DbTables.OASIS_SIGNATURE,
        referenceId: signatureRes.dataHash,
        location: 'OasisService/createOasisSignature',
        service: ServiceName.AUTH,
      },
      context,
    );

    await spendCreditAction(context, spendCredit, () =>
      oasisSignature.insert(),
    );

    EmbeddedWalletService.setWalletMailerliteField(context, project_uuid);

    return {
      signature: signatureRes.signature,
      gasPrice: signatureRes.gasPrice,
      timestamp,
    };
  }

  static async listOasisSignatures(
    event: {
      query: EmbeddedWalletSignaturesQueryFilter;
    },
    context: ServiceContext,
  ) {
    const ewIntegration = await new EmbeddedWalletIntegration(
      {},
      context,
    ).populateByUUID(event.query.integration_uuid, 'integration_uuid');

    if (!ewIntegration.exists()) {
      throw new AuthenticationCodeException({
        status: 404,
        code: AuthenticationErrorCode.EMBEDDED_WALLET_INTEGRATION_NOT_FOUND,
      });
    }
    ewIntegration.canAccess(context);

    return await new OasisSignature({}, context).getList(
      context,
      new EmbeddedWalletSignaturesQueryFilter(event.query),
    );
  }

  static async getOasisSignatureByPublicAddress(
    event: { publicAddress: string },
    context: ServiceContext,
  ) {
    return await new OasisSignature({}, context).populateByPublicAddress(
      event.publicAddress,
    );
  }

  private static async setWalletMailerliteField(
    context: ServiceContext,
    project_uuid: string,
  ) {
    await getEnvSecrets();
    const mysql = new MySql({
      host: env.DEV_CONSOLE_API_MYSQL_HOST,
      database: env.DEV_CONSOLE_API_MYSQL_DATABASE,
      password: env.DEV_CONSOLE_API_MYSQL_PASSWORD,
      port: env.DEV_CONSOLE_API_MYSQL_PORT,
      user: env.DEV_CONSOLE_API_MYSQL_USER,
    });

    try {
      await mysql.connect();
      // Get the project owner's email to set mailerlite field
      const { 0: owner } =
        (await mysql.paramExecute(
          `SELECT u.email, u.user_uuid FROM project_user pu
          LEFT JOIN project p on p.id = pu.project_id
          LEFT JOIN user u on u.id = pu.user_id
          WHERE p.project_uuid = @project_uuid AND pu.role_id = ${DefaultUserRole.PROJECT_OWNER}`,
          { project_uuid },
        )) || [];

      if (owner?.email) {
        const mailContext = {
          ...context,
          user: { email: owner.email, user_uuid: owner.user_uuid },
        } as ServiceContext;
        await new Mailing(mailContext).setMailerliteField(
          'has_embedded_wallet',
          true,
          owner.email,
        );
      }
      await mysql.close();
    } catch (err) {
      console.error(`Error setting mailerlite field: ${err}`);
      await mysql
        .close()
        .catch((err2) => console.error('Error closing MySQL connection', err2));
    }
  }
}

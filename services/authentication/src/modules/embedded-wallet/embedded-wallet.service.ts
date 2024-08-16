import {
  BaseProjectQueryFilter,
  BlockchainMicroservice,
  CodeException,
  CreateEWIntegrationDto,
  CreateOasisSignatureDto,
  EmbeddedWalletSignaturesQueryFilter,
  ForbiddenErrorCodes,
  GetQuotaDto,
  ProductCode,
  QuotaCode,
  Scs,
  ServiceName,
  SpendCreditDto,
  SqlModelStatus,
  spendCreditAction,
} from '@apillon/lib';
import { ServiceContext } from '@apillon/service-lib';
import { v4 as uuid } from 'uuid';
import {
  AuthenticationErrorCode,
  DbTables,
  ResourceNotFoundErrorCode,
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
      maxNumOfEWIntegrations: quotas.find(
        (q) => q.id === QuotaCode.MAX_EMBEDDED_WALLET_INTEGRATIONS,
      )?.value,
      numOfEWIntegrations: numOfIntegrations,
      maxNumOfEWSignatures: quotas.find(
        (q) => q.id === QuotaCode.MAX_EMBEDDED_WALLET_SIGNATURES,
      )?.value,
      numOfEWSignaturesForCurrentMonth: numOfSignatures,
    };
  }

  static async listEWIntegrations(
    event: { query: BaseProjectQueryFilter },
    context: ServiceContext,
  ) {
    return await new EmbeddedWalletIntegration(
      { project_uuid: event.query.project_uuid },
      context,
    ).getList(context, new BaseProjectQueryFilter(event.query));
  }

  static async getEWIntegration(
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

  static async createEWIntegration(
    event: { body: CreateEWIntegrationDto },
    context: ServiceContext,
  ) {
    const ewIntegration = new EmbeddedWalletIntegration(
      event.body,
      context,
    ).populate({
      integration_uuid: uuid(),
    });
    await ewIntegration.validateOrThrow(AuthenticationValidationException);

    await ewIntegration.canAccess(context);

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

    return ewIntegration.serialize(context.getSerializationStrategy());
  }

  static async updateEWIntegration(
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
    //Get embedded wallet integration
    const ewIntegration = await new EmbeddedWalletIntegration(
      {},
      context,
    ).populateByUUID(event.body.integration_uuid, 'integration_uuid');

    if (!ewIntegration.exists()) {
      throw new AuthenticationCodeException({
        status: 404,
        code: ResourceNotFoundErrorCode.EMBEDDED_WALLET_INTEGRATION_NOT_FOUND,
      });
    }

    if (ewIntegration.project_uuid != event.body.project_uuid) {
      throw new CodeException({
        code: ForbiddenErrorCodes.FORBIDDEN,
        status: 403,
        errorMessage: 'Insufficient permissions to access this record',
      });
    }

    const [quotas, numOfSignatures] = await Promise.all([
      new Scs(context).getQuotas(
        new GetQuotaDto({
          quota_id: QuotaCode.MAX_EMBEDDED_WALLET_SIGNATURES,
          project_uuid: ewIntegration.project_uuid,
        }),
      ),
      new OasisSignature(
        { project_uuid: ewIntegration.project_uuid },
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
      project_uuid: event.body.project_uuid,
      dataHash: signatureRes.dataHash,
      apiKey: event.body.apiKey,
    });

    await oasisSignature.validateOrThrow(AuthenticationValidationException);

    const spendCredit: SpendCreditDto = new SpendCreditDto(
      {
        project_uuid: event.body.project_uuid,
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
    return await new OasisSignature({}, context).getList(
      context,
      new EmbeddedWalletSignaturesQueryFilter(event.query),
    );
  }
}

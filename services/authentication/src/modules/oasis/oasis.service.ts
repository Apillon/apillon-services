import {
  Ams,
  ApiKeyQueryFilterDto,
  BlockchainMicroservice,
  CreateOasisSignatureDto,
  OasisSignaturesQueryFilter,
  ProductCode,
  ServiceName,
  SpendCreditDto,
  SqlModelStatus,
  spendCreditAction,
} from '@apillon/lib';
import { ServiceContext } from '@apillon/service-lib';
import { AuthenticationValidationException } from '../../lib/exceptions';
import { OasisSignature } from './models/oasis-signature.model';
import { DbTables } from '../../config/types';

export class OasisService {
  static async createOasisSignature(
    event: { body: CreateOasisSignatureDto },
    context: ServiceContext,
  ) {
    const timestamp = Math.ceil(new Date().getTime() / 1000) + 3600;

    const signatureRes = (
      await new BlockchainMicroservice(context).createOasisSignature({
        data: event.body.data,
        timestamp,
      })
    ).data;

    const oasisSignature = new OasisSignature({}, context).populate({
      status: SqlModelStatus.INACTIVE,
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

    return { signature: signatureRes.signature };
  }

  static async listOasisSignatures(
    event: {
      query: OasisSignaturesQueryFilter;
    },
    context: ServiceContext,
  ) {
    return await new OasisSignature(
      { project_uuid: event.query.project_uuid },
      context,
    ).getList(context, new OasisSignaturesQueryFilter(event.query));
  }

  static async getOasisSignaturesCountByApiKey(
    event: { project_uuid: string },
    context: ServiceContext,
  ) {
    //Get Api keys from AMS
    const apiKeys = (
      await new Ams(context).listApiKeys(
        new ApiKeyQueryFilterDto(
          { project_uuid: event.project_uuid },
          context,
        ).populate({ limit: 1000 }),
      )
    ).data.items;

    //Get oasis signatures by api keys
    const signaturesByApiKey = await new OasisSignature(
      {
        project_uuid: event.project_uuid,
      },
      context,
    ).signaturesByApiKey();

    apiKeys.map(
      (x) =>
        (x.oasisSignatures = signaturesByApiKey.find(
          (y) => y.apiKey == x.apiKey,
        )
          ? signaturesByApiKey.find((y) => y.apiKey == x.apiKey).numOfSignatures
          : 0),
    );

    return apiKeys;
  }
}

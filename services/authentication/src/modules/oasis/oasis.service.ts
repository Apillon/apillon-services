import {
  BlockchainMicroservice,
  CreateOasisSignatureDto,
  EvmChain,
  SqlModelStatus,
} from '@apillon/lib';
import { ServiceContext } from '@apillon/service-lib';
import { AuthenticationValidationException } from '../../lib/exceptions';
import { OasisSignature } from './models/oasis-signature.model';

export class OasisService {
  static async createOasisSignature(
    event: { body: CreateOasisSignatureDto },
    context: ServiceContext,
  ) {
    const timestamp = Math.ceil(new Date().getTime() / 1000) + 3600;

    const signatureRes = (
      await new BlockchainMicroservice(context).createEvmSignature({
        chain: EvmChain.OASIS,
        data: event.body.data,
        timestamp,
      })
    ).data;

    const oasisSignature = new OasisSignature({}, context).populate({
      status: SqlModelStatus.INACTIVE,
      project_uuid: event.body.project_uuid,
      dataHash: signatureRes.dataHash,
    });

    await oasisSignature.validateOrThrow(AuthenticationValidationException);

    await oasisSignature.insert();

    return signatureRes.signature;
  }
}

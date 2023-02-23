import { env, Lmas, LogType, ServiceName } from '@apillon/lib';
import {
  Attestation,
  ConfigService,
  connect,
  Credential,
  IAttestation,
} from '@kiltprotocol/sdk-js';
import { Injectable } from '@nestjs/common';

@Injectable()
export class VerificationMicroservice {
  static async verifyIdentity(event, context): Promise<any> {
    await connect(env.KILT_NETWORK);
    const api = ConfigService.get('api');

    const presentation = JSON.parse(event.body.presentation);
    let attestation: IAttestation;

    try {
      await Credential.verifyPresentation(presentation, {
        challenge:
          '0x3ce56bb25ea3b603f968c302578e77e28d3d7ba3c7a8c45d6ebd3f410da766e1',
      });

      attestation = Attestation.fromChain(
        await api.query.attestation.attestations(presentation.rootHash),
        presentation.rootHash,
      );

      await new Lmas().writeLog({
        context: context,
        logType: LogType.INFO,
        message: 'VERIFICATION SUCCESSFUL',
        location: 'AUTHENTICATION-API/verification/verifyIdentity',
        service: ServiceName.AUTHENTICATION_API,
      });
    } catch (error) {
      return {
        verified: false,
        error: error.message.replace(/['"]+/g, ''),
      };
    }

    return attestation.revoked
      ? { verified: false, error: 'Credential was revoked!' }
      : { verified: true };
  }
}

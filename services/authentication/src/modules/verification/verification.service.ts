import {
  env,
  generateJwtToken,
  JwtTokenType,
  Lmas,
  LogType,
  ServiceName,
} from '@apillon/lib';
import {
  Attestation,
  ConfigService,
  connect,
  Credential,
  IAttestation,
  ICredentialPresentation,
} from '@kiltprotocol/sdk-js';
import { Injectable } from '@nestjs/common';

@Injectable()
export class VerificationMicroservice {
  static async verifyIdentity(event, context): Promise<any> {
    await connect(env.KILT_NETWORK);
    const api = ConfigService.get('api');

    const presentation = JSON.parse(
      event.body.presentation,
    ) as ICredentialPresentation;
    let attestation: IAttestation;

    try {
      await Credential.verifyPresentation(presentation);

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

    const token = generateJwtToken(
      JwtTokenType.USER_AUTHENTICATION,
      { email: presentation.claim.contents.Email },
      '10min',
    );

    return attestation.revoked
      ? { verified: false, error: 'Credential was revoked!' }
      : { verified: true, data: token };
  }
}

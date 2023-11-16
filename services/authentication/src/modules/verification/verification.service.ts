import { VerificationIdentityDto } from '@apillon/lib';
import {
  env,
  generateJwtToken,
  JwtTokenType,
  Lmas,
  LogType,
  parseJwtToken,
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

export class VerificationService {
  static async verifyIdentity(
    event: { body: VerificationIdentityDto },
    context,
  ): Promise<any> {
    await connect(env.KILT_NETWORK);
    const api = ConfigService.get('api');

    const presentation = JSON.parse(
      event.body.presentation,
    ) as ICredentialPresentation;
    let attestation: IAttestation;

    try {
      // Offline the
      await Credential.verifyPresentation(presentation);

      // Onchain
      attestation = Attestation.fromChain(
        await api.query.attestation.attestations(presentation.rootHash),
        presentation.rootHash,
      );
      if (attestation.revoked) {
        return { verified: false, error: 'Credential was revoked!' };
      }
    } catch (error) {
      return {
        verified: false,
        error: error.message.replace(/['"]+/g, ''),
      };
    }

    const whitelist = env.KILT_ATTESTERS_WHITELIST.split(';');
    if (!whitelist.includes(attestation.owner.split('did:kilt:')[1])) {
      await new Lmas().writeLog({
        context,
        logType: LogType.INFO,
        message: 'VERIFICATION FAILED: Unknown attester',
        location: 'AUTHENTICATION-API/verification/verifyIdentity',
        service: ServiceName.AUTHENTICATION_API,
      });

      return {
        verified: false,
        error: 'Verification failed',
      };
    }

    const { project_uuid } = parseJwtToken(
      JwtTokenType.AUTH_SESSION,
      event.body.token,
    );

    const email = presentation.claim.contents.Email;

    const token = generateJwtToken(
      JwtTokenType.OAUTH_TOKEN,
      { email, project_uuid },
      '10min',
    );

    return { verified: true, data: token };
  }
}

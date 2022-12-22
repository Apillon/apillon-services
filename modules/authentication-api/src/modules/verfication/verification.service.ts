import { env, Lmas, LogType, ServiceName } from '@apillon/lib';
import {
  Attestation,
  ConfigService,
  connect,
  Credential,
  IAttestation,
} from '@kiltprotocol/sdk-js';
import { Injectable } from '@nestjs/common';
import { AuthenticationApiContext } from '../../context';
import { VerificationIdentityDto } from './dto/verify-identity.dto';

@Injectable()
export class VerificationService {
  async verifyIdentity(
    context: AuthenticationApiContext,
    body: VerificationIdentityDto,
  ): Promise<any> {
    await connect(env.KILT_NETWORK);
    const api = ConfigService.get('api');
    const presentation = JSON.parse(body.presentation);
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
      await new Lmas().writeLog({
        context: context,
        logType: LogType.ERROR,
        message: 'VERIFICATION FAILED:' + error,
        location: 'AUTHENTICATION-API/verification/verifyIdentity',
        service: ServiceName.AUTHENTICATION_API,
      });
      return { verified: false, error: error.message };
    }

    return attestation.revoked
      ? { verified: false, error: 'Credential was revoked!' }
      : { verified: true };
  }
}

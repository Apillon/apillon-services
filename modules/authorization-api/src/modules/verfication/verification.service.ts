import { env } from '@apillon/lib';
import {
  Attestation,
  ConfigService,
  connect,
  ICredentialPresentation,
} from '@kiltprotocol/sdk-js';
import { Injectable } from '@nestjs/common';
import { AuthorizationApiContext } from '../../context';
import { VerificationIdentityDto } from './dto/verify-identity.dto';

@Injectable()
export class VerificationService {
  async verifyIdentity(
    context: AuthorizationApiContext,
    body: VerificationIdentityDto,
  ): Promise<any> {
    await connect(env.KILT_NETWORK);
    const api = ConfigService.get('api');

    // console.log(presentation);
    // console.log('Presentation type ', typeof presentation);

    // try {
    //   await Credential.verifyPresentation(presentation, { challenge });
    //   const attestationInfo = Attestation.fromChain(
    //     await api.query.attestation.attestations(presentation.rootHash),
    //     presentation.rootHash,
    //   );
    //   return { identityVerified: !attestationInfo.revoked };
    // } catch (error) {
    //   console.log(error);
    //   return { identityVerified: false };
    // }
  }
}

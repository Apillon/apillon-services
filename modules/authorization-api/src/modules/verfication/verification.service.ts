import { env } from '@apillon/lib';
import {
  Attestation,
  ConfigService,
  connect,
  ICredentialPresentation,
} from '@kiltprotocol/sdk-js';
import { HttpStatus, Injectable } from '@nestjs/common';
import { AuthorizationApiContext } from '../../context';
import { VerificationIdentityDto } from './dto/verify-identity.dto';
import { Credential } from '@kiltprotocol/sdk-js';
import { challenge } from '../../config/types';

@Injectable()
export class VerificationService {
  async verifyIdentity(
    context: AuthorizationApiContext,
    body: VerificationIdentityDto,
  ): Promise<any> {
    await connect(env.KILT_NETWORK);
    const api = ConfigService.get('api');
    const presentation = body.presentation as ICredentialPresentation;

    console.log(presentation);
    console.log('Presentation type ', typeof presentation);

    try {
      await Credential.verifyPresentation(presentation, { challenge });
      const attestationInfo = Attestation.fromChain(
        await api.query.attestation.attestations(presentation.rootHash),
        presentation.rootHash,
      );
      return { identityVerified: !attestationInfo.revoked };
    } catch (error) {
      console.log(error);
      return { identityVerified: false };
    }
  }
}

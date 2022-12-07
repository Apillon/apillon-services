import { env } from '@apillon/lib';
import {
  Attestation,
  ConfigService,
  connect,
  Credential,
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

    const presentation = JSON.parse(body.presentation);

    try {
      await Credential.verifyPresentation(presentation, {
        challenge:
          '0x3ce56bb25ea3b603f968c302578e77e28d3d7ba3c7a8c45d6ebd3f410da766e1',
      });
      const attestationInfo = Attestation.fromChain(
        await api.query.attestation.attestations(presentation.rootHash),
        presentation.rootHash,
      );

      console.log('Attestation info ', attestationInfo);

      return { verified: !attestationInfo.revoked };
    } catch (error) {
      console.log(error);
      return { verified: false };
    }
  }
}

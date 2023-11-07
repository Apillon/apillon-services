import {
  AttestationDto,
  env,
  AppEnvironment,
  IdentityCreateDto,
  IdentityLinkAccountDidDto,
  IdentityDidRevokeDto,
} from '@apillon/lib';
import { Identity } from '../../modules/identity/models/identity.model';
import { IdentityService } from '../../modules/identity/identity.service';

export async function attestClaim(
  context: any,
  identity: Identity,
  linkParameters: object,
) {
  const attestationClaimDto = new AttestationDto().populate({
    email: identity.email,
    didUri: identity.didUri,
    token: identity.token,
    linkParameters,
  });

  if (env.APP_ENV != AppEnvironment.TEST) {
    await IdentityService.attestClaim({ body: attestationClaimDto }, context);
  }
}

export async function identityGenerate(
  context: any,
  email: string,
  did_create_op: any,
) {
  const identityCreateDto = new IdentityCreateDto().populate({
    email,
    did_create_op,
  });

  if (env.APP_ENV != AppEnvironment.TEST) {
    await IdentityService.generateIdentity(
      { body: identityCreateDto },
      context,
    );
  }
}

export async function linkAccToDid(
  context: any,
  params: IdentityLinkAccountDidDto,
) {
  const identityLinkDto = new IdentityLinkAccountDidDto(params);

  if (env.APP_ENV != AppEnvironment.TEST) {
    await IdentityService.linkAccountDid({ body: identityLinkDto }, context);
  }
}

export async function identityRevoke(params: any) {
  const identityRevokeDto = new IdentityDidRevokeDto().populate({
    email: params.email,
    token: params.token,
  });

  if (env.APP_ENV != AppEnvironment.TEST) {
    await IdentityService.revokeIdentity(
      { body: identityRevokeDto },
      this.context,
    );
  }
}

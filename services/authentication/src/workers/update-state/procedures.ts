import {
  AttestationDto,
  env,
  AppEnvironment,
  IdentityCreateDto,
  IdentityLinkAccountDidDto,
  IdentityDidRevokeDto,
} from '@apillon/lib';
import { IdentityMicroservice } from '../../modules/identity/identity.service';
import { Identity } from '../../modules/identity/models/identity.model';

export async function attestClaim(
  context: any,
  identity: Identity,
  linkParameters: object,
) {
  const attestationClaimDto = new AttestationDto().populate({
    email: identity.email,
    didUri: identity.didUri,
    token: identity.token,
    linkParameters: linkParameters,
  });

  if (env.APP_ENV != AppEnvironment.TEST) {
    await IdentityMicroservice.attestClaim(
      { body: attestationClaimDto },
      context,
    );
  }
}

export async function identityGenerate(
  context: any,
  email: string,
  did_create_op: any,
) {
  const identityCreateDto = new IdentityCreateDto().populate({
    email: email,
    did_create_op: did_create_op,
  });

  if (env.APP_ENV != AppEnvironment.TEST) {
    await IdentityMicroservice.generateIdentity(
      { body: identityCreateDto },
      context,
    );
  }
}

export async function linkAccToDid(context: any, params: any) {
  const identityLinkDto = new IdentityLinkAccountDidDto().populate({
    email: params.email,
    token: params.token,
    link_params: params.linkParameters,
    didUri: params.didUri,
  });

  if (env.APP_ENV != AppEnvironment.TEST) {
    await IdentityMicroservice.linkAccountDid(
      { body: identityLinkDto },
      context,
    );
  }
}

export async function identityRevoke(params: any) {
  const identityRevokeDto = new IdentityDidRevokeDto().populate({
    email: params.email,
    token: params.token,
  });

  if (env.APP_ENV != AppEnvironment.TEST) {
    await IdentityMicroservice.revokeIdentity(
      { body: identityRevokeDto },
      this.context,
    );
  }
}

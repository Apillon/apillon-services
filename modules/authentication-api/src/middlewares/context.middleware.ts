import { HttpStatus, Inject, Injectable, NestMiddleware } from '@nestjs/common';
import type { Request } from 'express';
import { CodeException, env, MySql } from '@apillon/lib';
import { AuthenticationApiContext } from '../context';
import { generateKeypairsV2, randomChallenge } from '../lib/kilt';
import { Did } from '@kiltprotocol/sdk-js';
import { AuthenticationErrorCode } from '../config/types';

export interface IRequest extends Request {
  context: AuthenticationApiContext;
  query: { [key: string]: undefined | string };
}

/**
 * Returns a middleware which creates a context.
 */ @Injectable()
export class ContextMiddleware implements NestMiddleware {
  constructor(
    @Inject('MYSQL_DB')
    private mysql: MySql,
  ) {}

  use(req: IRequest, res, next) {
    let requestId = null;
    try {
      requestId = JSON.parse(
        decodeURI(req.headers['x-apigateway-context'] as string),
      )?.awsRequestId;
    } catch (err) {}

    req.context = new AuthenticationApiContext(requestId);
    req.context.setMySql(this.mysql);

    // Set up the request challenge
    req.context.requestChallenge = randomChallenge(24);
    // Apillon credentials
    let verifierDidUri;
    const a = async () => {
      const { authentication } = await generateKeypairsV2(
        env.KILT_ATTESTER_MNEMONIC,
      );
      verifierDidUri = Did.getFullDidUriFromKey(authentication);
      const { document } = await Did.resolve(verifierDidUri);
      if (!document) {
        throw new CodeException({
          status: HttpStatus.BAD_REQUEST,
          code: AuthenticationErrorCode.SPORRAN_VERIFIER_DID_DOES_NOT_EXIST,
          errorCodes: AuthenticationErrorCode,
        });
      }

      await a();

      const verifierEncryptionKey = document.keyAgreement?.[0];
      if (!verifierEncryptionKey) {
        throw new CodeException({
          status: HttpStatus.BAD_REQUEST,
          code: AuthenticationErrorCode.SPORRAN_VERIFIER_KA_DOES_NOT_EXIST,
          errorCodes: AuthenticationErrorCode,
        });
      }
    };

    req.context.verifierDidUri = verifierDidUri;

    next();
  }
}

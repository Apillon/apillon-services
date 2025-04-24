import { Strategy, Profile } from 'passport-google-oauth20';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { env } from '@apillon/lib';
import { UserService } from '../user.service';
import { Request } from 'express';
import { ParamsDictionary } from 'express-serve-static-core';
import { ParsedQs } from 'qs';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor() {
    super({
      clientID: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
      callbackURL: env.GOOGLE_CALLBACK_URL,
      scope: ['profile', 'email'],
      passReqToCallback: true,
    });
  }

  async validate(
    req: any,
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
  ) {
    return {
      id: profile.id,
      name: profile.name,
      email: profile.emails[0].value,
      state: req.query.state,
    };
  }

  authenticate(
    req: Request<ParamsDictionary, any, any, ParsedQs, Record<string, any>>,
    options?: any,
  ): void {
    options.state = JSON.stringify({
      metadata: req.query.metadata,
      country: req.headers['cloudfront-viewer-country'],
      refCode: req.query.refCode,
      hasPendingInvitation: req.query.hasPendingInvitation,
    });
    super.authenticate(req, options);
  }
}

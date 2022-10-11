import * as jwt from 'jsonwebtoken';
import { env } from 'at-lib';
import {
  AuthenticationTokenData,
  ResetUserPasswordTokenData,
  ResetUserEmailTokenData,
  ConfirmUserEmailTokenData,
  JwtTokenType,
  MFAAuthenticationTokenData,
  RequestUserRegisterTokenData,
  UserWelcomeTokenData,
} from '../config/types';

const DEFAULT_EXPIRATION_T = 3600;

export class JwtUtils {
  /**
   * Generates JWT token based on given token type and data.
   * @param type JWT token type to generate.
   * @param data Data to sign in JWT token.
   */

  // TODO: return just user_uuid and project_uuid
  public generateToken(
    type: JwtTokenType,
    data: any,
    expiration?: string,
  ): string {
    switch (type) {
      case JwtTokenType.USER_AUTHENTICATION:
        data = data as AuthenticationTokenData;

        if (!data.id) {
          return null;
        }

        return jwt.sign({ ...data }, env.APP_SECRET, {
          subject: JwtTokenType.USER_AUTHENTICATION,
          expiresIn: expiration || DEFAULT_EXPIRATION_T,
        });

      case JwtTokenType.USER_RESET_PASSWORD:
        data = data as ResetUserPasswordTokenData;

        if (!data.email) {
          return null;
        }
        return jwt.sign({ email: data.email }, env.APP_SECRET, {
          subject: JwtTokenType.USER_RESET_PASSWORD,
          expiresIn: expiration,
        });

      case JwtTokenType.USER_RESET_EMAIL:
        data = data as ResetUserEmailTokenData;

        if (!data.email || !data.userId) {
          return null;
        }
        return jwt.sign(
          {
            email: data.email,
            email2: data.email2,
            secondary: data.secondary,
            userId: data.userId,
          },
          env.APP_SECRET,
          {
            subject: JwtTokenType.USER_RESET_EMAIL,
            expiresIn: expiration,
          },
        );

      case JwtTokenType.USER_CONFIRM_EMAIL:
        data = data as ConfirmUserEmailTokenData;

        if (!data.email) {
          return null;
        }
        return jwt.sign({ email: data.email }, env.APP_SECRET, {
          subject: JwtTokenType.USER_CONFIRM_EMAIL,
          expiresIn: expiration,
        });

      case JwtTokenType.ADMIN_MFA_LOGIN:
        data = data as MFAAuthenticationTokenData;

        if (!data.userId) {
          return null;
        }
        return jwt.sign({ userId: data.userId }, env.APP_SECRET, {
          subject: JwtTokenType.ADMIN_MFA_LOGIN,
          expiresIn: expiration,
        });

      case JwtTokenType.USER_REGISTER:
        data = data as RequestUserRegisterTokenData;

        if (!data.email) {
          return null;
        }
        return jwt.sign({ email: data.email }, env.APP_SECRET, {
          subject: JwtTokenType.USER_REGISTER,
          expiresIn: expiration,
        });

      case JwtTokenType.USER_WELCOME:
        data = data as UserWelcomeTokenData;

        if (!data.user_id) {
          return null;
        }
        return jwt.sign({ user_id: data.user_id }, env.APP_SECRET, {
          subject: JwtTokenType.USER_WELCOME,
          expiresIn: expiration,
        });

      default:
        return null;
    }
  }

  /**
   * Parses given token based on its kind.
   * @param type JWT token type.
   * @param token JWT to token to parse.
   * @param context Application context.
   */
  public parseToken(type: JwtTokenType, token: string): any {
    if (!token) {
      return null;
    }
    try {
      switch (type) {
        case JwtTokenType.USER_AUTHENTICATION:
          return this.parseAuthenticationToken(token);
        case JwtTokenType.USER_RESET_PASSWORD:
          return this.parseResetUserPasswordToken(token);
        case JwtTokenType.USER_RESET_EMAIL:
          return this.parseResetUserEmailToken(token);
        case JwtTokenType.USER_CONFIRM_EMAIL:
          return this.parseConfirmUserEmailToken(token);
        case JwtTokenType.ADMIN_MFA_LOGIN:
          return this.parseMFAToken(token);
        case JwtTokenType.USER_REGISTER:
          return this.parseRequestUserRegisterToken(token);
        case JwtTokenType.USER_WELCOME:
          return this.parseUserWelcomeToken(token);
        default:
          return null;
      }
    } catch (error) {
      console.error(error);
      return null;
    }
  }

  /**
   * Parses user authentication token.
   * @param token JWT token.
   * @param context Application context.
   */
  public parseAuthenticationToken(token: string): AuthenticationTokenData {
    const userData = jwt.verify(token, env.APP_SECRET, {
      subject: JwtTokenType.USER_AUTHENTICATION,
    }) as any;

    if (userData) {
      return { ...userData };
    } else {
      return null;
    }
  }

  /**
   * Parses reset user's password token.
   * @param token JWT token.
   * @param context Application context.
   */
  public parseResetUserPasswordToken(
    token: string,
  ): ResetUserPasswordTokenData {
    const { email } = jwt.verify(token, env.APP_SECRET, {
      subject: JwtTokenType.USER_RESET_PASSWORD,
    }) as any;
    if (email) {
      return {
        email: email as string,
      };
    } else {
      return null;
    }
  }

  /**
   * Parses reset user's email token.
   * @param token JWT token.
   * @param context Application context.
   */
  public parseResetUserEmailToken(token: string): ResetUserEmailTokenData {
    const { email, email2, secondary, userId } = jwt.verify(
      token,
      env.APP_SECRET,
      {
        subject: JwtTokenType.USER_RESET_EMAIL,
      },
    ) as any;
    if (email && userId) {
      return {
        email: email as string,
        email2: email2 as string,
        secondary: secondary as boolean,
        userId: userId as number,
      };
    } else {
      return null;
    }
  }

  /**
   * Parses confirm user email token.
   * @param token JWT token.
   * @param context Application context.
   */
  public parseConfirmUserEmailToken(token: string): ConfirmUserEmailTokenData {
    const { email } = jwt.verify(token, env.APP_SECRET, {
      subject: JwtTokenType.USER_CONFIRM_EMAIL,
    }) as any;
    if (email) {
      return {
        email: email as string,
      };
    } else {
      return null;
    }
  }

  public parseMFAToken(token: string): MFAAuthenticationTokenData {
    const userId = jwt.verify(token, env.APP_SECRET, {
      subject: JwtTokenType.ADMIN_MFA_LOGIN,
    }) as any;

    if (userId) {
      return { ...userId };
    } else {
      return null;
    }
  }

  /**
   * Parses confirm user email token.
   * @param token JWT token.
   * @param context Application context.
   */
  public parseRequestUserRegisterToken(
    token: string,
  ): ConfirmUserEmailTokenData {
    const { email } = jwt.verify(token, env.APP_SECRET, {
      subject: JwtTokenType.USER_REGISTER,
    }) as any;
    if (email) {
      return {
        email: email as string,
      };
    } else {
      return null;
    }
  }

  /**
   * Parses confirm user email token.
   * @param token JWT token.
   * @param context Application context.
   */
  public parseUserWelcomeToken(token: string): UserWelcomeTokenData {
    const { user_id } = jwt.verify(token, env.APP_SECRET, {
      subject: JwtTokenType.USER_WELCOME,
    }) as any;
    if (user_id) {
      return {
        user_id: user_id,
      };
    } else {
      return null;
    }
  }
}

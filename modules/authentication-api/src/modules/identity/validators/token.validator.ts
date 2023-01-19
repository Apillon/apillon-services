import { CodeException, ModelBase, parseJwtToken } from '@apillon/lib';
import { HttpStatus } from '@nestjs/common';
import { AuthenticationErrorCode, JwtTokenType } from '../../../config/types';

export function tokenValidator(email: string) {
  return async function (this: ModelBase, token: any): Promise<boolean> {
    let tokenData: any;
    try {
      tokenData = parseJwtToken(
        JwtTokenType.IDENTITY_RESTORE_VERIFICATION,
        token,
      );
    } catch (error) {
      throw new CodeException({
        status: HttpStatus.BAD_REQUEST,
        code: AuthenticationErrorCode.IDENTITY_INVALID_VERIFICATION_TOKEN,
        errorCodes: AuthenticationErrorCode,
      });
    }

    if (tokenData.email != this) {
      //   throw new CodeException({
      //     status: HttpStatus.BAD_REQUEST,
      //     code: AuthenticationErrorCode.IDENTITY_VERIFICATION_FAILED,
      //     errorCodes: AuthenticationErrorCode,
      //   });
      return false;
    }
  };
}

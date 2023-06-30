import { v4 as uuidV4 } from 'uuid';
import {
  Ams,
  CodeException,
  CreateReferralDto,
  LogType,
  ReferralMicroservice,
  SerializeFor,
  UnauthorizedErrorCodes,
  ValidationException,
  ValidatorErrorCode,
  parseJwtToken,
  writeLog,
} from '@apillon/lib';
import { DevConsoleApiContext } from '../../../context';
import { User } from '../models/user.model';
import { HttpStatus } from '@nestjs/common';

export async function registerUser(params: any, context: DevConsoleApiContext) {
  const tokenData = parseJwtToken(params.tokenType, params.token);

  if (!tokenData?.email) {
    throw new CodeException({
      status: HttpStatus.UNAUTHORIZED,
      code: UnauthorizedErrorCodes.INVALID_TOKEN,
      errorCodes: UnauthorizedErrorCodes,
    });
  }

  const email = tokenData.email;

  // this handles security recommendation for single use token at registration!
  const emailCheckResult = await new Ams(context).emailExists(email);
  if (emailCheckResult.data.result === true) {
    throw new CodeException({
      status: HttpStatus.UNPROCESSABLE_ENTITY,
      code: ValidatorErrorCode.USER_EMAIL_ALREADY_TAKEN,
      errorCodes: ValidatorErrorCode,
    });
  }

  const user: User = new User({}, context).populate({
    user_uuid: uuidV4(),
    email: tokenData.email,
  });

  try {
    await user.validate();
  } catch (err) {
    await user.handle(err);
    if (!user.isValid()) {
      throw new ValidationException(user, ValidatorErrorCode);
    }
  }

  const conn = await context.mysql.start();
  let amsResponse;
  try {
    await user.insert(SerializeFor.INSERT_DB, conn);
    amsResponse = await new Ams(context).register({
      user_uuid: user.user_uuid,
      email,
      password: params.password,
    });

    user.setUserRolesAndPermissionsFromAmsResponse(amsResponse);

    await context.mysql.commit(conn);
  } catch (err) {
    // TODO: The context of this error is not correct. What happens if
    //       ams fails? FE will see it as a DB write error, which is incorrect.
    await context.mysql.rollback(conn);
    throw err;
  }
  try {
    // Create referral player - is inactive until accepts terms
    const referralBody = new CreateReferralDto(
      {
        refCode: params?.refCode,
      },
      context,
    );

    await new ReferralMicroservice({
      ...context,
      user,
    } as any).createPlayer(referralBody);
  } catch (err) {
    writeLog(
      LogType.MSG,
      `Error creating referral player${
        params?.refCode ? ', refCode: ' + params?.refCode : ''
      }`,
      'user.service.ts',
      'register',
      err,
    );
  }

  //User has been registered - check if pending invitations for project exists
  //This is done outside transaction as it is not crucial operation - admin is able to reinvite user to project
  try {
    if (tokenData.hasPendingInvitation) {
      await params.projectService.resolveProjectUserPendingInvitations(
        context,
        email,
        user.id,
        user.user_uuid,
      );
    }
  } catch (err) {
    writeLog(
      LogType.MSG,
      'Error resolving project user pending invitations',
      'user.service.ts',
      'register',
      err,
    );
  }

  return {
    ...user.serialize(SerializeFor.PROFILE),
    token: amsResponse.data.token,
  };
}

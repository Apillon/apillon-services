import { v4 as uuidV4 } from 'uuid';
import {
  Ams,
  CodeException,
  CreateReferralDto,
  Lmas,
  LogType,
  ReferralMicroservice,
  SerializeFor,
  UnauthorizedErrorCodes,
  ModelValidationException,
  generateRandomCode,
  isEVMWallet,
  parseJwtToken,
} from '@apillon/lib';
import { DevConsoleApiContext } from '../../../context';
import { User } from '../models/user.model';
import { HttpStatus } from '@nestjs/common';
import { ProjectService } from '../../project/project.service';
import { RegisterUserDto } from '../dtos/register-user.dto';
import { ValidatorErrorCode } from '../../../config/types';

export async function registerUser(
  params: RegisterUserDto & {
    projectService: ProjectService;
    tokenType: string;
  },
  context: DevConsoleApiContext,
) {
  const tokenData = parseJwtToken(params.tokenType, params.token);

  const user = await createUser(tokenData, context);
  const { email, wallet, refCode } = tokenData;

  if (wallet) {
    // If user has registered with wallet, generate a random password
    params.password = generateRandomCode(15);
  } else if (!params.password) {
    throw new CodeException({
      status: HttpStatus.UNPROCESSABLE_ENTITY,
      code: ValidatorErrorCode.USER_PASSWORD_NOT_PRESENT,
      errorCodes: ValidatorErrorCode,
    });
  } else if (params.password.length < 12) {
    throw new CodeException({
      status: HttpStatus.UNPROCESSABLE_ENTITY,
      code: ValidatorErrorCode.USER_PASSWORD_TOO_SHORT,
      errorCodes: ValidatorErrorCode,
    });
  }

  const conn = await context.mysql.start();
  let amsResponse;
  try {
    await user.insert(SerializeFor.INSERT_DB, conn);
    amsResponse = await new Ams(context).register({
      user_uuid: user.user_uuid,
      email,
      password: params.password,
      [isEVMWallet(wallet) ? 'evmWallet' : 'wallet']: wallet || null, // null by default, otherwise unique index fails
    });

    user.setUserRolesAndPermissionsFromAmsResponse(amsResponse);

    await context.mysql.commit(conn);
  } catch (err) {
    // TODO: The context of this error is not correct. What happens if
    //       ams fails? FE will see it as a DB write error, which is incorrect.
    await context.mysql.rollback(conn);
    throw err;
  }

  if (tokenData.hasPendingInvitation) {
    await resolvePendingProjectInvitations(
      params.projectService,
      user,
      context,
    );
  }

  await createReferralPlayer(refCode, user, context);

  return {
    ...user.serialize(SerializeFor.PROFILE),
    token: amsResponse.data.token,
  };
}

async function createUser(
  tokenData: any,
  context: DevConsoleApiContext,
): Promise<User> {
  const { email, metadata } = tokenData;

  if (!email) {
    throw new CodeException({
      status: HttpStatus.UNAUTHORIZED,
      code: UnauthorizedErrorCodes.INVALID_TOKEN,
      errorCodes: UnauthorizedErrorCodes,
    });
  }

  // this handles security recommendation for single use token at registration!
  const { data: emailCheckResult } = await new Ams(context).emailExists(email);
  if (emailCheckResult.result === true) {
    throw new CodeException({
      status: HttpStatus.UNPROCESSABLE_ENTITY,
      code: ValidatorErrorCode.USER_EMAIL_ALREADY_TAKEN,
      errorCodes: ValidatorErrorCode,
    });
  }

  const user: User = new User({}, context).populate({
    user_uuid: uuidV4(),
    email,
    metadata,
  });
  await user.validateOrThrow(ModelValidationException, ValidatorErrorCode);

  return user;
}

async function createReferralPlayer(
  refCode: string,
  user: User,
  context: DevConsoleApiContext,
) {
  try {
    const referralBody = new CreateReferralDto({ refCode }, context);

    await new ReferralMicroservice({
      ...context,
      user,
    } as any).createPlayer(referralBody);
  } catch (err) {
    await new Lmas().writeLog({
      context,
      logType: LogType.ERROR,
      message: `Error creating referral player for ref code ${refCode}`,
      location: 'DevConsoleApi/authentication-utils/user.service.ts',
      user_uuid: user.user_uuid,
      data: {
        user: user.serialize(),
        error: err,
      },
    });
  }
}

async function resolvePendingProjectInvitations(
  projectService: ProjectService,
  user: User,
  context: DevConsoleApiContext,
) {
  // User has been registered - check if pending invitations for project exists
  // This is done outside transaction as it is not crucial operation - admin is able to reinvite user to project
  try {
    await projectService.resolveProjectUserPendingInvitations(
      context,
      user.email,
      user.id,
      user.user_uuid,
    );
  } catch (err) {
    await new Lmas().writeLog({
      context,
      logType: LogType.ERROR,
      message: 'Error resolving project user pending invitations',
      location: 'DevConsoleApi/authentication-utils/user.service.ts',
      user_uuid: user.user_uuid,
      data: {
        user: user.serialize(),
        error: err,
      },
    });
  }
}

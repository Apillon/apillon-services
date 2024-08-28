import {
  CodeException,
  Context,
  DefaultUserRole,
  ForbiddenErrorCodes,
} from '@apillon/lib';
import {
  CanActivate,
  ExecutionContext,
  HttpStatus,
  Injectable,
} from '@nestjs/common';

@Injectable()
export class ProjectAccessGuard implements CanActivate {
  public async canActivate(execCtx: ExecutionContext): Promise<boolean> {
    const context: Context = execCtx.getArgByIndex(0).context;
    const project_uuid =
      execCtx.getArgByIndex(0).params?.project_uuid ||
      execCtx.getArgByIndex(0).params?.projectUuid ||
      execCtx.getArgByIndex(0).query?.project_uuid ||
      execCtx.getArgByIndex(0).query?.projectUuid ||
      execCtx.getArgByIndex(0).body?.project_uuid ||
      execCtx.getArgByIndex(0).body?.projectUuid;

    if (!project_uuid) {
      throw new CodeException({
        code: ForbiddenErrorCodes.FORBIDDEN,
        status: HttpStatus.FORBIDDEN,
        errorMessage: 'Project UUID not provided',
      });
    }
    if (
      !context.hasRoleOnProject(
        [
          DefaultUserRole.PROJECT_ADMIN,
          DefaultUserRole.PROJECT_OWNER,
          DefaultUserRole.PROJECT_USER,
        ],
        project_uuid,
      ) &&
      !context.hasRole([DefaultUserRole.ADMIN, DefaultUserRole.SUPPORT])
    ) {
      throw new CodeException({
        code: ForbiddenErrorCodes.FORBIDDEN,
        status: HttpStatus.FORBIDDEN,
        errorMessage: 'Insufficient permissions',
      });
    }
    return true;
  }
}

@Injectable()
export class ProjectAccessControllerGuard extends ProjectAccessGuard {
  public async canActivate(execCtx: ExecutionContext): Promise<boolean> {
    const context: Context = execCtx.getArgByIndex(0).context;
    const project_uuid =
      execCtx.getArgByIndex(0).params?.project_uuid ||
      execCtx.getArgByIndex(0).query?.project_uuid;

    if (!project_uuid) {
      return true;
    }
    return super.canActivate(execCtx);
  }
}

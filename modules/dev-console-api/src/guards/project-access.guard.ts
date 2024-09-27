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
import { Project } from '../modules/project/models/project.model';

@Injectable()
export class ProjectAccessGuard implements CanActivate {
  public async canActivate(execCtx: ExecutionContext): Promise<boolean> {
    const payload = execCtx.getArgByIndex(0);
    const context: Context = payload.context;
    const project_uuid = ['params', 'query', 'body']
      .map((key) => payload[key]?.project_uuid || payload[key]?.projectUuid)
      .find((uuid) => uuid);

    if (!project_uuid) {
      throw new CodeException({
        code: ForbiddenErrorCodes.FORBIDDEN,
        status: HttpStatus.FORBIDDEN,
        errorMessage: 'Project UUID not provided',
      });
    }

    const project = new Project({ project_uuid }, context);

    project.canAccess(context);

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

import { CodeException, Context, ForbiddenErrorCodes } from '@apillon/lib';
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  HttpStatus,
} from '@nestjs/common';
import { Project } from '../modules/project/models/project.model';

@Injectable()
export class ProjectModifyGuard implements CanActivate {
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

    project.canModify(context);

    return true;
  }
}

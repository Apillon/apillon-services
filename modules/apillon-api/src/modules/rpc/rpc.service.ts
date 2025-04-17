import { HttpStatus, Injectable } from '@nestjs/common';
import { ApillonApiContext } from '../../context';
import {
  ApillonApiCreateRpcApiKeyDto,
  AttachedServiceType,
  BaseProjectQueryFilter,
  CodeException,
  DefaultUserRole,
  ForbiddenErrorCodes,
  InfrastructureMicroservice,
  SqlModelStatus,
} from '@apillon/lib';
import { getConsoleApiMysql } from '../../lib/mysql-utils';
import { ResourceNotFoundErrorCode } from '../../config/types';

@Injectable()
export class RpcService {
  async createApiKey(
    context: ApillonApiContext,
    body: ApillonApiCreateRpcApiKeyDto,
  ) {
    body.project_uuid = context.apiKey.project_uuid;

    const mysql = getConsoleApiMysql();
    let projectOwnerUuid: string | undefined;
    let projectOwnerId: number | undefined;
    let projectOwnerEmail: string | undefined;
    try {
      await mysql.connect();
      const { 0: owner } =
        (await mysql.paramExecute(
          `SELECT u.user_uuid, pu.user_id,u.email, p.id as project_id FROM project_user pu
        LEFT JOIN project p on p.id = pu.project_id
        LEFT JOIN user u on u.id = pu.user_id
        WHERE p.project_uuid = @project_uuid AND pu.role_id = ${DefaultUserRole.PROJECT_OWNER}`,
          { project_uuid: body.project_uuid },
        )) || [];

      if (owner) {
        projectOwnerUuid = owner.user_uuid;
        projectOwnerId = owner.user_id;
        projectOwnerEmail = owner.email;
      }

      if (owner.project_id) {
        const service = await mysql.paramExecute(
          `SELECT id from service
          WHERE project_id= @project_id
          AND serviceType_id = ${AttachedServiceType.RPC}
          AND status != ${SqlModelStatus.DELETED}`,
          { project_id: owner.project_id },
        );

        if (!service?.length) {
          throw new CodeException({
            status: HttpStatus.FORBIDDEN,
            code: ForbiddenErrorCodes.FORBIDDEN,
            errorMessage: 'Project missing RPC service',
          });
        }
      }

      await mysql.close();
    } catch (err) {
      await mysql
        .close()
        .catch((err2) => console.error('Error closing connection', err2));

      console.error(err);
      throw err;
    }

    if (!projectOwnerUuid || !projectOwnerId || !projectOwnerEmail) {
      throw new CodeException({
        status: HttpStatus.FORBIDDEN,
        code: ResourceNotFoundErrorCode.PROJECT_OWNER_NOT_FOUND,
        errorCodes: ResourceNotFoundErrorCode,
      });
    }

    body.user_uuid = projectOwnerUuid;
    body.user_id = projectOwnerId;
    body.email = projectOwnerEmail;

    return (await new InfrastructureMicroservice(context).createRpcApiKey(body))
      .data;
  }

  async listApiKeys(context: ApillonApiContext, query: BaseProjectQueryFilter) {
    query.project_uuid = context.apiKey.project_uuid;
    return (await new InfrastructureMicroservice(context).listRpcApiKeys(query))
      .data;
  }

  async getApiKey(context: ApillonApiContext, id: number) {
    return (await new InfrastructureMicroservice(context).getRpcApiKey(id))
      .data;
  }

  async getEndpoints(context: ApillonApiContext) {
    return (await new InfrastructureMicroservice(context).listEndpoints()).data;
  }
}

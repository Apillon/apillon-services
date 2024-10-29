import { HttpStatus, Injectable } from '@nestjs/common';
import { ApillonApiContext } from '../../context';
import {
  ApillonApiCreateRpcApiKeyDto,
  BaseProjectQueryFilter,
  CodeException,
  DefaultUserRole,
  InfrastructureMicroservice,
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
      const owner = await mysql.paramExecute(
        `SELECT u.user_uuid, pu.user_id,u.email FROM project_user pu
        LEFT JOIN project p on p.id = pu.project_id
        LEFT JOIN user u on u.id = pu.user_id
        WHERE p.project_uuid = @project_uuid AND pu.role_id = ${DefaultUserRole.PROJECT_OWNER}`,
        { project_uuid: body.project_uuid },
      );

      if (owner?.length) {
        projectOwnerUuid = owner[0].user_uuid;
        projectOwnerId = owner[0].user_id;
        projectOwnerEmail = owner[0].email;
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

import { ServiceContext } from '@apillon/service-lib';
import { RpcEnvironment } from './rpc-environment.model';
import {
  BaseProjectQueryFilter,
  CreateRpcEnvironmentDto,
  ModelValidationException,
  SqlModelStatus,
  UpdateRpcEnvironmentDto,
  ValidatorErrorCode,
  hasProjectAccess,
} from '@apillon/lib';
import { InfrastructureCodeException } from '../../lib/exceptions';
import { InfrastructureErrorCode } from '../../config/types';
export class RpcEnvironmentService {
  static async createRpcEnvironment(
    { data }: { data: CreateRpcEnvironmentDto },
    context: ServiceContext,
  ) {
    const rpcEnvironment = new RpcEnvironment(data, context);
    rpcEnvironment.apiKey = 'xyz'; // Will be fetched from dwellir in the future
    return await rpcEnvironment.insert();
  }
  static async updateRpcEnvironment(
    {
      data: { id, data },
    }: {
      data: {
        id: number;
        data: UpdateRpcEnvironmentDto;
      };
    },
    context: ServiceContext,
  ) {
    const rpcEnvironment = await new RpcEnvironment({}, context).populateById(
      id,
    );
    if (!rpcEnvironment.exists()) {
      throw new InfrastructureCodeException({
        code: InfrastructureErrorCode.RPC_ENVIRONMENT_NOT_FOUND,
        status: 404,
      });
    }
    if (!hasProjectAccess(rpcEnvironment.projectUuid, context)) {
      throw new InfrastructureCodeException({
        code: InfrastructureErrorCode.USER_IS_NOT_AUTHORIZED,
        status: 403,
      });
    }
    rpcEnvironment.populate(data);
    await rpcEnvironment.validateOrThrow(
      ModelValidationException,
      ValidatorErrorCode,
    );
    await rpcEnvironment.update();
    return rpcEnvironment.serialize();
  }
  static async revokeRpcEnvironment(
    { id }: { id: number },
    context: ServiceContext,
  ) {
    const rpcEnvironment = await new RpcEnvironment({}, context).populateById(
      id,
    );
    if (!rpcEnvironment.exists()) {
      throw new InfrastructureCodeException({
        code: InfrastructureErrorCode.RPC_ENVIRONMENT_NOT_FOUND,
        status: 404,
      });
    }
    if (!hasProjectAccess(rpcEnvironment.projectUuid, context)) {
      throw new InfrastructureCodeException({
        code: InfrastructureErrorCode.USER_IS_NOT_AUTHORIZED,
        status: 403,
      });
    }
    // TO-DO Revoke API Key on dwellir
    rpcEnvironment.status = SqlModelStatus.DELETED;
    await rpcEnvironment.update();
    return rpcEnvironment.serialize();
  }
  static async listRpcEnvironments(
    event: {
      filter: BaseProjectQueryFilter;
    },
    context: ServiceContext,
  ) {
    const filter = new BaseProjectQueryFilter(event.filter, context);
    return await new RpcEnvironment({}, context).listForProject(filter);
  }
}

import { env } from '../../../config/env';
import { AppEnvironment, ComputingEventType } from '../../../config/types';
import { Context } from '../../context';
import { BaseService } from '../base-service';
import { CreateContractDto } from './dtos/create-contract.dto';
import { ContractQueryFilter } from './dtos/contract-query-filter.dto';
import { DepositToClusterDto } from './dtos/deposit-to-cluster.dto';

export class ComputingMicroservice extends BaseService {
  lambdaFunctionName =
    env.APP_ENV === AppEnvironment.TEST
      ? env.COMPUTING_FUNCTION_NAME_TEST
      : env.COMPUTING_FUNCTION_NAME;
  devPort =
    env.APP_ENV === AppEnvironment.TEST
      ? env.COMPUTING_SOCKET_PORT_TEST
      : env.COMPUTING_SOCKET_PORT;
  serviceName = 'COMPUTING';

  constructor(context: Context) {
    super(context);
    this.isDefaultAsync = false;
  }

  public async createContract(params: CreateContractDto) {
    const data = {
      eventName: ComputingEventType.CREATE_CONTRACT,
      body: params.serialize(),
    };
    return await this.callService(data);
  }

  public async listComputingContracts(params: ContractQueryFilter) {
    const data = {
      eventName: ComputingEventType.LIST_CONTRACTS,
      query: params.serialize(),
    };
    return await this.callService(data);
  }

  public async getComputingContract(uuid: string) {
    const data = {
      eventName: ComputingEventType.GET_CONTRACT_BY_UUID,
      uuid,
    };
    return await this.callService(data);
  }

  public async depositToContractCluster(body: DepositToClusterDto) {
    const data = {
      eventName: ComputingEventType.DEPOSIT_TO_CONTRACT_CLUSTER,
      body: body.serialize(),
    };
    return await this.callService(data);
  }
}

import { env } from '../../../config/env';
import { AppEnvironment, ComputingEventType } from '../../../config/types';
import { Context } from '../../context';
import { BaseService } from '../base-service';
import { CreateContractDto } from './dtos/create-contract.dto';
import { ContractQueryFilter } from './dtos/contract-query-filter.dto';
import { EncryptContentDto } from './dtos/encrypt-content.dto';
import { AssignCidToNft } from './dtos/assign-cid-to-nft.dto';
import { ClusterWalletQueryFilter } from './dtos/cluster-wallet-query-filter.dto';
import { ComputingTransactionQueryFilter } from './dtos/computing-transaction-query-filter.dto';
import { CreateJobDto } from './dtos/create-job.dto';
import { SetJobEnvironmentDto } from './dtos/set-job-environment.dto';
import { JobQueryFilter } from './dtos/job-query-filter.dto';
import { UpdateJobDto } from './dtos/update-job.dto';

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

  public async listContracts(params: ContractQueryFilter) {
    const data = {
      eventName: ComputingEventType.LIST_CONTRACTS,
      query: params.serialize(),
    };
    return await this.callService(data);
  }

  public async getContract(uuid: string) {
    const data = {
      eventName: ComputingEventType.GET_CONTRACT_BY_UUID,
      uuid,
    };
    return await this.callService(data);
  }

  public async archiveContract(uuid: string) {
    const data = {
      eventName: ComputingEventType.ARCHIVE_CONTRACT,
      uuid,
    };
    return await this.callService(data);
  }

  public async activateContract(uuid: string) {
    const data = {
      eventName: ComputingEventType.ACTIVATE_CONTRACT,
      uuid,
    };
    return await this.callService(data);
  }

  public async listTransactions(params: ComputingTransactionQueryFilter) {
    const data = {
      eventName: ComputingEventType.LIST_TRANSACTIONS,
      query: params.serialize(),
    };
    return await this.callService(data);
  }

  // TODO: DepositToClusterDto was removed here and replaced with any so that we don't import blockchain-lib into lib
  public async depositToPhalaCluster(body: any) {
    const data = {
      eventName: ComputingEventType.DEPOSIT_TO_PHALA_CLUSTER,
      body: body.serialize(),
    };
    return await this.callService(data);
  }

  // TODO: TransferOwnershipDto was removed here and replaced with any so that we don't import blockchain-lib into lib
  public async transferContractOwnership(body: any) {
    const data = {
      eventName: ComputingEventType.TRANSFER_CONTRACT_OWNERSHIP,
      body: body.serialize(),
    };
    return await this.callService(data);
  }

  public async encryptContent(body: EncryptContentDto) {
    const data = {
      eventName: ComputingEventType.ENCRYPT_CONTENT,
      body: body.serialize(),
    };
    return await this.callService(data);
  }

  public async assignCidToNft(body: AssignCidToNft) {
    const data = {
      eventName: ComputingEventType.ASSIGN_CID_TO_NFT,
      body: body.serialize(),
    };
    return await this.callService(data);
  }

  public async listClusterWallets(body: ClusterWalletQueryFilter) {
    const data = {
      eventName: ComputingEventType.LIST_CLUSTER_WALLETS,
      query: body.serialize(),
    };
    return await this.callService(data);
  }

  public async getProjectComputingDetails(
    project_uuid: string,
  ): Promise<{ data: { contractCount: number; transactionCount: number } }> {
    return await this.callService({
      eventName: ComputingEventType.PROJECT_COMPUTING_DETAILS,
      project_uuid,
    });
  }

  public async createJob(body: CreateJobDto) {
    const data = {
      eventName: ComputingEventType.CREATE_JOB,
      body: body.serialize(),
    };
    return await this.callService(data);
  }

  public async listJobs(query: JobQueryFilter) {
    const data = {
      eventName: ComputingEventType.LIST_JOBS,
      query: query.serialize(),
    };
    return await this.callService(data);
  }

  public async getJob(job_uuid: string) {
    const data = {
      eventName: ComputingEventType.GET_JOB,
      job_uuid,
    };
    return await this.callService(data);
  }

  public async setJobEnvironment(body: SetJobEnvironmentDto) {
    const data = {
      eventName: ComputingEventType.SET_JOB_ENVIRONMENT,
      body: body.serialize(),
    };
    return await this.callService(data);
  }

  public async sendJobMessage(payload: string, job_uuid: string) {
    const data = {
      eventName: ComputingEventType.SEND_JOB_MESSAGE,
      payload,
      job_uuid,
    };
    return await this.callService(data);
  }

  public async updateJob(body: UpdateJobDto) {
    const data = {
      eventName: ComputingEventType.UPDATE_JOB,
      body,
    };
    return await this.callService(data);
  }

  public async deleteJob(job_uuid: string) {
    const data = {
      eventName: ComputingEventType.DELETE_JOB,
      job_uuid,
    };
    return await this.callService(data);
  }
}

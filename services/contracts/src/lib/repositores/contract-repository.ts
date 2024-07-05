import { ServiceContext } from '@apillon/service-lib';
import { ContractDeploy } from '../../modules/contracts/models/contractDeploy.model';
import {
  ChainType,
  ContractsQueryFilter,
  DeployedContractsQueryFilter,
  EvmChain,
  PoolConnection,
  SerializeFor,
  SqlModelStatus,
} from '@apillon/lib';
import {
  ContractsModelValidationException,
  ContractsNotFoundException,
} from '../exceptions';
import { ContractStatus, DbTables } from '../../config/types';
import { v4 as uuidV4 } from 'uuid';

import { Contract } from '../../modules/contracts/models/contract.model';

export class ContractRepository {
  private readonly context: ServiceContext;

  constructor(context: ServiceContext) {
    this.context = context;
  }

  async newContractDeploy(
    project_uuid: string,
    name: string,
    description: string,
    chain: EvmChain,
    contract_version_id: number,
    constructorArguments: unknown[],
  ) {
    const contractDeploy = new ContractDeploy(
      {
        contract_uuid: uuidV4(),
        project_uuid,
        name,
        description,
        chainType: ChainType.EVM,
        chain,
        version_id: contract_version_id,
        contractStatus: ContractStatus.DEPLOYING,
        status: SqlModelStatus.INCOMPLETE,
        constructorArguments,
      },
      this.context,
    );
    await contractDeploy.validateOrThrow(ContractsModelValidationException);

    return contractDeploy;
  }

  async getList(filter: ContractsQueryFilter) {
    return await new Contract({}, this.context).getList(filter);
  }

  async getDeployedList(filter: DeployedContractsQueryFilter) {
    return await new ContractDeploy(
      { project_uuid: filter.project_uuid },
      this.context,
    ).getDeployedList(filter);
  }

  async getDeployedContractByUUID(contract_uuid: string) {
    const contractDeploy = await new ContractDeploy(
      {},
      this.context,
    ).populateByUUID(contract_uuid);

    if (!contractDeploy.exists()) {
      throw new ContractsNotFoundException();
    }

    return contractDeploy;
  }

  /**
   * Function to get count of active contracts on the project
   * @param project_uuid
   * @returns Number of contracts
   */
  public async getContractDeployedCount(
    project_uuid?: string,
  ): Promise<number> {
    const data = await this.context.mysql.paramExecute(
      `
        SELECT COUNT(*) as contractsCount
        FROM \`${DbTables.CONTRACT}\`
        WHERE project_uuid = @project_uuid
          AND contractStatus <> ${ContractStatus.FAILED}
          AND status <> ${SqlModelStatus.DELETED};
      `,
      {
        project_uuid,
      },
    );

    return data[0].contractsCount;
  }

  async getLatestContractVersion(contract_uuid: string) {
    return await new Contract({}, this.context).getLatestContractVersion(
      contract_uuid,
    );
  }

  async saveContractDeploy(
    contractDeploy: ContractDeploy,
    conn?: PoolConnection,
  ) {
    await contractDeploy.validateOrThrow(ContractsModelValidationException);
    await contractDeploy.insert(SerializeFor.INSERT_DB, conn);

    return contractDeploy;
  }

  async updateContractDeployStatus(
    contract_deploy_id: number,
    contractStatus: ContractStatus,
    conn?: PoolConnection,
  ) {
    await this.context.mysql.paramExecute(
      `
        UPDATE \`${DbTables.CONTRACT_DEPLOY}\`
        SET contractStatus=@contractStatus
        WHERE id = @contract_deploy_id;
      `,
      {
        contract_deploy_id,
        contractStatus,
      },
      conn,
    );
  }
}

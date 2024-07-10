import { ServiceContext } from '@apillon/service-lib';
import { ContractDeploy } from '../../modules/contracts/models/contractDeploy.model';
import {
  CacheKeyPrefix,
  CacheKeyTTL,
  ChainType,
  ContractsQueryFilter,
  DeployedContractsQueryFilter,
  EvmChain,
  PoolConnection,
  runCachedFunction,
  SerializeFor,
  SqlModelStatus,
} from '@apillon/lib';
import {
  ContractsCodeException,
  ContractsModelValidationException,
  ContractsNotFoundException,
} from '../exceptions';
import {
  ContractsErrorCode,
  ContractStatus,
  DbTables,
} from '../../config/types';
import { v4 as uuidV4 } from 'uuid';
import { Contract } from '../../modules/contracts/models/contract.model';
import { ContractVersionMethod } from '../../modules/contracts/models/contractVersionMethod.model';
import { ContractVersion } from '../../modules/contracts/models/contractVersion.model';
import { BaseRepository } from './base-repository';

export class ContractRepository extends BaseRepository {
  constructor(context: ServiceContext) {
    super(context);
  }

  //#region ------------- CONTRACTS -------------

  async getList(filter: ContractsQueryFilter) {
    return await new Contract({}, this.context).getList(filter);
  }

  async getContractWithLatestVersion(contract_uuid: string) {
    const data = await runCachedFunction(
      `${CacheKeyPrefix.CONTRACT_UUID}:${[contract_uuid].join(':')}`,
      async () =>
        await new Contract({}, this.context).getContractWithLatestVersion(
          contract_uuid,
        ),
      CacheKeyTTL.EXTRA_LONG,
    );

    const { c: contract, cv: contractVersion } = this.extractModelDataFromRow(
      data[0],
      {
        c: Contract,
        cv: ContractVersion,
      },
    );
    if (!contract.exists()) {
      throw new Error(`Contract not found`);
    }
    if (!contractVersion.exists()) {
      throw new Error(`Contract version not found`);
    }

    contract.contractVersion = contractVersion;

    return contract;
  }

  async getContractWithVersionAndMethods(contract_uuid: string) {
    const cacheKey = `${CacheKeyPrefix.CONTRACT_VERSION_METHODS_BY_VERSION_CONTRACT_UUID}:${contract_uuid}`;
    const data = await runCachedFunction(
      cacheKey as any,
      async () =>
        new Contract({}, this.context).getContractWithLatestVersionAndMethods(
          contract_uuid,
        ),
      CacheKeyTTL.EXTRA_LONG,
    );

    const { c: contract, cv: contractVersion } = this.extractModelDataFromRow(
      data[0],
      {
        c: Contract,
        cv: ContractVersion,
      },
    );
    if (!contract.exists()) {
      throw new ContractsCodeException({
        status: 500,
        code: ContractsErrorCode.CONTRACT_OWNER_ERROR,
        context: this.context,
        sourceFunction: 'ContractRepository.getContractDeployByUUID',
      });
    }
    if (!contractVersion.exists()) {
      throw new Error(`Contract version not found`);
    }

    // assemble contract->contractVersion->methods
    contractVersion.methods = this.extractArrayOfModelFromRows(
      data,
      'cvm',
      ContractVersionMethod,
    );
    contract.contractVersion = contractVersion;

    return contract;
  }

  //#endregion
  //#region ------------- CONTRACT VERSION -------------

  async getContractVersionById(id: number) {
    const contractVersion = await new ContractVersion({}, this.context).getById(
      id,
    );
    if (!contractVersion.exists()) {
      throw new ContractsCodeException({
        status: 500,
        code: ContractsErrorCode.CONTRACT_VERSION_MISSING,
        context: this.context,
        sourceFunction: 'ContractRepository.getContractVersionById',
      });
    }
    return contractVersion;
  }

  async getContractVersionByContractUuid(contract_uuid: string) {
    const contractVersion = await new ContractVersion(
      {},
      this.context,
    ).populateByContractUuid(contract_uuid);

    if (!contractVersion.exists()) {
      throw new ContractsNotFoundException();
    }

    return contractVersion;
  }

  //#endregion
  //#region ------------- CONTRACT DEPLOY -------------

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

  async getDeployedList(filter: DeployedContractsQueryFilter) {
    return await new ContractDeploy(
      { project_uuid: filter.project_uuid },
      this.context,
    ).getDeployedList(filter);
  }

  async getContractDeployByUUID(contract_deploy_uuid: string) {
    const contractDeploy = await new ContractDeploy(
      {},
      this.context,
    ).populateByUUID(contract_deploy_uuid);

    if (!contractDeploy.exists()) {
      throw new ContractsCodeException({
        status: 500,
        code: ContractsErrorCode.CONTRACT_OWNER_ERROR,
        context: this.context,
        sourceFunction: 'ContractRepository.getContractDeployByUUID',
      });
    }
    if (!contractDeploy.contractAddress) {
      throw new ContractsCodeException({
        status: 500,
        code: ContractsErrorCode.CONTRACT_ADDRESS_MISSING,
        context: this.context,
        sourceFunction: 'ContractRepository.getContractDeployByUUID',
      });
    }
    contractDeploy.canAccess(this.context);

    return contractDeploy;
  }

  async getContractDeployWithVersionAndMethods(contract_uuid: string) {
    const cacheKey = `${CacheKeyPrefix.GET_CONTRACT_BY_UUID_DEPLOY_WITH_VERSION_AND_METHODS}:${contract_uuid}`;
    const data = await runCachedFunction(
      cacheKey as any,
      async () =>
        await new ContractDeploy(
          {},
          this.context,
        ).getContractDeployWithVersionAndMethods(contract_uuid),
      CacheKeyTTL.EXTRA_LONG,
    );

    const { c: contractDeploy, cv: contractVersion } =
      this.extractModelDataFromRow(data[0], {
        c: ContractDeploy,
        cv: ContractVersion,
      });
    if (!contractDeploy.exists()) {
      throw new ContractsCodeException({
        status: 500,
        code: ContractsErrorCode.CONTRACT_OWNER_ERROR,
        context: this.context,
        sourceFunction: 'ContractRepository.getContractDeployByUUID',
      });
    }
    if (!contractDeploy.contractAddress) {
      throw new ContractsCodeException({
        status: 500,
        code: ContractsErrorCode.CONTRACT_ADDRESS_MISSING,
        context: this.context,
        sourceFunction: 'ContractRepository.getContractDeployByUUID',
      });
    }
    contractDeploy.canAccess(this.context);

    if (!contractVersion.exists()) {
      throw new Error(`Contract version not found`);
    }

    // assemble nested contractDeploy->contractVersion->methods
    contractVersion.methods = this.extractArrayOfModelFromRows(
      data,
      'cvm',
      ContractVersionMethod,
    );
    contractDeploy.contractVersion = contractVersion;

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

  //#endregion
  //#region ------------- HELPERS -------------

  //#endregion
}

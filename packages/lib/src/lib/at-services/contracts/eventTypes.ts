import { ContractEventType } from '../../../config/types';
import { ContractsQueryFilter } from './dtos/contract-query-filter.dto';
import { ContractAbiQueryDTO } from './dtos/contract-abi-query.dto';
import { CreateContractDTO } from './dtos/create-contract.dto';
import { CallContractDTO } from './dtos/call-contract.dto';
import { DeployedContractsQueryFilter } from './dtos/deployed-contract-query-filter.dto';
import { ContractTransactionQueryFilter } from './dtos/transaction-query-filter.dto';

export type ContractMSEventType =
  // contracts
  | IQueryEvent<ContractEventType.CONTRACTS_LIST, ContractsQueryFilter>
  | IContractUuidEvent<ContractEventType.GET_CONTRACT>
  | IQueryEvent<ContractEventType.GET_CONTRACT_ABI, ContractAbiQueryDTO>
  | IBodyEvent<ContractEventType.DEPLOY_CONTRACT, CreateContractDTO>
  // contracts deployed
  | IBodyEvent<ContractEventType.CALL_DEPLOYED_CONTRACT, CallContractDTO>
  | IContractUuidEvent<ContractEventType.GET_DEPLOYED_CONTRACT>
  | IQueryEvent<
      ContractEventType.GET_DEPLOYED_CONTRACT_ABI,
      ContractAbiQueryDTO
    >
  | IQueryEvent<
      ContractEventType.DEPLOYED_CONTRACTS_LIST,
      DeployedContractsQueryFilter
    >
  | IQueryEvent<
      ContractEventType.LIST_DEPLOYED_CONTRACT_TRANSACTIONS,
      ContractTransactionQueryFilter
    >
  | IProjectUuidEvent<ContractEventType.PROJECT_DEPLOYED_CONTRACT_DETAILS>
  | IContractUuidEvent<ContractEventType.ARCHIVE_DEPLOYED_CONTRACT>
  | IContractUuidEvent<ContractEventType.ACTIVATE_DEPLOYED_CONTRACT>;

interface IContractMSEventBase {
  eventName: ContractEventType;
}

interface IBodyEvent<T extends ContractEventType, U>
  extends IContractMSEventBase {
  eventName: T;
  body: U;
}

interface IQueryEvent<T extends ContractEventType, U>
  extends IBodyEvent<
    T,
    {
      query: U;
    }
  > {
  eventName: T;
}

interface IContractUuidEvent<T extends ContractEventType>
  extends IBodyEvent<
    T,
    {
      contract_uuid: string;
    }
  > {}

interface IProjectUuidEvent<T extends ContractEventType>
  extends IBodyEvent<T, { project_uuid: string }> {
  eventName: T;
}

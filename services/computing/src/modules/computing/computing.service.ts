import {
  ContractQueryFilter,
  CreateContractDto,
  Lmas,
  LogType,
  SerializeFor,
  ServiceName,
  SqlModelStatus,
} from '@apillon/lib';
import { getSerializationStrategy, ServiceContext } from '@apillon/service-lib';
import { v4 as uuidV4 } from 'uuid';
import { ComputingErrorCode } from '../../config/types';
import {
  ComputingCodeException,
  ComputingValidationException,
} from '../../lib/exceptions';
import { deployPhalaContract } from '../../lib/utils/contract-utils';
import { Contract } from './models/contract.model';
import { SchrodingerContractABI } from '../../lib/contracts/deployed-phala-contracts';

export class ComputingService {
  static async createContract(
    params: { body: CreateContractDto },
    context: ServiceContext,
  ) {
    console.log(`Creating computing contract: ${JSON.stringify(params.body)}`);

    const contract = new Contract(params.body, context).populate({
      contract_uuid: uuidV4(),
      status: SqlModelStatus.INCOMPLETE,
      sourceHash: SchrodingerContractABI.source.hash,
      data: { restrictToOwner: params.body.restrictToOwner },
    });

    try {
      await contract.validate();
    } catch (err) {
      await contract.handle(err);
      if (!contract.isValid()) {
        throw new ComputingValidationException(contract);
      }
    }

    const conn = await context.mysql.start();
    try {
      await contract.insert(SerializeFor.INSERT_DB, conn);
      await deployPhalaContract(context, contract, conn);
      await context.mysql.commit(conn);
    } catch (err) {
      await context.mysql.rollback(conn);

      throw await new ComputingCodeException({
        status: 500,
        code: ComputingErrorCode.DEPLOY_CONTRACT_ERROR,
        context: context,
        sourceFunction: 'createContract()',
        errorMessage: 'Error creating contract',
        details: err,
      }).writeToMonitor({});
    }

    await new Lmas().writeLog({
      context,
      project_uuid: contract.project_uuid,
      logType: LogType.INFO,
      message: 'New Computing contract created and submitted for deployment',
      location: 'ComputingService/createContract',
      service: ServiceName.COMPUTING,
      data: { contract_uuid: contract.contract_uuid },
    });

    contract.updateTime = new Date();
    contract.createTime = new Date();

    return contract.serialize(getSerializationStrategy(context));
  }

  static async listContracts(
    event: { query: ContractQueryFilter },
    context: ServiceContext,
  ) {
    return await new Contract(
      { project_uuid: event.query.project_uuid },
      context,
    ).getList(
      context,
      new ContractQueryFilter(event.query),
      getSerializationStrategy(context),
    );
  }

  static async getContractByUuid(
    event: { uuid: any },
    context: ServiceContext,
  ) {
    const contract = await new Contract({}, context).populateByUUID(event.uuid);

    if (!contract.exists()) {
      throw new ComputingCodeException({
        status: 500,
        code: ComputingErrorCode.CONTRACT_DOES_NOT_EXIST,
        context,
      });
    }
    contract.canAccess(context);

    return contract.serialize(getSerializationStrategy(context));
  }
}

import { ComputingEventType } from '@apillon/lib';
import type { Context } from 'aws-lambda/handler';
import { ComputingService } from './modules/computing/computing.service';
import { AcurastService } from './modules/acurast/acurast.service';

/**
 * Processing lambda event with appropriate service function based on event name
 * @param event lambda event
 * @param context lambda context
 * @returns service response
 */
export async function processEvent(event: any, context: Context): Promise<any> {
  const processors = {
    [ComputingEventType.CREATE_CONTRACT]: ComputingService.createContract,
    [ComputingEventType.LIST_CONTRACTS]: ComputingService.listContracts,
    [ComputingEventType.GET_CONTRACT_BY_UUID]:
      ComputingService.getContractByUuid,
    [ComputingEventType.LIST_TRANSACTIONS]: ComputingService.listTransactions,
    [ComputingEventType.DEPOSIT_TO_PHALA_CLUSTER]:
      ComputingService.depositToPhalaCluster,
    [ComputingEventType.TRANSFER_CONTRACT_OWNERSHIP]:
      ComputingService.transferContractOwnership,
    [ComputingEventType.ENCRYPT_CONTENT]: ComputingService.encryptContent,
    [ComputingEventType.ASSIGN_CID_TO_NFT]: ComputingService.assignCidToNft,
    [ComputingEventType.LIST_CLUSTER_WALLETS]:
      ComputingService.listClusterWallets,
    [ComputingEventType.PROJECT_COMPUTING_DETAILS]:
      ComputingService.getProjectComputingDetails,
    [ComputingEventType.ARCHIVE_CONTRACT]: ComputingService.archiveContract,
    [ComputingEventType.ACTIVATE_CONTRACT]: ComputingService.activateContract,

    [ComputingEventType.CREATE_CLOUD_FUNCTION]:
      AcurastService.createCloudFunction,
    [ComputingEventType.GET_CLOUD_FUNCTION]:
      AcurastService.getCloudFunctionByUuid,
    [ComputingEventType.LIST_CLOUD_FUNCTIONS]:
      AcurastService.listCloudFunctions,
    [ComputingEventType.UPDATE_CLOUD_FUNCTION]:
      AcurastService.updateCloudFunction,
    [ComputingEventType.EXECUTE_CLOUD_FUNCTION]:
      AcurastService.executeCloudFunction,
    [ComputingEventType.SET_CLOUD_FUNCTION_ENVIRONMENT]:
      AcurastService.setCloudFunctionEnvironment,

    [ComputingEventType.CREATE_JOB]: AcurastService.createJob,
    [ComputingEventType.GET_JOB]: AcurastService.getJobByUuid,

    [ComputingEventType.UPDATE_JOB]: AcurastService.updateJob,
    [ComputingEventType.DELETE_JOB]: AcurastService.deleteJob,
  };

  return await processors[event.eventName](event, context);
}

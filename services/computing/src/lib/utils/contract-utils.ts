import {
  BlockchainMicroservice,
  CreateSubstrateTransactionDto,
  PoolConnection,
  SerializeFor,
  SubstrateChain,
} from '@apillon/lib';
import {
  ComputingTransactionStatus,
  ContractStatus,
  DbTables,
  TransactionType,
} from '../../config/types';
import { ServiceContext } from '@apillon/service-lib';
import { Contract } from '../../modules/computing/models/contract.model';
import { Transaction } from '../../modules/transaction/models/transaction.model';
import { TransactionService } from '../../modules/transaction/transaction.service';
import { PhalaClient } from '../../modules/services/phala.client';
import { ContractAbi } from '../../modules/computing/models/contractAbi.model';

export async function deployPhalaContract(
  context: ServiceContext,
  contract: Contract,
  contractAbi: ContractAbi,
  conn: PoolConnection,
) {
  const phalaClient = new PhalaClient(context);
  contract.data['clusterId'] = await phalaClient.getClusterId();
  const transaction = await phalaClient.createDeployTransaction(
    contract,
    contractAbi,
  );

  const blockchainServiceRequest = new CreateSubstrateTransactionDto(
    {
      chain: SubstrateChain.PHALA,
      transaction: transaction.toHex(),
      referenceTable: DbTables.CONTRACT,
      referenceId: contract.id,
      project_uuid: contract.project_uuid,
    },
    context,
  );
  const response = await new BlockchainMicroservice(
    context,
  ).createSubstrateTransaction(blockchainServiceRequest);

  const dbTxRecord = new Transaction({}, context);
  dbTxRecord.populate({
    walletAddress: response.data.address,
    transactionType: TransactionType.DEPLOY_CONTRACT,
    contract_id: contract.id,
    transactionHash: response.data.transactionHash,
    transactionStatus: ComputingTransactionStatus.PENDING,
  });

  //Insert to DB
  await TransactionService.saveTransaction(dbTxRecord, conn);
  contract.contractStatus = ContractStatus.DEPLOY_INITIATED;
  contract.deployerAddress = response.data.address;
  await contract.update(SerializeFor.UPDATE_DB, conn);
}

export async function depositToPhalaCluster(
  context: ServiceContext,
  clusterId: string,
  accountAddress: string,
  amount: number,
) {
  const phalaClient = new PhalaClient(context);
  const transaction = await phalaClient.createDepositToClusterTransaction(
    clusterId,
    accountAddress,
    amount,
  );
  const blockchainServiceRequest = new CreateSubstrateTransactionDto(
    {
      chain: SubstrateChain.PHALA,
      transaction: transaction.toHex(),
    },
    context,
  );
  const response = await new BlockchainMicroservice(
    context,
  ).createSubstrateTransaction(blockchainServiceRequest);
  const dbTxRecord = new Transaction(
    {
      walletAddress: response.data.address,
      transactionType: TransactionType.DEPOSIT_TO_CONTRACT_CLUSTER,
      transactionHash: response.data.transactionHash,
      transactionStatus: ComputingTransactionStatus.PENDING,
    },
    context,
  );
  await TransactionService.saveTransaction(dbTxRecord);
}

export async function transferContractOwnership(
  context: ServiceContext,
  projectUuid: string,
  contract_id: number,
  contractAbi: { [key: string]: any },
  contractAddress: string,
  newOwnerAddress: string,
) {
  const nonce = PhalaClient.getRandomNonce();
  const transaction = await new PhalaClient(
    context,
  ).createTransferOwnershipTransaction(
    contractAbi,
    contractAddress,
    nonce,
    newOwnerAddress,
  );
  const blockchainServiceRequest = new CreateSubstrateTransactionDto(
    {
      chain: SubstrateChain.PHALA,
      transaction: transaction.toHex(),
      referenceTable: DbTables.CONTRACT,
      referenceId: contract_id,
      project_uuid: projectUuid,
    },
    context,
  );
  const response = await new BlockchainMicroservice(
    context,
  ).createSubstrateTransaction(blockchainServiceRequest);
  const dbTxRecord = new Transaction(
    {
      walletAddress: response.data.address,
      transactionType: TransactionType.TRANSFER_CONTRACT_OWNERSHIP,
      contract_id: contract_id,
      transactionHash: response.data.transactionHash,
      nonce,
      transactionStatus: ComputingTransactionStatus.PENDING,
    },
    context,
  );
  await TransactionService.saveTransaction(dbTxRecord);
}

export async function encryptContent(
  context: ServiceContext,
  contractAbi: { [key: string]: any },
  contractAddress: string,
  content: string,
) {
  return await new PhalaClient(context).encryptContent(
    contractAbi,
    contractAddress,
    content,
  );
}

export async function assignCidToNft(
  context: ServiceContext,
  projectUuid: string,
  contract_id: number,
  contractAbi: { [key: string]: any },
  contractAddress: string,
  cid: string,
  nftId: number,
) {
  const nonce = PhalaClient.getRandomNonce();
  const transaction = await new PhalaClient(
    context,
  ).createAssignCidToNftTransaction(
    contractAbi,
    contractAddress,
    nonce,
    cid,
    nftId,
  );
  const blockchainServiceRequest = new CreateSubstrateTransactionDto(
    {
      chain: SubstrateChain.PHALA,
      transaction: transaction.toHex(),
      referenceTable: DbTables.CONTRACT,
      referenceId: contract_id,
      project_uuid: projectUuid,
    },
    context,
  );
  const response = await new BlockchainMicroservice(
    context,
  ).createSubstrateTransaction(blockchainServiceRequest);
  const dbTxRecord = new Transaction(
    {
      walletAddress: response.data.address,
      transactionType: TransactionType.ASSIGN_CID_TO_NFT,
      contract_id: contract_id,
      transactionHash: response.data.transactionHash,
      transactionStatus: ComputingTransactionStatus.PENDING,
    },
    context,
  );
  await TransactionService.saveTransaction(dbTxRecord);
}

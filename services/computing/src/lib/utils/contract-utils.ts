import {
  BlockchainMicroservice,
  ChainType,
  Context,
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

export async function getPhalaEndpoint(context: Context) {
  const rpcEndpoint = (
    await new BlockchainMicroservice(context).getChainEndpoint(
      SubstrateChain.PHALA,
      ChainType.SUBSTRATE,
    )
  ).data.url;
  console.log('rpcEndpoint', rpcEndpoint);
  return rpcEndpoint;
}

export async function deployPhalaContract(
  context: ServiceContext,
  transaction_uuid: string,
  contract: Contract,
  contractAbi: ContractAbi,
  conn: PoolConnection,
) {
  const rpcUrl = await getPhalaEndpoint(context);
  const phalaClient = new PhalaClient(rpcUrl);
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

  const clusterId = await phalaClient.getClusterId();
  const pruntimeUrl = await phalaClient.getPruntimeUrl();

  const dbTxRecord = new Transaction({}, context);
  dbTxRecord.populate({
    transaction_uuid,
    walletAddress: response.data.address,
    transactionType: TransactionType.DEPLOY_CONTRACT,
    contract_id: contract.id,
    transactionHash: response.data.transactionHash,
    transactionStatus: ComputingTransactionStatus.PENDING,
    metadata: { pruntimeUrl },
  });

  //Insert to DB
  await TransactionService.saveTransaction(dbTxRecord, conn);
  contract.data['clusterId'] = clusterId;
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
  const rpcUrl = await getPhalaEndpoint(context);
  const phalaClient = new PhalaClient(rpcUrl);
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
  transaction_uuid: string,
  projectUuid: string,
  contract_id: number,
  contractAbi: { [key: string]: any },
  contractAddress: string,
  newOwnerAddress: string,
) {
  const nonce = PhalaClient.getRandomNonce();
  const rpcUrl = await getPhalaEndpoint(context);
  const phalaClient = new PhalaClient(rpcUrl);
  const transaction = await phalaClient.createTransferOwnershipTransaction(
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
  const pruntimeUrl = await phalaClient.getPruntimeUrl();
  const dbTxRecord = new Transaction(
    {
      transaction_uuid,
      walletAddress: response.data.address,
      transactionType: TransactionType.TRANSFER_CONTRACT_OWNERSHIP,
      contract_id,
      transactionHash: response.data.transactionHash,
      nonce,
      transactionStatus: ComputingTransactionStatus.PENDING,
      metadata: { pruntimeUrl },
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
  const rpcUrl = await getPhalaEndpoint(context);
  return await new PhalaClient(rpcUrl).encryptContent(
    contractAbi,
    contractAddress,
    content,
  );
}

export async function assignCidToNft(
  context: ServiceContext,
  transaction_uuid: string,
  projectUuid: string,
  contract_id: number,
  contractAbi: { [key: string]: any },
  contractAddress: string,
  cid: string,
  nftId: number,
) {
  const nonce = PhalaClient.getRandomNonce();
  const rpcUrl = await getPhalaEndpoint(context);
  const phalaClient = new PhalaClient(rpcUrl);
  const transaction = await phalaClient.createAssignCidToNftTransaction(
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
  const pruntimeUrl = await phalaClient.getPruntimeUrl();
  const dbTxRecord = new Transaction(
    {
      transaction_uuid,
      walletAddress: response.data.address,
      transactionType: TransactionType.ASSIGN_CID_TO_NFT,
      contract_id,
      transactionHash: response.data.transactionHash,
      nonce,
      transactionStatus: ComputingTransactionStatus.PENDING,
      metadata: { pruntimeUrl },
    },
    context,
  );
  await TransactionService.saveTransaction(dbTxRecord);
}

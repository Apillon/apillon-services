import {
  BlockchainMicroservice,
  ChainType,
  Context,
  env,
  formatTokenWithDecimals,
  formatWalletAddress,
  getTokenPriceUsd,
  LogType,
  PhalaClusterWalletDto,
  PhalaLogFilterDto,
  ServiceName,
  SubstrateChain,
} from '@apillon/lib';
import {
  BaseQueueWorker,
  LogOutput,
  QueueWorkerType,
  WorkerDefinition,
} from '@apillon/workers-lib';
import { Transaction } from '../modules/transaction/models/transaction.model';
import {
  ComputingTransactionStatus,
  ContractStatus,
  DbTables,
  TransactionType,
  TxAction,
  TxDirection,
} from '../config/types';
import { SerMessage, SerMessageLog, SerMessageMessageOutput } from '@phala/sdk';
import { ClusterTransactionLog } from '../modules/accounting/cluster-transaction-log.model';
import { Keyring } from '@polkadot/api';
import { ClusterWallet } from '../modules/computing/models/cluster-wallet.model';

/**
 * Phala has its own worker because beside normal transactions (transmitted by our wallet) we also need to fetch
 * "Instantiated" events from TX that we didn't emit (these transactions are emitted by Phala workers on successful
 * instantiation)
 */
export class PhalaLogWorker extends BaseQueueWorker {
  private keyring = new Keyring({ type: 'sr25519' });

  public constructor(
    workerDefinition: WorkerDefinition,
    context: Context,
    type: QueueWorkerType,
  ) {
    super(workerDefinition, context, type, env.COMPUTING_AWS_WORKER_SQS_URL);
  }

  async runPlanner(_data?: any) {
    const clusterWalletIds = await new ClusterWallet(
      {},
      this.context,
    ).getClusterWalletIds();

    return clusterWalletIds.map((w: { id: string }) => ({
      clusterWalletId: w.id,
    }));
  }

  public async runExecutor(data: { clusterWalletId: number }): Promise<any> {
    console.log('runExecutor data', data);
    const clusterWallet = await new ClusterWallet(
      {},
      this.context,
    ).populateById(data.clusterWalletId);
    const tokenPrice = await getTokenPriceUsd(clusterWallet.token);
    const transactions = await new Transaction(
      {},
      this.context,
    ).getNonExecutedTransactions(clusterWallet.clusterId);

    if (transactions.length <= 0) {
      await this.writeEventLog(
        {
          logType: LogType.INFO,
          message: `No transactions found for cluster ${clusterWallet.clusterId}.`,
          service: ServiceName.BLOCKCHAIN,
          data: {
            clusterId: clusterWallet.clusterId,
          },
        },
        LogOutput.EVENT_INFO,
      );
      return;
    }

    for (const transaction of transactions) {
      const isDeployContract =
        transaction.transactionType === TransactionType.DEPLOY_CONTRACT;
      await this.writeEventLog(
        {
          logType: LogType.INFO,
          message: `Getting logs for ${
            isDeployContract ? 'deploy ' : ''
          }transaction with hash ${transaction.transactionHash}).`,
          service: ServiceName.BLOCKCHAIN,
          data: {
            transactionHash: transaction.transactionHash,
          },
        },
        LogOutput.EVENT_INFO,
      );

      try {
        if (isDeployContract) {
          await this.processContractTransaction(
            transaction.project_uuid,
            transaction.contract_id,
            transaction.contractAddress,
            transaction.contractData.clusterId,
            transaction.transaction_id,
            transaction.transactionHash,
          );
        } else {
          await this.processOtherTransaction(
            transaction.project_uuid,
            clusterWallet.walletAddress,
            transaction.transaction_id,
            transaction.transactionHash,
            transaction.transactionNonce,
            transaction.contractData.clusterId,
            tokenPrice,
          );
        }
      } catch (error) {
        await this.writeEventLog(
          {
            logType: LogType.ERROR,
            message: `Error parsing log for transaction ${transaction.transactionHash} and contract ${transaction.contractAddress}.`,
            service: ServiceName.BLOCKCHAIN,
            err: error,
          },
          LogOutput.SYS_ERROR,
        );
      }
    }
    await this.checkClusterBalance(clusterWallet);
  }

  protected async processContractTransaction(
    project_uuid: string,
    contract_id: number,
    contractAddress: string,
    clusterId: string,
    transaction_id: number,
    transactionHash: string,
  ) {
    // TODO: since we cant filter logs by account cluster we are processing deploy transaction multiple times
    const blockchainServiceRequest = new PhalaLogFilterDto(
      {
        type: 'Log',
        contract: contractAddress,
        clusterId: clusterId,
      },
      this.context,
    );
    const response = (await new BlockchainMicroservice(
      this.context,
    ).getPhalaLogRecordsAndGasPrice(blockchainServiceRequest)) as {
      records: SerMessageLog[];
      gasPrice: number;
    };
    console.log(
      'Received response for getPhalaLogRecordsAndGasPrice:',
      response,
    );
    const record = (await this.getRecordFromLogs(
      transactionHash,
      response.records,
    )) as SerMessageLog;
    if (!record) {
      return;
    }

    // update contract and transaction status
    const isInstantiated = record.message === 'instantiated';

    await this.updateContract(
      contract_id,
      isInstantiated ? ContractStatus.DEPLOYED : ContractStatus.FAILED,
    );
    const transactionStatus = isInstantiated
      ? ComputingTransactionStatus.WORKER_SUCCESS
      : ComputingTransactionStatus.WORKER_FAILED;
    await this.updateTransaction(transaction_id, transactionStatus);
    await new ClusterTransactionLog(
      {
        // TODO: should we store clusterWallet id or at least clusterId (but we have no wallet)
        project_uuid,
        status: transactionStatus,
        action: TxAction.TRANSACTION,
        blockId: record.blockNumber,
        direction: TxDirection.COST,
        hash: transactionHash,
        transaction_id,
      },
      this.context,
    ).insert();
  }

  protected async processOtherTransaction(
    project_uuid: string,
    walletAddress: string,
    transaction_id: number,
    transactionHash: string,
    transactionNonce: string,
    clusterId: string,
    tokenPrice: number,
  ) {
    const blockchainServiceRequest = new PhalaLogFilterDto({
      clusterId: clusterId,
      type: 'MessageOutput',
      nonce: transactionNonce,
    });
    const response = (await new BlockchainMicroservice(
      this.context,
    ).getPhalaLogRecordsAndGasPrice(blockchainServiceRequest)) as {
      records: SerMessageMessageOutput[];
      gasPrice: number;
    };
    console.log(
      'Received response for getPhalaLogRecordsAndGasPrice:',
      response,
    );
    const record = (await this.getRecordFromLogs(
      transactionHash,
      response.records,
    )) as SerMessageMessageOutput;
    if (!record) {
      return;
    }
    const recordWalletAddress = this.keyring.encodeAddress(record.origin, 30);
    // only process transactions for wallet in question
    if (recordWalletAddress !== walletAddress) {
      return;
    }

    // update transaction status in computing
    let transactionStatus = ComputingTransactionStatus.WORKER_FAILED;
    if (
      'ok' in record.output.result &&
      record.output.result.ok.flags.length === 0
    ) {
      transactionStatus = ComputingTransactionStatus.WORKER_SUCCESS;
    }
    await this.updateTransaction(transaction_id, transactionStatus);

    const gasFee = record.output.gasConsumed.refTime * response.gasPrice;
    const storageFee = record.output.storageDeposit.charge;
    const totalFee = gasFee + storageFee;

    await new ClusterTransactionLog(
      {
        project_uuid,
        status: transactionStatus,
        action: TxAction.TRANSACTION,
        blockId: record.blockNumber,
        direction: TxDirection.COST,
        // TODO: should we store clusterWallet id or at least clusterId instead of wallet?
        wallet: recordWalletAddress,
        clusterId,
        hash: transactionHash,
        transaction_id,
        fee: totalFee,
        amount: `${totalFee}`,
        totalPrice: `${totalFee}`,
        value: totalFee * tokenPrice,
        addressFrom: recordWalletAddress,
      },
      this.context,
    ).insert();
  }

  protected async getRecordFromLogs(
    transactionHash: string,
    records: SerMessage[],
  ): Promise<SerMessage | null> {
    if (records.length === 1) {
      return records[0];
    } else if (records.length > 1) {
      await this.writeEventLog(
        {
          logType: LogType.WARN,
          message: `More than one record found when checking logs for transaction ${transactionHash}).`,
          service: ServiceName.BLOCKCHAIN,
          data: {
            transactionHash,
          },
        },
        LogOutput.EVENT_WARN,
      );
      return records[0];
    } else {
      await this.writeEventLog(
        {
          logType: LogType.INFO,
          message: `No records found when checking logs for transaction ${transactionHash}).`,
          service: ServiceName.BLOCKCHAIN,
          data: {
            transactionHash,
          },
        },
        LogOutput.EVENT_INFO,
      );
      return null;
    }
  }

  private async updateTransaction(
    transaction_id: number,
    transactionStatus: ComputingTransactionStatus,
  ) {
    await this.context.mysql.paramExecute(
      `UPDATE \`${DbTables.TRANSACTION}\`
       SET transactionStatus = @transactionStatus
       WHERE id = @transaction_id`,
      {
        transaction_id,
        transactionStatus,
      },
    );
  }

  private async updateContract(
    contract_id: number,
    contractStatus: ContractStatus,
  ) {
    await this.context.mysql.paramExecute(
      `UPDATE \`${DbTables.CONTRACT}\`
       SET contractStatus = @contractStatus
       WHERE id = @contract_id`,
      {
        contract_id,
        contractStatus,
      },
    );
  }

  private async checkClusterBalance(clusterWallet: ClusterWallet) {
    const walletAddress = clusterWallet.walletAddress;
    const clusterId = clusterWallet.clusterId;
    const blockchainServiceRequest = new PhalaClusterWalletDto(
      {
        clusterId,
        walletAddress,
      },
      this.context,
    );
    const { total, free } = await new BlockchainMicroservice(
      this.context,
    ).getPhalaClusterWalletBalance(blockchainServiceRequest);

    clusterWallet.totalBalance = total;
    clusterWallet.currentBalance = free;
    await clusterWallet.update();

    const formattedWalletAddress = formatWalletAddress(
      ChainType.SUBSTRATE,
      SubstrateChain.PHALA,
      clusterWallet.walletAddress,
    );
    const balanceDecimal = formatTokenWithDecimals(
      clusterWallet.currentBalance,
      ChainType.SUBSTRATE,
      SubstrateChain.PHALA,
    );
    if (!clusterWallet.minBalance) {
      const message = `MIN BALANCE IS NOT SET! for wallet address ${formattedWalletAddress} of cluster ${clusterId}  ==> balance: ${balanceDecimal}`;
      await this.writeEventLog(
        {
          logType: LogType.WARN,
          message,
          service: ServiceName.COMPUTING,
          data: {
            balance: clusterWallet.currentBalance,
            walletAddress,
            clusterId,
          },
        },
        LogOutput.NOTIFY_WARN,
      );
    }

    if (clusterWallet.isBelowThreshold) {
      const minBalanceDecimal = formatTokenWithDecimals(
        clusterWallet.minBalance,
        ChainType.SUBSTRATE,
        SubstrateChain.PHALA,
      );
      const message = `LOW WALLET BALANCE! ${formattedWalletAddress} ==> balance: ${balanceDecimal} / ${minBalanceDecimal}`;
      await this.writeEventLog(
        {
          logType: LogType.WARN,
          message,
          service: ServiceName.COMPUTING,
          data: {
            balance: clusterWallet.currentBalance,
            walletAddress,
            clusterId,
          },
        },
        LogOutput.NOTIFY_WARN,
      );
    }
  }
}

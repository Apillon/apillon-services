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
import {
  ClusterTransactionLog
} from '../modules/accounting/cluster-transaction-log.model';
import { Keyring } from '@polkadot/api';
import {
  ClusterWallet
} from '../modules/computing/models/cluster-wallet.model';
import { Contract } from '../modules/computing/models/contract.model';

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
    ).getContractTransactionsNotLogged(clusterWallet.clusterId);

    if (transactions.length <= 0) {
      await this.writeEventLog(
        {
          logType: LogType.INFO,
          message: `No transactions found for cluster ${clusterWallet.clusterId}.`,
          service: ServiceName.COMPUTING,
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
          await this.processContractDeployTransaction(
            transaction.project_uuid,
            clusterWallet.walletAddress,
            transaction.contract_id,
            transaction.contractAddress,
            transaction.contractData.clusterId,
            transaction.transaction_id,
            transaction.transactionHash,
          );
        } else if (
          transaction.transactionNonce &&
          transaction.contractData.clusterId
        ) {
          await this.processContractTransaction(
            transaction.project_uuid,
            transaction.contract_id,
            clusterWallet.walletAddress,
            transaction.transaction_id,
            transaction.transactionType,
            transaction.transactionHash,
            transaction.transactionNonce,
            transaction.contractData.clusterId,
            tokenPrice,
          );
        } else {
          await this.writeEventLog(
            {
              logType: LogType.WARN,
              message: `Transaction of type ${transaction.transactionType} with id ${transaction.transaction_id} was not handled.`,
              service: ServiceName.COMPUTING,
              data: {
                transaction_id: transaction.transaction_id,
                transactionType: transaction.transactionType,
              },
            },
            LogOutput.EVENT_WARN,
          );
        }
      } catch (error) {
        await this.writeEventLog(
          {
            logType: LogType.ERROR,
            message: `Error parsing log for transaction ${transaction.transactionHash} and contract ${transaction.contractAddress}.`,
            service: ServiceName.COMPUTING,
            err: error,
          },
          LogOutput.SYS_ERROR,
        );
      }
    }
    await this.checkClusterBalance(clusterWallet);
  }

  protected async processContractDeployTransaction(
    project_uuid: string,
    walletAddress: string,
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
    const { data } = (await new BlockchainMicroservice(
      this.context,
    ).getPhalaLogRecordsAndGasPrice(blockchainServiceRequest)) as {
      data: {
        records: SerMessageLog[];
        gasPrice: number;
      };
    };
    console.log(
      'Received response for Log from getPhalaLogRecordsAndGasPrice:',
      data,
    );
    const record = (await this.getRecordFromLogs(
      transactionHash,
      data.records,
    )) as SerMessageLog;
    if (!record) {
      return;
    }
    await this.checkLogRecordForErrors(
      record.message,
      transaction_id,
      clusterId,
      walletAddress,
    );

    // update contract and transaction status
    const isInstantiated = record.message === 'instantiated';

    await this.updateContract(
      contract_id,
      isInstantiated ? ContractStatus.DEPLOYED : ContractStatus.FAILED,
    );
    const transactionStatus = isInstantiated
      ? ComputingTransactionStatus.WORKER_SUCCESS
      : ComputingTransactionStatus.WORKER_FAILED;
    await this.updateTransaction(
      transaction_id,
      transactionStatus,
      record.message,
    );
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

  protected async processContractTransaction(
    project_uuid: string,
    contract_id: number,
    walletAddress: string,
    transaction_id: number,
    transactionType: TransactionType,
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
    const { data } = (await new BlockchainMicroservice(
      this.context,
    ).getPhalaLogRecordsAndGasPrice(blockchainServiceRequest)) as {
      data: {
        records: SerMessageMessageOutput[];
        gasPrice: number;
      };
    };
    console.log(
      'Received response for MessageOutput for getPhalaLogRecordsAndGasPrice:',
      data,
    );
    const record = (await this.getRecordFromLogs(
      transactionHash,
      data.records,
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
    let workerSuccess = false;
    let message = null;
    if ('ok' in record.output.result) {
      const flags = record.output.result.ok.flags;
      workerSuccess = record.output.result.ok.flags.length === 0;
      message = workerSuccess ? null : flags.join(',');
    }
    const transactionStatus = workerSuccess
      ? ComputingTransactionStatus.WORKER_SUCCESS
      : ComputingTransactionStatus.WORKER_FAILED;
    console.log(
      `Updating transaction status to ${transactionStatus} based on log records:`,
      record,
    );
    await this.updateTransaction(transaction_id, transactionStatus, message);

    // update contract
    if (transactionType === TransactionType.TRANSFER_CONTRACT_OWNERSHIP) {
      const contract = await new Contract({}, this.context).populateById(
        contract_id,
      );
      if (!contract.exists()) {
        await this.writeEventLog({
          logType: LogType.ERROR,
          message: `Computing contract with id ${contract_id} not found.`,
          service: ServiceName.COMPUTING,
          data: {
            transaction_id: transaction_id,
            contract_id: contract_id,
          },
        });
        return;
      }
      if (contract.contractStatus === ContractStatus.TRANSFERRING) {
        contract.contractStatus = workerSuccess
          ? ContractStatus.TRANSFERRED
          : ContractStatus.DEPLOYED;
        await contract.update();
      }
    }

    const gasFee = record.output.gasConsumed.refTime * data.gasPrice;
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
          service: ServiceName.COMPUTING,
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
          service: ServiceName.COMPUTING,
          data: {
            transactionHash,
          },
        },
        LogOutput.EVENT_INFO,
      );
      return null;
    }
  }

  private async checkLogRecordForErrors(
    message: string | null | undefined,
    transaction_id: number,
    clusterId: string,
    walletAddress: string,
  ) {
    if (message && message.includes('InsufficientBalance')) {
      await this.writeEventLog(
        {
          logType: LogType.ALERT,
          message: `Wallet address ${walletAddress} has insufficient balance on cluster ${clusterId} to process transaction with id ${transaction_id}.`,
          service: ServiceName.COMPUTING,
          data: {
            message,
            walletAddress,
            clusterId,
          },
        },
        LogOutput.NOTIFY_ALERT,
      );
    }
  }

  private async updateTransaction(
    transaction_id: number,
    transactionStatus: ComputingTransactionStatus,
    message: string,
  ) {
    await this.context.mysql.paramExecute(
      `UPDATE \`${DbTables.TRANSACTION}\`
       SET transactionStatus       = @transactionStatus,
           transactionStatusMessage=@message
       WHERE id = @transaction_id`,
      {
        transaction_id,
        transactionStatus,
        message,
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
    const { data } = await new BlockchainMicroservice(
      this.context,
    ).getPhalaClusterWalletBalance(blockchainServiceRequest);

    clusterWallet.totalBalance = data.total;
    clusterWallet.currentBalance = data.free;
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

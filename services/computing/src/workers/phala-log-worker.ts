import {
  BlockchainMicroservice,
  ChainType,
  formatTokenWithDecimals,
  formatWalletAddress,
  getTokenPriceUsd,
  LogType,
  PhalaClusterWalletDto,
  PhalaLogFilterDto,
  ServiceName,
  SubstrateChain,
  TransactionStatus,
} from '@apillon/lib';
import { BaseSingleThreadWorker, LogOutput } from '@apillon/workers-lib';
import { Transaction } from '../modules/transaction/models/transaction.model';
import {
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
export class PhalaLogWorker extends BaseSingleThreadWorker {
  private batchLimit: number;
  private keyring = new Keyring({ type: 'sr25519' });

  async runPlanner(_data?: any) {
    const clusterWallets = await new ClusterWallet(
      {},
      this.context,
    ).getWalletClusters();

    return clusterWallets.map((w: ClusterWallet) => ({
      clusterWalletId: w.id,
      batchLimit: this.batchLimit,
    }));
  }

  public async runExecutor(data: {
    clusterWalletId: number;
    batchLimit: number;
  }): Promise<any> {
    const clusterWallet = await new ClusterWallet(
      {},
      this.context,
    ).populateById(data.clusterWalletId);
    const tokenPrice = await getTokenPriceUsd(clusterWallet.token);
    const rows = await new Transaction(
      {},
      this.context,
    ).getNonExecutedTransactionsAndContracts(clusterWallet.clusterId);

    if (rows.length <= 0) {
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

    for (const row of rows) {
      const isDeployContract =
        row.transactionType === TransactionType.DEPLOY_CONTRACT;
      await this.writeEventLog(
        {
          logType: LogType.INFO,
          message: `Getting logs for ${
            isDeployContract ? 'deploy ' : ''
          }transaction with hash ${row.transactionHash}).`,
          service: ServiceName.BLOCKCHAIN,
          data: {
            transactionHash: row.transactionHash,
          },
        },
        LogOutput.EVENT_INFO,
      );

      try {
        if (isDeployContract) {
          await this.processContractTransaction(
            row.project_uuid,
            row.contract_id,
            row.contractAddress,
            row.contractData.clusterId,
            row.transaction_id,
            row.transactionHash,
          );
        } else {
          await this.processOtherTransaction(
            row.project_uuid,
            clusterWallet.walletAddress,
            row.transaction_id,
            row.transactionHash,
            row.transactionNonce,
            row.contractData.clusterId,
            tokenPrice,
          );
        }

        await this.checkClusterBalance(clusterWallet);
      } catch (error) {
        await this.writeEventLog(
          {
            logType: LogType.ERROR,
            message: `Error parsing log for transaction ${row.transactionHash} and contract ${row.contractAddress}.`,
            service: ServiceName.BLOCKCHAIN,
            err: error,
          },
          LogOutput.SYS_ERROR,
        );
      }
    }
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
    const { records } = (await new BlockchainMicroservice(
      this.context,
    ).getPhalaLogs(blockchainServiceRequest)) as {
      records: SerMessageLog[];
      gasPrice: number;
    };
    const record = (await this.getRecordFromLogs(
      transactionHash,
      records,
    )) as SerMessageLog;
    if (!record) {
      return;
    }

    // update contract and transaction status
    // transaction.transactionStatus = TransactionStatus.CONFIRMED;
    const isInstantiated = record.message === 'instantiated';

    await this.updateContract(
      contract_id,
      isInstantiated ? ContractStatus.DEPLOYED : ContractStatus.FAILED,
    );
    await this.updateTransaction(transaction_id, isInstantiated);
    await new ClusterTransactionLog(
      {
        // TODO: should we store clusterWallet id or at least clusterId (but we have no wallet)
        project_uuid,
        status: TransactionStatus.CONFIRMED,
        action: TxAction.TRANSACTION,
        transactionExecutedSuccessfully: isInstantiated,
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
    const { records, gasPrice } = (await new BlockchainMicroservice(
      this.context,
    ).getPhalaLogs(blockchainServiceRequest)) as {
      records: SerMessageMessageOutput[];
      gasPrice: number;
    };
    const record = (await this.getRecordFromLogs(
      transactionHash,
      records,
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
    let transactionExecutedSuccessfully: boolean;
    if ('ok' in record.output.result) {
      transactionExecutedSuccessfully =
        record.output.result.ok.flags.length === 0;
    } else {
      transactionExecutedSuccessfully = false;
    }
    await this.updateTransaction(
      transaction_id,
      transactionExecutedSuccessfully,
    );

    const gasFee = record.output.gasConsumed.refTime * gasPrice;
    // TODO: remove ts-ignore when SDK is fixed
    // @ts-ignore
    const storageFee = record.output.storageDeposit.charge;
    const totalFee = gasFee + storageFee;

    await new ClusterTransactionLog(
      {
        project_uuid,
        status: TransactionStatus.CONFIRMED,
        action: TxAction.TRANSACTION,
        transactionExecutedSuccessfully,
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
    if (records.length > 0) {
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
    transactionExecutedSuccessfully: boolean,
  ) {
    await this.context.mysql.paramExecute(
      `UPDATE \`${DbTables.TRANSACTION}\`
       SET transactionExecutedSuccessfully = @transactionExecutedSuccessfully
       WHERE id = @transaction_id`,
      {
        transaction_id,
        transactionExecutedSuccessfully,
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
    ).getClusterWalletBalance(blockchainServiceRequest);

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

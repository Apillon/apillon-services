import {
  ChainType,
  EvmChain,
  SubstrateChain,
  TransactionStatus,
  env,
} from '@apillon/lib';
import { EvmBlockchainIndexer } from './evm-indexer.service';
import { EvmTransfers } from './data-models/evm-transfer';
import { Transaction } from '../../../common/models/transaction';
import { Stage, setupTest } from '../../../../test/setup';
import {
  ServiceDefinition,
  ServiceDefinitionType,
  WorkerDefinition,
} from '@apillon/workers-lib';
import { SubstrateTransactionWorker } from '../../../workers/substrate-transaction-worker';
import { WorkerName } from '../../../workers/worker-executor';
import { EvmTransactionWorker } from '../../../workers/evm-transaction-worker';

describe('MOONBASE', () => {
  const address = '';
  let stage: Stage;

  beforeAll(async () => {
    stage = await setupTest();
    env.BLOCKCHAIN_MOONBASE_GRAPHQL_SERVER = 'http://3.251.2.33:8083/graphql';
  });

  test('Single transaction update test', async () => {
    const transaction = await new Transaction(
      {
        chain: 1287,
        chainType: ChainType.EVM,
        address: '0xba01526c6d80378a9a95f1687e9960857593983b',
        to: null,
        nonce: 602,
        referenceTable: 'test',
        referenceId: 'test',
        rawTransaction: 'asdasdasd',
        data: {},
        transactionHash:
          '0x84ad9150974e47f4746b53c7169317ab3ec10a8d96c2a55624f75966d7431465',
        transactionStatus: TransactionStatus.PENDING,
      },
      stage.context,
    ).insert();

    const serviceDef: ServiceDefinition = {
      type: ServiceDefinitionType.SQS,
      config: { region: 'test' },
      params: { FunctionName: 'test' },
    };

    const workerDefinition = new WorkerDefinition(
      serviceDef,
      WorkerName.EVM_TRANSACTIONS,
      {
        parameters: { FunctionName: 'test' },
      },
    );

    await new EvmTransactionWorker(workerDefinition, stage.context).runExecutor(
      { chain: EvmChain.MOONBASE },
    );

    const txs: Transaction[] = await new Transaction({}, stage.context).getList(
      chain,
      chainType,
      address,
      0,
    );

    // console.log(txs);
    // console.log(`Obtained ${txs.transactions.length} evm withdrawals `);
    // expect(txs.transactions.length == 1).toBe(true);
  });

  test('Test query ', async () => {
    const evmIndexer = new EvmBlockchainIndexer(EvmChain.MOONBASE);
    // Withdrawals from block to block
    const txs: EvmTransfers = await evmIndexer.getWalletOutgoingTxs(
      '0xba01526c6d80378a9a95f1687e9960857593983b',
      5023033,
      5023034,
    );
  });
});

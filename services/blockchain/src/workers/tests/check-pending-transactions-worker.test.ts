import {
  ChainType,
  dateToSqlString,
  env,
  EvmChain,
  SubstrateChain,
  TransactionStatus,
} from '@apillon/lib';
import { releaseStage, setupTest, Stage } from '../../../test/setup';
import { Transaction } from '../../common/models/transaction';
import { ServiceDefinitionType, WorkerDefinition } from '@apillon/workers-lib';
import { CheckPendingTransactionsWorker } from '../check-pending-transactions-worker';
import { ethers } from 'ethers';
import { DbTables } from '../../config/types';

describe('Handle evm transactions', () => {
  let stage: Stage;

  beforeAll(async () => {
    stage = await setupTest();
  });

  afterAll(async () => {
    await releaseStage(stage);
  });

  test('Evm single wallet transactions', async () => {
    const createTime = new Date();
    createTime.setHours(createTime.getHours() - 1);

    const createTime2 = new Date();
    createTime2.setHours(createTime.getHours() - 6);

    // inserting like this so we can set create time
    await stage.context.mysql.paramExecute(`
      INSERT INTO ${DbTables.TRANSACTION_QUEUE}
        (address, chain, chainType, transactionStatus, nonce, rawTransaction, transactionHash, createTime)
      VALUES (
        '${await ethers.Wallet.createRandom().getAddress()}',
        ${EvmChain.MOONBASE},
        ${ChainType.EVM},
        ${TransactionStatus.PENDING},
        2,
        'raw',
        '0x9357c063719ac34946b159d76551e56bf2a79e399082cee446909705359f95de',
        '${dateToSqlString(createTime)}'
      ),(
        '${await ethers.Wallet.createRandom().getAddress()}',
        ${SubstrateChain.CRUST},
        ${ChainType.SUBSTRATE},
        ${TransactionStatus.PENDING},
        8,
        'raw',
        '0x9357c063719ac34946b159d76551e56bf2a79e399082cee446909705359f95de',
        '${dateToSqlString(createTime2)}'
      )
    `);

    const workerDefinition = new WorkerDefinition(
      {
        type: ServiceDefinitionType.LAMBDA,
        config: { region: 'test' },
        params: { FunctionName: 'test' },
      },
      'test-check-pending-transaction-worker',
      {},
    );
    let success = true;
    try {
      await new CheckPendingTransactionsWorker(
        workerDefinition,
        stage.context,
      ).run();
    } catch (e) {
      success = false;
    }
    expect(success).toBe(true);
  });
});

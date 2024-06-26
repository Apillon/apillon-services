import { BN } from '@polkadot/util';
import {
  ChainType,
  dateToSqlString,
  EvmChain,
  SubstrateChain,
  TransactionStatus,
} from '@apillon/lib';
import { releaseStage, setupTest, Stage } from '../../../test/setup';
import { ServiceDefinitionType, WorkerDefinition } from '@apillon/workers-lib';
import { CheckPendingTransactionsWorker } from '../check-pending-transactions-worker';
import { ethers } from 'ethers';
import { DbTables } from '../../config/types';

//mock returns x as next onchain nonce so last nonce is x +1
const LAST_PROCESSED_EVM_NONCE = 4;
const LAST_PROCESSED_SUBSTRATE_NONCE = 3000;
jest.mock('@polkadot/api', () => ({
  WsProvider: jest.fn().mockImplementation(() => {
    return {
      disconnect: jest.fn(), // Mock the disconnect method
    };
  }),
  ApiPromise: {
    create: jest.fn().mockResolvedValue({
      query: {
        system: {
          account: jest.fn().mockResolvedValue({
            nonce: new BN(3001),
          }),
        },
      },
    }),
  },
}));

jest.mock('ethers', () => {
  const actualEthers = jest.requireActual('ethers');
  return {
    ...actualEthers,
    ethers: {
      ...actualEthers.ethers,
      providers: {
        ...actualEthers.ethers.providers,
        JsonRpcProvider: jest.fn().mockImplementation(() => {
          return {
            getTransactionCount: jest.fn().mockResolvedValue(5),
          };
        }),
      },
    },
  };
});

const mockWriteLog = jest.fn();
const mockSendAdminAlert = jest.fn();
jest.mock('@apillon/lib', () => {
  const originalModule = jest.requireActual('@apillon/lib');

  return {
    ...originalModule,
    Lmas: jest.fn().mockImplementation(() => {
      return {
        writeLog: mockWriteLog,
        sendAdminAlert: mockSendAdminAlert,
      };
    }),
  };
});

describe('Handle evm transactions', () => {
  let stage: Stage;
  let workerDefinition: WorkerDefinition;
  let moonbaseAddress: string, crustAddress: string;

  beforeAll(async () => {
    stage = await setupTest();

    const createTime = new Date();
    createTime.setHours(createTime.getHours() - 1);

    const createTime2 = new Date();
    createTime2.setHours(createTime.getHours() - 6);

    moonbaseAddress = await ethers.Wallet.createRandom().getAddress();
    crustAddress = await ethers.Wallet.createRandom().getAddress();
    // inserting like this so we can set create time
    await stage.context.mysql.paramExecute(`
      INSERT INTO ${DbTables.TRANSACTION_QUEUE}
      (address, chain, chainType, transactionStatus, nonce, rawTransaction,
       transactionHash, createTime)
      VALUES ('${moonbaseAddress}',
              ${EvmChain.MOONBASE},
              ${ChainType.EVM},
              ${TransactionStatus.CONFIRMED},
              4,
              'raw',
              '0x9357c063719ac34946b159d76551e56bf2a79e399082cee446909705359f95d0',
              '${dateToSqlString(createTime)}'),
             ('${crustAddress}',
              ${SubstrateChain.CRUST},
              ${ChainType.SUBSTRATE},
              ${TransactionStatus.CONFIRMED},
              3000,
              'raw',
              '0x9357c063719ac34946b159d76551e56bf2a79e399082cee446909705359f95d0',
              '${dateToSqlString(createTime2)}'),
             ('${moonbaseAddress}',
              ${EvmChain.MOONBASE},
              ${ChainType.EVM},
              ${TransactionStatus.PENDING},
              5,
              'raw',
              '0x9357c063719ac34946b159d76551e56bf2a79e399082cee446909705359f95de',
              '${dateToSqlString(createTime)}'),
             ('${crustAddress}',
              ${SubstrateChain.CRUST},
              ${ChainType.SUBSTRATE},
              ${TransactionStatus.PENDING},
              3001,
              'raw',
              '0x9357c063719ac34946b159d76551e56bf2a79e399082cee446909705359f95de',
              '${dateToSqlString(createTime2)}'),
             ('${moonbaseAddress}',
              ${EvmChain.MOONBASE},
              ${ChainType.EVM},
              ${TransactionStatus.PENDING},
              6,
              'raw',
              '0x9357c063719ac34946b159d76551e56bf2a79e399082cee446909705359f95d1',
              '${dateToSqlString(createTime)}'),
             ('${crustAddress}',
              ${SubstrateChain.CRUST},
              ${ChainType.SUBSTRATE},
              ${TransactionStatus.PENDING},
              3002,
              'raw',
              '0x9357c063719ac34946b159d76551e56bf2a79e399082cee446909705359f95d1',
              '${dateToSqlString(createTime2)}')
    `);
    await stage.context.mysql.paramExecute(`
      INSERT INTO ${DbTables.WALLET}
      (address, chain, chainType, seed, nextNonce, lastProcessedNonce,
       lastResetNonce, createTime)
      VALUES ('${moonbaseAddress}',
              ${EvmChain.MOONBASE},
              ${ChainType.EVM},
              'seed,',
              5,
              4,
              null,
              '${dateToSqlString(createTime)}'),
             ('${crustAddress}',
              ${SubstrateChain.CRUST},
              ${ChainType.SUBSTRATE},
              'seed,',
              3001,
              3000,
              null,
              '${dateToSqlString(createTime2)}')
    `);
    await stage.context.mysql.paramExecute(`
      INSERT INTO ${DbTables.ENDPOINT}
        (url, chain, chainType, createTime)
      VALUES ('http://url.com',
              ${EvmChain.MOONBASE},
              ${ChainType.EVM},
              '${dateToSqlString(createTime)}'),
             ('wss://url.com',
              ${SubstrateChain.CRUST},
              ${ChainType.SUBSTRATE},
              '${dateToSqlString(createTime2)}')
    `);

    workerDefinition = new WorkerDefinition(
      {
        type: ServiceDefinitionType.LAMBDA,
        config: { region: 'test' },
        params: { FunctionName: 'test' },
      },
      'test-check-pending-transaction-worker',
      {},
    );
  });

  beforeEach(() => {
    jest.resetModules();
    mockWriteLog.mockClear();
    mockSendAdminAlert.mockClear();
  });

  afterAll(async () => {
    await releaseStage(stage);
  });

  test('notification is sent if lastProcessedNonce is the same as current on-chain nonce', async () => {
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
    expect(mockSendAdminAlert).toBeCalledTimes(1);
    expect(mockWriteLog).toBeCalledTimes(1);
  });

  test('nonce gets reset', async () => {
    await stage.context.mysql.paramExecute(
      `
        UPDATE ${DbTables.WALLET}
        SET lastResetNonce=@lastResetNonce,
            lastProcessedNonce=@lastProcessedNonce
        WHERE address = @address
      `,
      {
        address: moonbaseAddress,
        lastResetNonce: null,
        lastProcessedNonce: 5,
      },
    );
    await stage.context.mysql.paramExecute(
      `
        UPDATE ${DbTables.WALLET}
        SET lastResetNonce=@lastResetNonce,
            lastProcessedNonce=@lastProcessedNonce
        WHERE address = @address
      `,
      {
        address: crustAddress,
        lastResetNonce: null,
        lastProcessedNonce: 3001,
      },
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
    expect(mockSendAdminAlert).toBeCalledTimes(0);
    expect(mockWriteLog).toBeCalledTimes(0);
    // nonce was changed
    const wallets = await stage.context.mysql.paramExecute(
      `SELECT address, lastProcessedNonce, lastResetNonce
       FROM ${DbTables.WALLET}
       WHERE address IN (@moonbaseAddress, @crustAddress)
       ORDER BY id
      `,
      {
        moonbaseAddress,
        crustAddress,
      },
    );
    expect(wallets).toStrictEqual([
      {
        address: moonbaseAddress,
        lastProcessedNonce: LAST_PROCESSED_EVM_NONCE,
        lastResetNonce: LAST_PROCESSED_EVM_NONCE,
      },
      {
        address: crustAddress,
        lastProcessedNonce: LAST_PROCESSED_SUBSTRATE_NONCE,
        lastResetNonce: LAST_PROCESSED_SUBSTRATE_NONCE,
      },
    ]);
  });

  test('notification is sent after nonce has been reset and lastProcessedNonce remained same', async () => {
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
    expect(mockSendAdminAlert).toBeCalledTimes(1);
    expect(mockWriteLog).toBeCalledTimes(1);
  });

  test('nonce is reset even if it was reset before but lastProcessedNonce was increased', async () => {
    await stage.context.mysql.paramExecute(
      `
        UPDATE ${DbTables.WALLET}
        SET lastProcessedNonce=@lastProcessedNonce,
            lastResetNonce=@lastResetNonce
        WHERE address = @address
      `,
      {
        address: moonbaseAddress,
        lastProcessedNonce: LAST_PROCESSED_EVM_NONCE + 1,
        lastResetNonce: LAST_PROCESSED_EVM_NONCE,
      },
    );
    await stage.context.mysql.paramExecute(
      `
        UPDATE ${DbTables.WALLET}
        SET lastProcessedNonce=@lastProcessedNonce,
            lastResetNonce=@lastResetNonce
        WHERE address = @address
      `,
      {
        address: crustAddress,
        lastProcessedNonce: LAST_PROCESSED_SUBSTRATE_NONCE + 1,
        lastResetNonce: LAST_PROCESSED_SUBSTRATE_NONCE,
      },
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
    expect(mockSendAdminAlert).toBeCalledTimes(0);
    expect(mockWriteLog).toBeCalledTimes(0);
    // nonce was changed
    const wallets = await stage.context.mysql.paramExecute(
      `SELECT address, lastProcessedNonce, lastResetNonce
       FROM ${DbTables.WALLET}
       WHERE address IN (@moonbaseAddress, @crustAddress)
       ORDER BY id
      `,
      {
        moonbaseAddress,
        crustAddress,
      },
    );
    expect(wallets).toStrictEqual([
      {
        address: moonbaseAddress,
        lastProcessedNonce: LAST_PROCESSED_EVM_NONCE,
        lastResetNonce: LAST_PROCESSED_EVM_NONCE,
      },
      {
        address: crustAddress,
        lastProcessedNonce: LAST_PROCESSED_SUBSTRATE_NONCE,
        lastResetNonce: LAST_PROCESSED_SUBSTRATE_NONCE,
      },
    ]);
  });

  test('send notification instead of resetting nonce if on chain nonce is lower than min. TX nonce', async () => {
    await stage.context.mysql.paramExecute(
      `
        UPDATE ${DbTables.TRANSACTION_QUEUE}
        SET transactionStatus=@lastProcessedNonce
        WHERE nonce = @nonce
      `,
      {
        nonce: 3001,
        transactionStatus: TransactionStatus.CONFIRMED,
      },
    );
    await stage.context.mysql.paramExecute(
      `
        UPDATE ${DbTables.TRANSACTION_QUEUE}
        SET transactionStatus=@lastProcessedNonce
        WHERE nonce = @nonce
      `,
      {
        nonce: 5,
        transactionStatus: TransactionStatus.CONFIRMED,
      },
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
    expect(mockSendAdminAlert).toBeCalledTimes(1);
    expect(mockWriteLog).toBeCalledTimes(1);
  });
});

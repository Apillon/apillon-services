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

//mock returns 1 as next onchain nonce so last nonce is 0
const RESET_LAST_PROCESSED_NONCE = 0;
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
            nonce: new BN(1),
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
            getTransactionCount: jest.fn().mockResolvedValue(1),
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
              ${TransactionStatus.PENDING},
              2,
              'raw',
              '0x9357c063719ac34946b159d76551e56bf2a79e399082cee446909705359f95de',
              '${dateToSqlString(createTime)}'),
             ('${crustAddress}',
              ${SubstrateChain.CRUST},
              ${ChainType.SUBSTRATE},
              ${TransactionStatus.PENDING},
              2,
              'raw',
              '0x9357c063719ac34946b159d76551e56bf2a79e399082cee446909705359f95de',
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
              3,
              2,
              2,
              '${dateToSqlString(createTime)}'),
             ('${crustAddress}',
              ${SubstrateChain.CRUST},
              ${ChainType.SUBSTRATE},
              'seed,',
              3,
              2,
              2,
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

  test('Evm single wallet transactions', async () => {
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
    // nonce was not changed
    const count = await stage.context.mysql.paramExecute(
      `SELECT COUNT(id) as wallets
       FROM ${DbTables.WALLET}
       WHERE lastProcessedNonce = @lastProcessedNonce
         AND address IN (@moonbaseAddress, @crustAddress)`,
      {
        moonbaseAddress,
        crustAddress,
        lastProcessedNonce: RESET_LAST_PROCESSED_NONCE,
      },
    );
    expect(count[0]['wallets']).toBe(0);
  });

  test('nonce get reset if it wasnt reset yet', async () => {
    await stage.context.mysql.paramExecute(
      `
        UPDATE ${DbTables.WALLET}
        SET lastResetNonce=@lastResetNonce
        WHERE address IN (@moonbaseAddress, @crustAddress)
      `,
      { moonbaseAddress, crustAddress, lastResetNonce: null },
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
    const count = await stage.context.mysql.paramExecute(
      `SELECT COUNT(id) as wallets
       FROM ${DbTables.WALLET}
       WHERE lastProcessedNonce = @lastProcessedNonce
         AND address IN (@moonbaseAddress, @crustAddress)`,
      {
        moonbaseAddress,
        crustAddress,
        lastProcessedNonce: RESET_LAST_PROCESSED_NONCE,
      },
    );
    expect(count[0]['wallets']).toBe(2);
  });

  test('notification is sent after nonce has been reset recently', async () => {
    await stage.context.mysql.paramExecute(
      `
        UPDATE ${DbTables.WALLET}
        SET lastResetNonce=@lastResetNonce,
            lastProcessedNonce=@lastProcessedNonce
        WHERE address IN (@moonbaseAddress, @crustAddress)
      `,
      {
        moonbaseAddress,
        crustAddress,
        lastResetNonce: 2,
        lastProcessedNonce: 2,
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

    // nonce was not changed
    const count = await stage.context.mysql.paramExecute(
      `SELECT COUNT(id) as wallets
       FROM ${DbTables.WALLET}
       WHERE lastProcessedNonce = @lastProcessedNonce
         AND address IN (@moonbaseAddress, @crustAddress)`,
      {
        moonbaseAddress,
        crustAddress,
        lastProcessedNonce: RESET_LAST_PROCESSED_NONCE,
      },
    );
    expect(count[0]['wallets']).toBe(0);
  });
});

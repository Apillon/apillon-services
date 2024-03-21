import { EvmChain } from '@apillon/lib';
import { UnsignedTransaction, ethers } from 'ethers';
import { Stage, releaseStage, setupTest } from '../../../test/setup';
import { EvmService } from './evm.service';
import { TestBlockchain } from '@apillon/tests-lib';

describe('Evm service unit test', () => {
  let stage: Stage;
  let blockchain: TestBlockchain;

  beforeAll(async () => {
    stage = await setupTest();
    blockchain = new TestBlockchain(stage, EvmChain.MOONBASE);
    await blockchain.start();
  });
  afterAll(async () => {
    await releaseStage(stage);
  });

  test('Test service', async () => {
    const transaction: UnsignedTransaction = {
      to: blockchain.getWalletAddress(1),
      value: 1,
      chainId: EvmChain.MOONBASE,
    };

    const serialized = ethers.utils.serializeTransaction(transaction);

    const res = await EvmService.createTransaction(
      {
        params: {
          transaction: serialized,
          chain: EvmChain.MOONBASE,
          minimumGas: 260000,
        },
      },
      stage.context,
    );
    console.log('res: ', res);
    const res2 = await EvmService.transmitTransactions(
      { chain: EvmChain.MOONBASE },
      stage.context,
      async () => {
        return;
      },
    );
    console.log('res2: ', res2);
  });
});

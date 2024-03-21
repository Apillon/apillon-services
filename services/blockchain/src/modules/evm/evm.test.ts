import { EvmChain, TransactionStatus } from '@apillon/lib';
import { UnsignedTransaction, ethers } from 'ethers';
import { Stage, releaseStage, setupTest } from '../../../test/setup';
import { EvmService } from './evm.service';
import { TestBlockchain } from '@apillon/tests-lib';
import { Wallet } from '../wallet/wallet.model';
import { ChainType } from '@apillon/lib';
import { Transaction } from '../../common/models/transaction';

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

    // this already triggers transmiting transaction
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

    const wallet = await new Wallet({}, stage.context).populateByAddress(
      EvmChain.MOONBASE,
      ChainType.EVM,
      blockchain.getWalletAddress(0),
    );

    const tx = await new Transaction(
      {},
      stage.context,
    ).getTransactionByChainAndHash(EvmChain.MOONBASE, res.transactionHash);

    expect(tx.transactionStatus).toEqual(TransactionStatus.CONFIRMED);
    expect(wallet.lastProcessedNonce).toEqual(tx.nonce);
  });
});

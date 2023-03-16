import { ChainType, EvmChain, SubstrateChain } from '@apillon/lib';
import { releaseStage, setupTest, Stage } from '../../../test/setup';
import { Endpoint } from '../../common/models/endpoint';
import { Wallet } from '../../common/models/wallet';
import { EvmService } from './evm.service';
import { ethers, UnsignedTransaction } from 'ethers';

describe('Evm service unit test', () => {
  let stage: Stage;

  beforeAll(async () => {
    stage = await setupTest();
  });

  afterAll(async () => {
    await releaseStage(stage);
  });

  test('Test service', async () => {
    const endpoint = await new Endpoint(
      {
        url: 'https://moonbeam-alpha.api.onfinality.io/public',
        chain: EvmChain.MOONBASE,
        chainType: ChainType.EVM,
        status: 5,
      },
      stage.context,
    ).insert();

    const provider = new ethers.providers.JsonRpcProvider(endpoint.url);
    const nonce = await provider.getTransactionCount(
      '0xFBC42ccb9440FA54cBd175A626933cE6A0DA1354',
    );

    await new Wallet(
      {
        chain: EvmChain.MOONBASE,
        chainType: ChainType.EVM,
        seed: '0xca5aae58fe85a26a8df4ffb7e58da1b9074721f945243938d3bd8682bead1cd5',
        address: '0xFBC42ccb9440FA54cBd175A626933cE6A0DA1354',
        nextNonce: nonce,
      },
      stage.context,
    ).insert();

    const transaction: UnsignedTransaction = {
      to: '0xA257f4eF17c81Eb4d15A741A8D09e1EBb3953202',
      value: 1,
      chainId: EvmChain.MOONBASE,
    };

    const serialized = ethers.utils.serializeTransaction(transaction);

    const res = await EvmService.createTransaction(
      { transaction: serialized, chain: EvmChain.MOONBASE },
      stage.context,
    );
    console.log('res: ', res);
    const res2 = await EvmService.transmitTransactions(
      { chain: EvmChain.MOONBASE },
      stage.context,
    );
    console.log('res2: ', res2);
  });
});

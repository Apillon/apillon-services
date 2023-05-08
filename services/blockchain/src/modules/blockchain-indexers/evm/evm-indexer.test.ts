import { ChainType, EvmChain, env } from '@apillon/lib';
import { EvmBlockchainIndexer } from './evm-indexer.service';
import { EvmTransfers } from './data-models/evm-transfer';

describe.skip('Crust blockchain indexer - Wallet outgoing transactions', () => {
  beforeAll(async () => {
    env.BLOCKCHAIN_MOONBEAM_GRAPHQL_SERVER =
      'http://18.203.251.180:8083/graphql';
  });

  test('Evm (Moonbeam testnet) withdrawals exists.', async () => {
    const evmIndexer = new EvmBlockchainIndexer(EvmChain.MOONBASE);

    // Withdrawals from block to block
    const txs: EvmTransfers = await evmIndexer.getWalletOutgoingTxs(
      '0xba01526c6d80378a9a95f1687e9960857593983b',
      3608737,
      3646784,
    );
    console.log(`Obtained ${txs.transactions.length} evm withdrawals `);
    expect(txs.transactions.length > 0).toBe(true);
  });

  test('Evm (moonbeam testnet) deposits exits.', async () => {
    const evmIndexer = new EvmBlockchainIndexer(EvmChain.MOONBASE);
    const txs: EvmTransfers = await evmIndexer.getWalletIncomingTxs(
      '0xA257f4eF17c81Eb4d15A741A8D09e1EBb3953202',
      3803126,
      3950731,
    );
    expect(txs.transactions.length == 5).toBe(true);
  });

  test('Evm blockheight test', async () => {
    const evmIndexer = new EvmBlockchainIndexer(EvmChain.MOONBASE);
    const blockHeight = await evmIndexer.getBlockHeight();

    expect(blockHeight > 6000).toBe(true);
  });
});

describe.skip('EVM blockchain indexer err', () => {
  beforeAll(async () => {
    env.BLOCKCHAIN_MOONBEAM_GRAPHQL_SERVER = null;
  });
  it('Expect throwing error.', function () {
    expect(() => new EvmBlockchainIndexer(EvmChain.MOONBEAM)).toThrow(
      new Error('Missing EVM (chain=MOONBEAM) GraphQL server url!'),
    );
  });
});

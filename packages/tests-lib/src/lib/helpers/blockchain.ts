import ganache from 'ganache';
import { Stage } from '../interfaces/stage.interface';
import { Endpoint } from '@apillon/blockchain/src/common/models/endpoint';
import { Wallet } from '@apillon/blockchain/src/common/models/wallet';
import { ChainType, EvmChain, SubstrateChain } from '@apillon/lib';

export async function startGanacheRPCServer(stage: Stage) {
  const options = {};
  const server = ganache.server(options);
  const PORT = 0; // 0 means any available port
  server.listen(PORT, async (err) => {
    if (err) {
      throw err;
    }

    console.log(
      `ganache listening on ${server.address().address}:${
        server.address().port
      }...`,
    );
    const provider = server.provider;
    const accounts = await provider.request({
      method: 'eth_accounts',
      params: [],
    });
    console.info('ganache accouts', accounts);

    //Add provider to blockchain DB
    await stage.blockchainSql.paramExecute(`DELETE FROM endpoint`, {});

    await stage.blockchainSql.paramExecute(
      `
      INSERT INTO endpoint (status, url, chain, chainType)
      VALUES 
      (5, 'wss://rpc.crust.network', ${SubstrateChain.CRUST}, ${ChainType.SUBSTRATE}),
      (5, 'wss://spiritnet.kilt.io', ${SubstrateChain.KILT}, ${ChainType.SUBSTRATE})
      ;
    `,
      { url: server.address().address },
    );
    //Configure wallets
    const moonbaseWallet: Wallet = new Wallet(
      {},
      stage.blockchainContext,
    ).populate({
      address: accounts[0],
      chain: EvmChain.MOONBASE,
      chainType: ChainType.EVM,
      seed: '123',
      type: 1,
    });
    await moonbaseWallet.insert();
  });
}

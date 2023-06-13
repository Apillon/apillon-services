import ganache from 'ganache';
import { Stage } from '../interfaces/stage.interface';
import { Wallet } from '@apillon/blockchain/src/common/models/wallet';
import { ChainType, EvmChain, SubstrateChain } from '@apillon/lib';

export async function startGanacheRPCServer(stage: Stage) {
  const server = ganache.server({
    wallet: {
      accounts: [
        {
          balance: 1000000,
          secretKey:
            '0x7f109a9e3b0d8ecfba9cc23a3614433ce0fa7ddcc80f2a8f10b222179a5a80d6',
        },
      ],
    },
  });
  const PORT = 0; // 0 means any available port
  server.listen(PORT, async (err) => {
    if (err) {
      throw err;
    }

    try {
      const ganacheServerAddress = `${server.address().address}:${
        server.address().port
      }`;
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
        (5, 'http://${ganacheServerAddress}', ${EvmChain.MOONBASE}, ${ChainType.EVM}),
        (5, 'http://${ganacheServerAddress}', ${EvmChain.ASTAR}, ${ChainType.EVM})
        ;
      `,
        {},
      );
      //Configure wallets
      const moonbaseWallet: Wallet = new Wallet(
        {},
        stage.blockchainContext,
      ).populate({
        address: accounts[0],
        chain: EvmChain.MOONBASE,
        chainType: ChainType.EVM,
        seed: '0x7f109a9e3b0d8ecfba9cc23a3614433ce0fa7ddcc80f2a8f10b222179a5a80d6',
        type: 1,
      });
      await moonbaseWallet.insert();

      const astarWallet: Wallet = new Wallet(
        {},
        stage.blockchainContext,
      ).populate({
        address: accounts[0],
        chain: EvmChain.ASTAR,
        chainType: ChainType.EVM,
        seed: '0x7f109a9e3b0d8ecfba9cc23a3614433ce0fa7ddcc80f2a8f10b222179a5a80d6',
        type: 1,
      });
      await astarWallet.insert();
      console.info('startGanacheRPCServer SUCCESS!');
    } catch (error) {
      console.error('ERROR configuring endpoints and wallets!');
      console.error(error);
      throw error;
    }
  });
}

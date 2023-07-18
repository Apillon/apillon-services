import ganache from 'ganache';
import { Stage } from '../interfaces/stage.interface';
import { Wallet } from '@apillon/blockchain/src/common/models/wallet';
import { ChainType, EvmChain } from '@apillon/lib';
import * as fs from 'fs';

export async function startGanacheRPCServer(
  stage: Stage,
  chainId: EvmChain,
): Promise<string[]> {
  const server = ganache.server({
    account_keys_path: 'accounts.json',
    chain: { chainId: chainId },
  });
  return new Promise((resolve, reject) => {
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

        //Add provider to blockchain DB
        await stage.blockchainSql.paramExecute(
          `DELETE
           FROM endpoint`,
          {},
        );
        await stage.blockchainSql.paramExecute(
          `
            INSERT INTO endpoint (status, url, chain, chainType)
            VALUES (5, 'http://${ganacheServerAddress}', ${chainId},
                    ${ChainType.EVM});
          `,
          {},
        );

        //WALLET
        const accountsAndKeys = JSON.parse(
          fs.readFileSync('accounts.json').toString(),
        );
        const accounts = Object.keys(accountsAndKeys['addresses']);
        const account = accounts[0];
        //Configure wallets
        const wallet: Wallet = new Wallet({}, stage.blockchainContext).populate(
          {
            address: account,
            chain: chainId,
            chainType: ChainType.EVM,
            seed: accountsAndKeys['private_keys'][account],
            type: 1,
          },
        );
        await wallet.insert();
        console.info('startGanacheRPCServer SUCCESS!');
        resolve(accounts);
      } catch (error) {
        console.error('ERROR configuring endpoints and wallets!');
        console.error(error);
        reject(error);
      }
    });
  });
}

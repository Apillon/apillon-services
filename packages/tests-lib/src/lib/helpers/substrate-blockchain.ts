import { ServiceStage, Stage } from '../interfaces/stage.interface';
import { Wallet } from '@apillon/blockchain/src/modules/wallet/wallet.model';
import { ChainType, SubstrateChain } from '@apillon/lib';
import { exec, spawn } from 'node:child_process';
import * as path from 'node:path';

const KEYS = {
  // Alice "subkey inspect //Alice"
  '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY':
    '0xe5be9a5092b81bca64be81d212e7f2f9eba183bb7a90954f7b76361f6edb5c0a',
  // Bob
  '5FHneW46xGXgs5mUiveU4sbTyGBzmstUspZC92UhjJM694ty':
    '0x398f0c28f98885e046333d4a41c19cee4c37368a9832c6502f6cfd182e2aef89',
  // Charlie
  '5FLSigC9HGRKVhB9FiEo4Y3koPsNmBmLJbpXg2mp1hXcS59Y':
    '0xbc1ede780f784bb6991a585e4f6e61522c14e1cae6ad0895fb57b9a205a8f938',
  // Dave
  '5DAAnrj7VHTznn2AWBemMuyBwZWs6FNFjdyVXUeYum3PTXFy':
    '0x868020ae0687dda7d57565093a69090211449845a7e11453612800b663307246',
  // Eve
  '5HGjWAeFDfFCWPsjFQdVV2Msvz2XtMktvgocEZcCj68kUMaw':
    '0x786ad0e2df456fe43dd1f91ebca22e235bc162e0bb8d53c633e8c85b2af68b7a',
  // Ferdie
  '5CiPPseXPECbkjWCa6MnjNokrgYjMqmKndv2rSnekmSK2DjL':
    '0x42438b7883391c05512a938e36c2df0131e088b3756d6aa7a755fbff19d2f842',
};

export class TestSubstrateBlockchain {
  private readonly stage: ServiceStage;
  private readonly chainId: SubstrateChain;
  private readonly host: string;
  private readonly port: number;
  // private readonly accounts: string[] = [];
  private readonly keys = KEYS;
  private controller: AbortController;

  constructor(stage: ServiceStage, chainId: SubstrateChain, port = 9944) {
    this.stage = stage;
    this.chainId = chainId;
    this.host = '127.0.0.1';
    this.port = port;

    // this.accounts = Object.keys(this.keys);
  }

  static fromStage(stage: Stage, chainId: SubstrateChain, port = 9944) {
    return new TestSubstrateBlockchain(
      {
        db: stage.sql.blockchain,
        context: stage.blockchainContext,
      },
      chainId,
      port,
    );
  }

  async start() {
    this.controller = new AbortController();
    const packageRoot = path.resolve(__dirname, '../../..');
    const swankyNode = spawn('npm', ['run', 'swanky:node'], {
      signal: this.controller.signal,
      cwd: packageRoot,
    });
    swankyNode.stderr.on('data', (data) => {
      console.log('SWANKY_NODE:', data.toString());
    });
    swankyNode.on('close', (code) => {
      console.log(`SWANKY_NODE process exited with code ${code}`);
    });
    exec('npm run swanky:deploy', {
      cwd: packageRoot,
    });

    const endpoint = `${this.host}:${this.port}`;
    console.log(`swanky listening on ${endpoint}...`);
    // update DB
    try {
      await this.storeEndpoint(endpoint);

      const deployerAddress =
        '5GrwvaEF5zXb26Fz9rcQpDWS57CtERHpNehXCPcNoHGKutQY';
      const deployerPrivateKey = this.getPrivateKey(deployerAddress);
      await this.storeWallet(deployerAddress, deployerPrivateKey);
      console.info('startSwankyRPCServer SUCCESS!');
    } catch (error) {
      console.error('ERROR configuring endpoints and wallets!');
      console.error(error);
      throw error;
    }
  }

  async stop() {
    this.controller.abort();
  }

  // getWalletAddresses() {
  //   return this.accounts;
  // }

  // getWalletAddress(accountIndex: number) {
  //   return accountIndex < this.accounts.length
  //     ? this.accounts[accountIndex]
  //     : null;
  // }

  // getWalletPrivateKey(accountIndex: number) {
  //   if (accountIndex < this.accounts.length) {
  //     const address = this.accounts[accountIndex];
  //     return KEYS[address];
  //   }
  //   return null;
  // }
  //
  // async contractRead(to: string, data: string) {
  //   try {
  //     return await this.server.provider.request({
  //       method: 'eth_call',
  //       params: [
  //         {
  //           from: null,
  //           to,
  //           data,
  //         },
  //       ],
  //     });
  //   } catch (e: any) {
  //     return null;
  //   }
  // }
  //
  // async contractWrite(
  //   fromIndex: number,
  //   to: string,
  //   data: string,
  //   value: number = null,
  // ) {
  //   try {
  //     const from = this.accounts[fromIndex];
  //     const param = {
  //       from,
  //       to,
  //       gas: '0x5b8d80',
  //       maxFeePerGas: '0xffffffff',
  //       data,
  //     };
  //     if (value) {
  //       param['value'] = ethers.utils
  //         .parseUnits(`${value}`, 'ether')
  //         .toNumber();
  //     }
  //     const signedTx = await this.server.provider.request({
  //       method: 'eth_signTransaction',
  //       params: [param],
  //     });
  //     return await this.server.provider.send('eth_sendRawTransaction', [
  //       signedTx,
  //     ]);
  //   } catch (e: any) {
  //     return null;
  //   }
  // }
  //
  // async getTransactionReceipt(transactionHash: string) {
  //   return await this.server.provider.request({
  //     method: 'eth_getTransactionReceipt',
  //     params: [transactionHash],
  //   });
  // }

  private getPrivateKey(address: string) {
    return address in this.keys ? this.keys[address] : null;
  }

  private async storeEndpoint(hostname: string) {
    await this.stage.db.paramExecute(
      `DELETE
       FROM endpoint`,
      {},
    );
    await this.stage.db.paramExecute(
      `
        INSERT INTO endpoint (status, url, chain, chainType)
        VALUES (5, 'ws://${hostname}', ${this.chainId},
                ${ChainType.SUBSTRATE});
      `,
      {},
    );
  }

  private async storeWallet(address: string, privateKey: string) {
    //Configure wallets
    const wallet: Wallet = new Wallet({}, this.stage.context).populate({
      address: address,
      chain: this.chainId,
      chainType: ChainType.SUBSTRATE,
      seed: privateKey,
      type: 1,
    });
    await wallet.insert();
  }
}

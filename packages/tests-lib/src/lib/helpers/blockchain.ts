import ganache, { Server } from 'ganache';
import { ServiceStage, Stage } from '../interfaces/stage.interface';
import { Wallet } from '@apillon/blockchain/src/modules/wallet/wallet.model';
import { ChainType, EvmChain, SubstrateChain } from '@apillon/lib';
import { ethers } from 'ethers';
import { TransactionType } from '@apillon/nfts/src/config/types';
import { Transaction as NftCollectionTx } from '@apillon/nfts/src/modules/transaction/models/transaction.model';
import { Transaction as BlockchainTx } from '@apillon/blockchain/src/common/models/transaction';

const KEYS = {
  '0x7756251cff23061ec0856f8ec8d7384a2d260aa2':
    '0x82737ddcda32194e70acd65d96092f0e91529a21745ba1967741122b7f3bc131',
  '0x222fef88807fc117aa59828e7e0791194f3dba7a':
    '0x099ca99e83b8e56fc9b2b1dd54d497aab727b608d59a86de993b3e01aa111aa1',
  '0x6fbd93471c037ec37b2ce9c3fac359020c04a57e':
    '0x935ea18be41298915bb9c7ef9d18c86d09065c283420ffbda2c43c98f0edbf71',
  '0x61f1b5aa86fde1a07793c4d47f6d2e338e1229ce':
    '0x65447dd3ab48779fda73a65bfc8e18178ded4adb8b55851cd8b8af93711efd5f',
  '0xe8ca8affe306ad5fe49eff3d7421545e50b75c9a':
    '0xe973ca590d7d502645fa832df5b94a720c6fcbd33c846cf31b00c5e7d50cb214',
  '0x85d93ed919a85a8e99ee38aac84fd1313f0f5403':
    '0x926fb2085d0f57ebd6b9972c180059eb41b9035005afd73beab52be44aaf3919',
  '0x1222df2ba43ddab1c105c2de3e8b5589c454ff98':
    '0x598cba75378efbd21f7452849b908bd86690d4f661d64aea9f12c11eee44edcd',
  '0x5e797aebb929a5aa0479600910303b036412da56':
    '0x766b75896512c0348f77ca0e82150f2b18690c8d3ada0e381fb8e1cdfc78aaf4',
  '0x4c551629ef76867c6ffc1778179c6dd7c58e8431':
    '0x9526e0c94e615ff2f6c8f24a46aefc1bbc4423cdd6af219d42b3e40cd0a3f1ba',
  '0x80b9232677ff960bbe7a26a6bd855f60bb9a69ff':
    '0x7d2c5e144625627c7c30ed5550aa2879971567d3fa673b9496a6c15359c6fed8',
};

/**
 * Helper class for emulating blockchain and getting blockchain related data.
 */
export class TestBlockchain {
  private readonly stage: ServiceStage;
  private readonly chainId: EvmChain;
  private readonly port: number;
  private readonly server: Server;
  private readonly accounts: string[] = [];
  private readonly keys = KEYS;

  constructor(stage: ServiceStage, chainId: EvmChain, port = 8545) {
    this.stage = stage;
    this.chainId = chainId;
    this.port = port;

    this.accounts = Object.keys(this.keys);
    this.server = ganache.server({
      chain: { chainId },
      wallet: {
        accounts: this.accounts.map((account) => ({
          secretKey: this.keys[account],
          balance: 1000000000000000000,
        })),
      },
    });
  }

  static fromStage(stage: Stage, chainId: EvmChain, port = 8545) {
    return new TestBlockchain(
      {
        db: stage.blockchainSql,
        context: stage.blockchainContext,
      },
      chainId,
      port,
    );
  }

  async start() {
    await this.server.listen(this.port);
    const serverInfo = this.server.address();
    const ganacheEndpoint = `${serverInfo.address}:${serverInfo.port}`;
    console.log(`ganache listening on ${ganacheEndpoint}...`);
    // update DB
    try {
      await this.storeEndpoint(ganacheEndpoint);

      const deployerAddress = this.getWalletAddress(0);
      const deployerPrivateKey = this.getPrivateKey(deployerAddress);
      await this.storeWallet(deployerAddress, deployerPrivateKey);
      console.info('startGanacheRPCServer SUCCESS!');
    } catch (error) {
      console.error('ERROR configuring endpoints and wallets!');
      console.error(error);
      throw error;
    }
  }

  async stop() {
    await this.server.close();
  }

  getWalletAddresses() {
    return this.accounts;
  }

  getWalletAddress(accountIndex: number) {
    return accountIndex < this.accounts.length
      ? this.accounts[accountIndex]
      : null;
  }

  getWalletPrivateKey(accountIndex: number) {
    if (accountIndex < this.accounts.length) {
      const address = this.accounts[accountIndex];
      return KEYS[address];
    }
    return null;
  }

  async contractRead(to: string, data: string) {
    try {
      return await this.server.provider.request({
        method: 'eth_call',
        params: [
          {
            from: null,
            to,
            data,
          },
        ],
      });
    } catch (e: any) {
      return null;
    }
  }

  async contractWrite(
    fromIndex: number,
    to: string,
    data: string,
    value: number = null,
  ) {
    try {
      const from = this.accounts[fromIndex];
      const param = {
        from,
        to,
        gas: '0x5b8d80',
        maxFeePerGas: '0xffffffff',
        data,
      };
      if (value) {
        param['value'] = ethers.utils
          .parseUnits(`${value}`, 'ether')
          .toNumber();
      }
      const signedTx = await this.server.provider.request({
        method: 'eth_signTransaction',
        params: [param],
      });
      return await this.server.provider.send('eth_sendRawTransaction', [
        signedTx,
      ]);
    } catch (e: any) {
      return null;
    }
  }

  async getTransactionReceipt(transactionHash: string) {
    return await this.server.provider.request({
      method: 'eth_getTransactionReceipt',
      params: [transactionHash],
    });
  }

  private getPrivateKey(address: string) {
    return address in this.keys ? this.keys[address] : null;
  }

  private async storeEndpoint(ganacheEndpoint: string) {
    await this.stage.db.paramExecute(
      `DELETE
       FROM endpoint`,
      {},
    );
    await this.stage.db.paramExecute(
      `
        INSERT INTO endpoint (status, url, chain, chainType)
        VALUES (5, 'http://${ganacheEndpoint}', ${this.chainId},
                ${ChainType.EVM});
      `,
      {},
    );
  }

  private async storeWallet(address: string, privateKey: string) {
    //Configure wallets
    const wallet: Wallet = new Wallet({}, this.stage.context).populate({
      address: address,
      chain: this.chainId,
      chainType: ChainType.EVM,
      seed: privateKey,
      type: 1,
    });
    await wallet.insert();
  }
}

export async function getNftTransactionStatus(
  stage: Stage,
  chainId: EvmChain | SubstrateChain,
  collectionUuid: string,
  transactionType: TransactionType,
) {
  const collectionTxs = await new NftCollectionTx(
    {},
    stage.nftsContext,
  ).getCollectionTransactions(collectionUuid);
  const collectionTx = collectionTxs.find(
    (x) => x.transactionType == transactionType,
  );
  const blockchainTx = await new BlockchainTx(
    {},
    stage.blockchainContext,
  ).getTransactionByChainAndHash(chainId, collectionTx.transactionHash);

  return blockchainTx.transactionStatus;
}

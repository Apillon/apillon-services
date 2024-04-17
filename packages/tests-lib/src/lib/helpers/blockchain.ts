import { ServiceStage, Stage } from '../interfaces/stage.interface';
import { Wallet } from '@apillon/blockchain/src/modules/wallet/wallet.model';
import { ChainType, EvmChain, SubstrateChain } from '@apillon/lib';
import { ethers } from 'ethers';
import { TransactionType } from '@apillon/nfts/src/config/types';
import { Transaction as NftCollectionTx } from '@apillon/nfts/src/modules/transaction/models/transaction.model';
import { Transaction as BlockchainTx } from '@apillon/blockchain/src/common/models/transaction';
const fs = require('node:fs/promises');
const { spawn } = require('child_process');
const terminate = require('terminate/promise');

const KEYS = {
  '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266':
    '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80',
  '0x70997970C51812dc3A010C7d01b50e0d17dc79C8':
    '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d',
  '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC':
    '0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a',
  '0x90F79bf6EB2c4f870365E785982E1f101E93b906':
    '0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6',
  '0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65':
    '0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a',
  '0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc':
    '0x8b3a350cf5c34c9194ca85829a2df0ec3153be0318b5e2d3348e872092edffba',
  '0x976EA74026E726554dB657fA54763abd0C3a0aa9':
    '0x92db14e403b83dfe3df233f83dfa3a0d7096f21ca9b0d6d6b8d88b2b4ec1564e',
  '0x14dC79964da2C08b23698B3D3cc7Ca32193d9955':
    '0x4bbbf85ce3377467afe5d46f804f221813b2bb87f24d81f60f1fcdbf7cbf4356',
  '0x23618e81E3f5cdF7f54C3d65f7FBc0aBf5B21E8f':
    '0xdbda1821b80551c9d65939329250298aa3472ba22feea921c0cf5d620ea67b97',
  '0xa0Ee7A142d267C1f36714E4a8F75612F20a79720':
    '0x2a871d0798f97d79848a013d4936a73bf4cc922c825d33c1cf7073dff6d409c6',
};

/**
 * Helper class for emulating blockchain and getting blockchain related data.
 */
export class TestBlockchain {
  private readonly stage: ServiceStage;
  private readonly chainId: EvmChain;
  private readonly port: number;
  private child: any;
  private readonly accounts: string[] = [];
  private readonly keys = KEYS;

  constructor(stage: ServiceStage, chainId: EvmChain, port = 8545) {
    this.stage = stage;
    this.chainId = chainId;
    this.port = port;

    this.accounts = Object.keys(this.keys);
    this.chainId = chainId;
    this.port = port;
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
    this.child = await this.execCommand(
      `npx hardhat --config ${__dirname}/configs/hardhat_${this.chainId}.config.js node --port ${this.port}`,
    );
    // update DB
    try {
      await this.storeEndpoint(`http://127.0.0.1:${this.port}`);

      const deployerAddress = this.getWalletAddress(0);
      const deployerPrivateKey = this.getPrivateKey(deployerAddress);
      await this.storeWallet(deployerAddress, deployerPrivateKey);
      console.info('start hardhat SUCCESS!');
    } catch (error) {
      console.error('ERROR configuring endpoints and wallets!');
      console.error(error);
      throw error;
    }
  }

  async stop() {
    if (this.child) {
      console.info('stopping hardhat');
      await terminate(this.child.pid);
    }
  }

  execCommand = async (command) => {
    return new Promise((resolve, reject) => {
      const file = './hardhat.log';
      let start = false;
      fs.writeFile(file, '', { flag: 'w+' });
      const [cmd, ...args] = command.split(' ');
      const childProcess = spawn(cmd, args);
      childProcess.stdout.on('data', (data) => {
        if (!start && data.toString().includes('Started HTTP')) {
          resolve(childProcess);
          start = true;
          process.stdout.write('hardhat started');
        }
        fs.writeFile(file, data.toString(), { flag: 'a+' });
      });
      childProcess.stderr.on('data', (data) => {
        if (!start && data.toString().includes('Started HTTP')) {
          resolve(childProcess);
          start = true;
          process.stdout.write('hardhat started');
        }
        fs.writeFile(file, data.toString(), { flag: 'a+' });
      });
      childProcess.on('error', (error) => {
        process.stdout.write('hardhat error: ', error);

        fs.writeFile(file, error.toString(), { flag: 'a+' });
        reject(error);
      });
      childProcess.on('exit', (code) => {
        process.stdout.write('hardhat stopped');
        if (code) {
          fs.writeFile(file, code.toString(), { flag: 'a+' });
        }
        reject();
      });
    });
  };

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
      const provider = new ethers.providers.JsonRpcProvider(
        `http://127.0.0.1:${this.port}`,
      );
      return await provider.send('eth_call', [
        {
          from: null,
          to,
          data,
        },
      ]);
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
      const provider = new ethers.providers.JsonRpcProvider(
        `http://127.0.0.1:${this.port}`,
      );
      const signedTx = await provider.send('eth_signTransaction', [param]);
      return await provider.send('eth_sendRawTransaction', [signedTx]);
    } catch (e: any) {
      return null;
    }
  }

  async getTransactionReceipt(transactionHash: string) {
    const provider = new ethers.providers.JsonRpcProvider(
      `http://127.0.0.1:${this.port}`,
    );
    return await provider.send('eth_getTransactionReceipt', [transactionHash]);
  }

  private getPrivateKey(address: string) {
    return address in this.keys ? this.keys[address] : null;
  }

  async storeEndpoint(endpoint: string) {
    await this.stage.db.paramExecute(
      `DELETE
       FROM endpoint`,
      {},
    );
    await this.stage.db.paramExecute(
      `
        INSERT INTO endpoint (status, url, chain, chainType)
        VALUES (5, '${endpoint}', ${this.chainId},
                ${ChainType.EVM});
      `,
      {},
    );
  }

  public async storeWallet(address: string, privateKey: string) {
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

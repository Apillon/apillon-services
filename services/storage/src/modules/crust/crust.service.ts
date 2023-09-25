import {
  BlockchainMicroservice,
  Context,
  CreateSubstrateTransactionDto,
  SubstrateChain,
} from '@apillon/lib';
import { ServiceContext } from '@apillon/service-lib';
import { typesBundleForPolkadot } from '@crustio/type-definitions';
import { ApiPromise, WsProvider } from '@polkadot/api';
import { CID } from 'ipfs-http-client';

export class CrustService {
  static async placeStorageOrderToCRUST(
    params: {
      cid: CID;
      size: number;
      isDirectory: boolean;
      refTable?: string;
      refId?: string;
      project_uuid: string;
    },
    context: Context,
  ) {
    console.info('placeStorageOrderToCRUST', params);

    // Construct place-storage-order tx
    const fileCid = params.cid.toV0().toString(); // IPFS CID, take `Qm123` as example
    const fileSize = params.size; // Let's say 2 gb(in byte)
    const tips = 0;
    const memo = params.isDirectory ? 'folder' : '';

    // Pin dist directory on Crust
    const api = await ApiPromise.create({
      provider: new WsProvider('wss://rpc.crust.network'),
      typesBundle: typesBundleForPolkadot,
      throwOnConnect: true,
    });
    let tx;
    try {
      tx = api.tx.market.placeStorageOrder(fileCid, fileSize, tips, memo);
    } finally {
      await api.disconnect();
    }

    const dto = new CreateSubstrateTransactionDto(
      {
        chain: SubstrateChain.CRUST,
        transaction: tx.toHex(),
        referenceTable: params.refTable,
        referenceId: params.refId,
        project_uuid: params.project_uuid,
      },
      context,
    );
    console.info('createSubstrateTransaction...');
    return await new BlockchainMicroservice(context).createSubstrateTransaction(
      dto,
    );
  }

  static async testCrustProvider(
    event: { providerEndpoint: string },
    _context: ServiceContext,
  ) {
    const provider = new WsProvider(
      event.providerEndpoint
        ? event.providerEndpoint
        : 'wss://crust.api.onfinality.io/ws?apikey=15a3df59-0a99-4216-97b4-e2d242fe64e5',
    );
    const api = await ApiPromise.create({
      provider,
      typesBundle: typesBundleForPolkadot,
      throwOnConnect: true,
    });
    let balance;
    try {
      balance = await api.query.system.account(
        'cTHA4D34PHTD5jkK68tbyLakwnC6mYWgUEq6pA1kSqAeUtpH1',
      );
    } finally {
      await api.disconnect();
    }

    console.log(balance.toHuman());

    return { balance: balance.toHuman() };
  }
}

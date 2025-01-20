import { UniqueChain, UniqueChainInstance } from '@unique-nft/sdk';
import { Address } from '@unique-nft/utils/address';

export class UniqueNftClient {
  private client: UniqueChainInstance;

  constructor(baseUrl: string) {
    this.client = UniqueChain({
      baseUrl,
    });
  }

  // private getCollectionIdFromAddress(address: string): number {
  //   return Address.collection.addressToId(address);
  // }
  //
  // private getAddressFromCollectionId(collectionId: number): string {
  //   return Address.collection.idToAddress(collectionId);
  // }

  async getCollection(collectionId: string) {
    return await this.client.collection.get({
      collectionId,
    });
  }

  async getCollectionToken(collectionId: string, tokenId: number) {
    return await this.client.token.get({
      collectionId,
      tokenId,
    });
  }

  async createCollection(
    name: string,
    symbol: string,
    description: string,
    admins: string[],
    isDrop: boolean,
    isNestable: boolean,
    isRevokable: boolean,
    isSoulbound: boolean,
    maxSupply: number,
  ) {
    const tokenPropertyPermissions = [
      'URI',
      'URISuffix',
      'customizing_overrides',
      'overrides',
      'schemaName',
      'schemaVersion',
      'tokenData',
    ].map((key) => ({
      key,
      permission: {
        mutable: true,
        collectionAdmin: true,
        tokenOwner: false,
      },
    }));
    const result = await this.client.collection.create.encode({
      symbol,
      description,
      name,
      mode: 'Nft',
      access: isDrop ? 'AllowList' : 'Normal',
      admins,
      limits: {
        tokenLimit: maxSupply,
        ownerCanTransfer: false,
        ownerCanDestroy: isRevokable,
        transfersEnabled: !isSoulbound,
      },
      permissions: {
        mintMode: isDrop,
        nesting: { tokenOwner: isNestable },
      },
      tokenPropertyPermissions,
    });

    return result.compactExtrinsic;
  }

  async mintNft(collectionId: string, tokens: any[]) {
    const result = await this.client.token.mintNFTs.encode({
      collectionId,
      tokens,
    });

    return result.compactExtrinsic;
  }

  getTokenAddress(collectionId: string, tokenId: number) {
    return Address.nesting.idsToAddress(parseInt(collectionId), tokenId);
  }

  async burnNft(collectionId: string, tokenId: number, from: string) {
    const result = await this.client.token.burn.encode({
      collectionId,
      tokenId,
      from,
    });

    return result.compactExtrinsic;
  }

  async transferOwnership(collectionId: string, newOwner: string) {
    const result = await this.client.collection.transferCollection.encode({
      to: newOwner,
      collectionId: collectionId,
    });

    return result.compactExtrinsic;
  }
}

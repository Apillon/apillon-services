import { UniqueChain, UniqueChainInstance } from '@unique-nft/sdk';
import { compactAddLength, u8aConcat, u8aToHex } from '@polkadot/util';
import { Address } from '@unique-nft/utils/address';

export class UniqueNftClient {
  private client: UniqueChainInstance;

  constructor() {
    this.client = UniqueChain({
      // TODO: hardcoded
      baseUrl: 'https://rest.uniquenetwork.dev/v2/opal',
      account: {
        address: 'unf4iCz1cSYWQvNx1DVii7EP2awrYGTPudaj4fpFtYrqj3Knr',
      } as any,
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
    const result = await this.client.collection.create.build({
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
      // tokenPropertyPermissions: [
      //   {
      //     key: 'A',
      //     permission: {
      //       mutable: true,
      //       collectionAdmin: true,
      //       tokenOwner: true,
      //     },
      //   },
      // ],
    });

    return this.unsignedExtrinsicPayloadToRawTx(result);
  }

  async mintNft(collectionId: string, tokens: any[]) {
    const result = await this.client.token.mintNFTs.build({
      collectionId,
      tokens,
    });

    return this.unsignedExtrinsicPayloadToRawTx(result);
  }

  // TODO: remove if unused
  // async configureNft(
  //   collectionId: string,
  //   tokenId: number,
  //   imageUrl: string,
  //   properties: any[],
  // ) {
  //   const updateNftTx = this.unsignedExtrinsicPayloadToRawTx(
  //     await this.client.token.updateNft.build({
  //       collectionId,
  //       tokenId,
  //       data: {
  //         image: imageUrl,
  //         // image_details: {
  //         //   name: "Artwork",
  //         //   type: "image",
  //         //   format: "PNG",
  //         //   bytes: 1048576,
  //         //   width: 1000,
  //         //   height: 1000,
  //         //   sha256: "0x1234...",
  //         // }
  //         attributes: [
  //           {
  //             trait_type: 'Color',
  //             identifier: 'Red',
  //             //display_type: '',
  //           },
  //           {
  //             trait_type: 'Size',
  //             identifier: 'Large',
  //           },
  //         ],
  //       },
  //     }),
  //   );
  //   const setPropertiesTx = this.unsignedExtrinsicPayloadToRawTx(
  //     await this.client.token.setProperties.build({
  //       collectionId,
  //       tokenId,
  //       properties,
  //     }),
  //   );
  //   return;
  // }

  getTokenAddress(collectionId: string, tokenId: number) {
    return Address.nesting.idsToAddress(parseInt(collectionId), tokenId);
  }

  async burnNft(collectionId: string, tokenId: number) {
    const result = await this.client.token.burn.build({
      collectionId,
      tokenId,
    });

    return this.unsignedExtrinsicPayloadToRawTx(result);
  }

  async transferOwnership(collectionId: string, newOwner: string) {
    const result = await this.client.collection.transferCollection.build({
      to: newOwner,
      collectionId: collectionId,
    });

    return this.unsignedExtrinsicPayloadToRawTx(result);
  }

  private unsignedExtrinsicPayloadToRawTx(
    unsignedExtrinsicPayload: UnsignedExtrinsicPayload,
  ): string {
    const { method, version } = unsignedExtrinsicPayload.signerPayloadJSON;

    const versionWithMethodAndLength = compactAddLength(
      u8aConcat([version], method),
    );

    return u8aToHex(versionWithMethodAndLength);
  }
}

type UnsignedExtrinsicPayload = Awaited<
  ReturnType<UniqueChainInstance['extrinsic']['build']>
>;

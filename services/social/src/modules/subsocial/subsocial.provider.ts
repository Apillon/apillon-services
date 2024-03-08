import {
  BlockchainMicroservice,
  ChainType,
  Context,
  CreateSubstrateTransactionDto,
  SubstrateChain,
} from '@apillon/lib';
import { SubsocialApi } from '@subsocial/api';
import { IpfsContent } from '@subsocial/types/substrate/classes';
import { DbTables, PostType } from '../../config/types';
import { Space } from './models/space.model';
import { Post } from './models/post.model';

export class SubsocialProvider {
  private readonly chain: SubstrateChain;
  private api: SubsocialApi;
  private context: Context;

  constructor(context: Context, chain: SubstrateChain) {
    this.context = context;
    this.chain = chain;
  }

  async initializeApi() {
    if (!this.api) {
      const nodeUrl = (
        await new BlockchainMicroservice(this.context).getChainEndpoint(
          this.chain,
          ChainType.SUBSTRATE,
        )
      ).data;

      const config = {
        substrateNodeUrl: nodeUrl.url,
        ipfsNodeUrl: 'https://ipfs.subsocial.network',
        offchainUrl: 'https://api.subsocial.network',
      };

      this.api = await SubsocialApi.create(config);
    }
  }

  async createSpace(space: Space) {
    const spaceIpfsData = {
      about: space.about,
      image: null,
      name: space.name,
      tags: space.tags?.length ? space.tags.split(';') : [],
      email: null,
      links: [],
    };

    const cid = await this.api.ipfs.saveContentToOffchain(spaceIpfsData);

    const substrateApi = await this.api.substrateApi;

    const tx = substrateApi.tx.spaces.createSpace(IpfsContent(cid), null);

    const dto = new CreateSubstrateTransactionDto(
      {
        chain: this.chain,
        transaction: tx.toHex(),
        referenceTable: DbTables.SPACE,
        referenceId: space.space_uuid,
        project_uuid: space.project_uuid,
        fromAddress: space.walletAddress,
      },
      this.context,
    );
    console.info('createSubstrateTransaction...', dto);

    return await new BlockchainMicroservice(
      this.context,
    ).createSubstrateTransaction(dto);
  }

  async createPost(post: Post) {
    const space = await new Space({}, this.context).populateById(post.space_id);

    const postIpfsData = {
      title: post.title,
      image: null, // ipfsImageCid = await api.subsocial.ipfs.saveFile(file)
      body: post.body,
      tags: post.tags?.length ? post.tags.split(';') : [],
    };

    const cid = await this.api.ipfs.saveContentToOffchain(postIpfsData);

    const substrateApi = await this.api.substrateApi;

    let extension;
    switch (post.postType) {
      case PostType.COMMENT:
        extension = { Comment: null };
        break;
      case PostType.REGULAR:
        extension = { RegularPost: null };
        break;
      case PostType.SHARED:
        extension = { SharedPost: '1' };
        break;
    }

    const tx = substrateApi.tx.posts.createPost(
      space.spaceId,
      extension,
      IpfsContent(cid),
    );

    const dto = new CreateSubstrateTransactionDto(
      {
        chain: this.chain,
        transaction: tx.toHex(),
        referenceTable: DbTables.POST,
        referenceId: post.post_uuid,
        project_uuid: post.project_uuid,
        fromAddress: space.walletAddress,
      },
      this.context,
    );
    console.info('createSubstrateTransaction...');
    return await new BlockchainMicroservice(
      this.context,
    ).createSubstrateTransaction(dto);
  }
}

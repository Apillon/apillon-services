import {
  BlockchainMicroservice,
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
      let config = {
        substrateNodeUrl: 'wss://xsocial.subsocial.network',
        ipfsNodeUrl: 'https://ipfs.subsocial.network',
        offchainUrl: 'https://api.subsocial.network',
      };

      if (this.chain == SubstrateChain.SUBSOCIAL) {
        config = {
          substrateNodeUrl: 'wss://para.f3joule.space',
          ipfsNodeUrl: 'https://ipfs.subsocial.network',
          offchainUrl: 'https://api.subsocial.network',
        };
      }

      this.api = await SubsocialApi.create(config);

      /*if (this.chain == SubstrateChain.XSOCIAL) {
        //https://docs.subsocial.network/docs/develop/sdk/connectToSubsocial
        //For testnet, we have to set authHeader
        const authHeader =
          'c3ViLTVGQTluUURWZzI2N0RFZDhtMVp5cFhMQm52TjdTRnhZd1Y3bmRxU1lHaU45VFRwdToweDEwMmQ3ZmJhYWQwZGUwNzFjNDFmM2NjYzQzYmQ0NzIxNzFkZGFiYWM0MzEzZTc5YTY3ZWExOWM0OWFlNjgyZjY0YWUxMmRlY2YyNzhjNTEwZGY4YzZjZTZhYzdlZTEwNzY2N2YzYTBjZjM5OGUxN2VhMzAyMmRkNmEyYjc1OTBi';
        this.api.ipfs.setWriteHeaders({
          authorization: 'Basic ' + authHeader,
        });
      }*/
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
      },
      this.context,
    );
    console.info('createSubstrateTransaction...');

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
      },
      this.context,
    );
    console.info('createSubstrateTransaction...');
    return await new BlockchainMicroservice(
      this.context,
    ).createSubstrateTransaction(dto);
  }
}

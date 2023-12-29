import {
  BlockchainMicroservice,
  Context,
  CreateSubstrateTransactionDto,
  SubstrateChain,
} from '@apillon/lib';
import { SubsocialApi } from '@subsocial/api';
import { IpfsContent } from '@subsocial/types/substrate/classes';
import { DbTables } from '../../config/types';
import { Space } from './models/space.model';

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
        ipfsNodeUrl: 'https://gw.crustfiles.app',
      };

      if (this.chain == SubstrateChain.SUBSOCIAL) {
        config = {
          substrateNodeUrl: 'wss://para.f3joule.space',
          ipfsNodeUrl: 'https://ipfs.subsocial.network',
        };
      }

      this.api = await SubsocialApi.create(config);

      if (this.chain == SubstrateChain.XSOCIAL) {
        //https://docs.subsocial.network/docs/develop/sdk/connectToSubsocial
        //For testnet, we have to set authHeader
        const authHeader =
          'c3ViLTVGQTluUURWZzI2N0RFZDhtMVp5cFhMQm52TjdTRnhZd1Y3bmRxU1lHaU45VFRwdToweDEwMmQ3ZmJhYWQwZGUwNzFjNDFmM2NjYzQzYmQ0NzIxNzFkZGFiYWM0MzEzZTc5YTY3ZWExOWM0OWFlNjgyZjY0YWUxMmRlY2YyNzhjNTEwZGY4YzZjZTZhYzdlZTEwNzY2N2YzYTBjZjM5OGUxN2VhMzAyMmRkNmEyYjc1OTBi';
        this.api.ipfs.setWriteHeaders({
          authorization: 'Basic ' + authHeader,
        });
      }
    }
  }

  async createSpace(context: Context, space: Space) {
    const spaceIpfsData = {
      about: space.about,
      image: 'Qmasp4JHhQWPkEpXLHFhMAQieAH1wtfVRNHWZ5snhfFeBe', // ipfsImageCid = await api.subsocial.ipfs.saveFile(file)
      name: space.name,
      tags: space.tags?.length ? space.tags.split(';') : [],
    };

    const cid = await this.api.ipfs.saveContent(spaceIpfsData);

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
      context,
    );
    console.info('createSubstrateTransaction...');

    return await new BlockchainMicroservice(context).createSubstrateTransaction(
      dto,
    );
  }
}

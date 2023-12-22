import {
  CreateSpaceDto,
  SqlModelStatus,
  SubstrateChain,
  env,
} from '@apillon/lib';
import { ServiceContext, getSerializationStrategy } from '@apillon/service-lib';
import { Space } from './models/space.model';
import {
  SocialCodeException,
  SocialValidationException,
} from '../../lib/exceptions';
import { Storage } from '@apillon/sdk';
import { v4 as uuidV4 } from 'uuid';
import { SocialErrorCode } from '../../config/types';
import { SubsocialProvider } from './subsocial.provider';

export class SubsocialService {
  static async createSpace(
    params: { body: CreateSpaceDto },
    context: ServiceContext,
  ) {
    const space = new Space(
      { ...params.body, space_uuid: uuidV4(), status: SqlModelStatus.DRAFT },
      context,
    );
    //TODO spend credit action

    try {
      await space.validate();
    } catch (err) {
      await space.handle(err);
      if (!space.isValid()) {
        throw new SocialValidationException(space);
      }
    }

    await space.insert();

    const storageService = new Storage({
      key: env.APILLON_API_INTEGRATION_API_KEY,
      secret: env.APILLON_API_INTEGRATION_API_SECRET,
    });

    /*const spaceIpfsData = {
      about: space.about,
      image: space.image,
      name: space.name,
      tags: space.tags,
    };*/
    const spaceIpfsData = {
      about: 'This is demo code',
      image: 'Qmasp4JHhQWPkEpXLHFhMAQieAH1wtfVRNHWZ5snhfFeBe', // ipfsImageCid = await api.subsocial.ipfs.saveFile(file)
      name: 'Test',
      tags: ['Apillon'],
    };

    /*await storageService
      .bucket('46a3f998-2137-4b12-87de-f5e850ed5424')
      .uploadFiles([
        {
          fileName: space.space_uuid,
          content: Buffer.from(JSON.stringify(spaceIpfsData)),
        },
      ]);

    let file = await storageService
      .bucket('46a3f998-2137-4b12-87de-f5e850ed5424')
      .listFiles({ search: space.space_uuid });

    if (!file.items) {
      throw new SocialCodeException({
        code: SocialErrorCode.GENERAL_SERVER_ERROR,
        status: 500,
      });
    }

    while (!file.items[0].CID) {
      file = await storageService
        .bucket('46a3f998-2137-4b12-87de-f5e850ed5424')
        .listFiles({ search: space.space_uuid });

      await new Promise((resolve) => setTimeout(resolve, 1000));
    }*/

    const provider = new SubsocialProvider(context, SubstrateChain.XSOCIAL);
    await provider.initializeApi();
    await provider.createSpace(context, space);

    return space.serialize(getSerializationStrategy(context));
  }
}

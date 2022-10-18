import { SerializeFor } from 'at-lib';
import { ServiceContext } from '../../context';
import { StorageValidationException } from '../../lib/exceptions';
import { Bucket } from './models/bucket.model';

export class BucketService {
  static async createBucket(event, context: ServiceContext): Promise<any> {
    const b: Bucket = new Bucket(event.bucket, context);
    //set default bucket size
    b.maxSize = 5242880;

    try {
      await b.validate();
    } catch (err) {
      await b.handle(err);
      if (!b.isValid()) throw new StorageValidationException(b);
    }

    await b.insert();
    return b.serialize(SerializeFor.PROFILE);
  }
}

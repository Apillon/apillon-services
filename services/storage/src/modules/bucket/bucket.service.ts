import { ValidationException } from 'at-lib';
import { ValidatorErrorCode } from '../../config/types';
import { ServiceContext } from '../../context';
import { Bucket } from './models/bucket.model';

export class BucketService {
  static async createBucket(event, context: ServiceContext): Promise<Bucket> {
    const b: Bucket = new Bucket(event.bucket, context);

    try {
      await b.validate();
    } catch (err) {
      await b.handle(err);
      if (!b.isValid()) throw new ValidationException(b, ValidatorErrorCode);
    }

    await b.insert();
    return b;
  }
}

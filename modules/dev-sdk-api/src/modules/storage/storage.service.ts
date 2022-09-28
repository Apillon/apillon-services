import { Injectable } from '@nestjs/common';
import { create } from 'ipfs-http-client';

@Injectable()
export class StorageService {
  async uploadFileToIPFS(): Promise<any> {
    // connect to a different API
    const client = create({ url: 'http://127.0.0.1:5002/api/v0' });

    // call Core API methods
    const { cid } = await client.add('Hello world!');
    return true;
  }
}

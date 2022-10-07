import { create } from 'ipfs-http-client';

export class IPFSHelper {
  static async addFile(event) {
    console.log(`LOGGER: ${event?.message || JSON.stringify(event)}`);

    // connect using a URL
    const client = await IPFSHelper.loadIPFS();

    // call Core API methods
    const { cid } = await client.add('Hello world!');

    console.log(cid);

    return true;
  }

  static async loadIPFS() {
    return create({ url: 'http://127.0.0.1:5002/api/v0' });
  }
}

import { CID, create } from 'ipfs-http-client';

export class IPFSService {
  static async uploadFilesToIPFS(): Promise<CID[]> {
    // connect to a different API
    const client = create({ url: 'http://127.0.0.1:5001/api/v0' });

    //Methods, that are available in client instance: https://github.com/ipfs/js-ipfs/blob/master/docs/core-api/FILES.md

    // call Core API methods
    const filesOnIPFS = await client.addAll([
      {
        path: 'myDirectory/helloWorld2.txt',
        content: 'Hello world 2!',
      },
      {
        path: 'myDirectory/bonjornoWorld.txt',
        content: 'Hello world 2!',
      },
      {
        path: 'myDirectory/dubar dan world.txt',
        content: 'Hello world 2!',
      },
    ]);

    let res: CID[] = [];
    for await (const file of filesOnIPFS) {
      console.log(file);
      res.push(file.cid);
    }

    return res;
  }
}

import { AddResult, IpfsKuboRpcHttpClient } from '../ipfs-http-client';

describe('Ipfs http client integration test', () => {
  test('Test add', async () => {
    const client = new IpfsKuboRpcHttpClient(
      'http://ipfs-eu1-0.apillon.io:5001/api/v0',
    );
    const res: AddResult = await client.add({
      content: 'Some test content',
      path: 'test.txt',
    });
    expect(res.cid).toBeTruthy();
    expect(res.size).toBeGreaterThan(0);
  });
  describe('Mutable file system tests', () => {
    test('Test list MFS directories', async () => {
      const client = new IpfsKuboRpcHttpClient(
        'http://ipfs-eu1-0.apillon.io:5001/api/v0',
      );
      const res = await client.files.listDirectories({ path: '/' });
      expect(res).toBeTruthy();
    });

    test('Test list MFS files', async () => {
      const client = new IpfsKuboRpcHttpClient(
        'http://ipfs-eu1-0.apillon.io:5001/api/v0',
      );
      const res = await client.files.list({ path: '/' });
      expect(res).toBeTruthy();
    });

    test('Test write MFS file', async () => {
      const client = new IpfsKuboRpcHttpClient(
        'http://ipfs-eu1-0.apillon.io:5001/api/v0',
      );
      const res = await client.files.write({
        content: 'This is file in MFS',
        path: '/My MFS test file.txt',
      });
      expect(res).toBeTruthy();
    });
  });
  describe.only('Key & IPNS Name tests', () => {
    const key = 'test key ' + new Date().toString();

    test('Test generate new key', async () => {
      const client = new IpfsKuboRpcHttpClient(
        'http://ipfs-eu1-0.apillon.io:5001/api/v0',
      );
      const res = await client.key.gen({
        name: key,
      });
      expect(res).toBeTruthy();
      expect(res.Id).toBeTruthy();
      expect(res.Name).toBeTruthy();
    });

    test('Test publish name', async () => {
      const client = new IpfsKuboRpcHttpClient(
        'http://ipfs-eu1-0.apillon.io:5001/api/v0',
      );
      const res = await client.name.publish({
        cid: 'bafkreiakrvel4n4dd3jirros2dbow7jvtrdtfq2pbj6i7g6qpf64krmqfe',
        key,
        resolve: true,
      });
      expect(res).toBeTruthy();
      expect(res.Name).toBeTruthy();
      expect(res.Value).toContain(
        'bafkreiakrvel4n4dd3jirros2dbow7jvtrdtfq2pbj6i7g6qpf64krmqfe',
      );
    });
  });
});

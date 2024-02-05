import { IpfsKuboRpcHttpClient } from '../ipfs-http-client';

describe('Ipfs http client integration test', () => {
  const client = new IpfsKuboRpcHttpClient(
    'http://ipfs-eu1-0.apillon.io:5001/api/v0',
  );
  test('Test add', async () => {
    const res = await client.add({
      content: 'Some test content',
    });
    expect(res.cid).toBeTruthy();
    expect(res.size).toBeGreaterThan(0);
  });
  describe('Mutable file system tests', () => {
    test('Test list MFS entries', async () => {
      const res = await client.files.ls({ path: '/' });
      expect(res).toBeTruthy();
      expect(res.length).toBeGreaterThan(0);
      expect(res[0].Hash).toBeTruthy();
      expect(res[0].Type).toBeTruthy();
    });

    test('Test list MFS files', async () => {
      const res = await client.files.stat({ path: '/' });
      expect(res).toBeTruthy();
      expect(res.cid).toBeTruthy();
      expect(res.size).toBeTruthy();
      expect(res.path).toBeTruthy();
    });

    test('Test write MFS file', async () => {
      const res = await client.files.write({
        content: 'This is file in MFS',
        path: '/My MFS test file.txt',
      });
      expect(res).toBeTruthy();
    });
  });
  describe('Key & IPNS Name tests', () => {
    const key = 'test key ' + new Date().toString();

    test('Test generate new key', async () => {
      const res = await client.key.gen({
        name: key,
      });
      expect(res).toBeTruthy();
      expect(res.Id).toBeTruthy();
      expect(res.Name).toBeTruthy();
    });

    test('Test publish name', async () => {
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

  describe('Pin tests', () => {
    test.only('Test add new pins', async () => {
      const res = await client.pin.add({
        cids: ['bafkreiakrvel4n4dd3jirros2dbow7jvtrdtfq2pbj6i7g6qpf64krmqfe'],
      });
      expect(res).toBeTruthy();
    });

    test('Test list pins', async () => {
      const res = await client.pin.ls({
        cid: 'bafkreiakrvel4n4dd3jirros2dbow7jvtrdtfq2pbj6i7g6qpf64krmqfe',
      });
      expect(res).toBeTruthy();
      expect(
        res['bafkreiakrvel4n4dd3jirros2dbow7jvtrdtfq2pbj6i7g6qpf64krmqfe'],
      ).toBeTruthy();
    });

    test('Test remove pins', async () => {
      const res = await client.pin.rm({
        cids: ['bafkreiakrvel4n4dd3jirros2dbow7jvtrdtfq2pbj6i7g6qpf64krmqfe'],
      });
      expect(res).toBeTruthy();
    });
  });
});

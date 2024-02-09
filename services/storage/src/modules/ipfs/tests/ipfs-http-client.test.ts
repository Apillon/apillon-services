import { runWithWorkers } from '@apillon/lib';
import { IpfsKuboRpcHttpClient } from '../ipfs-http-client';
import fs from 'fs';

describe('Ipfs http client integration test', () => {
  const client = new IpfsKuboRpcHttpClient(
    'http://ipfs-eu1-0.apillon.io:5001/api/v0',
  );
  test('Test add', async () => {
    const res = await client.add({
      content: 'Some test content',
    });
    expect(res.Hash).toBeTruthy();
    expect(res.Size).toBeGreaterThan(0);
  });
  describe('Mutable file system tests', () => {
    test('Test write MFS file', async () => {
      const res = await client.files.write({
        content: 'This is file in MFS',
        path: '/ipfs-http-client-tests/My MFS test file.txt',
      });
      expect(res).toBeTruthy();
    });

    test('Test list MFS entries', async () => {
      const res = await client.files.ls({ path: '/ipfs-http-client-tests' });
      expect(res).toBeTruthy();
      expect(res.length).toBeGreaterThan(0);
      const file = res.find((x) => x.Name == 'My MFS test file.txt');

      expect(file.Hash).toBeTruthy();
      expect(file.Name).toBeTruthy();
      expect(file.Size).toBe(0);
    });

    test('Test get stat for path ', async () => {
      const res = await client.files.stat({ path: '/ipfs-http-client-tests' });
      expect(res).toBeTruthy();
      expect(res.Hash).toBeTruthy();
      expect(res.CumulativeSize).toBeTruthy();
      expect(res.Type).toBeTruthy();
    });

    /*test('Test write all files from local directory to MFS', async () => {
      const testFolder = './test/test-files/';

      const files = await fs.readdirSync(testFolder);
      await runWithWorkers(files, 20, undefined, async (file) => {
        await client.files.write({
          content: fs.readFileSync(testFolder + file),
          path: '/test-path/' + file,
        });
      });
    });*/
  });
  describe.only('Key & IPNS Name tests', () => {
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
    test('Test add new pins', async () => {
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

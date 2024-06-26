import { FileStatus } from '@apillon/storage/src/config/types';
import { Bucket } from '@apillon/storage/src/modules/bucket/models/bucket.model';
import { IpfsCluster } from '@apillon/storage/src/modules/ipfs/models/ipfs-cluster.model';
import { File } from '@apillon/storage/src/modules/storage/models/file.model';
import {
  createTestBucket,
  createTestProject,
  createTestUser,
  releaseStage,
  Stage,
  TestUser,
} from '@apillon/tests-lib';
import * as request from 'supertest';
import { v4 as uuidV4 } from 'uuid';
import { setupTest } from '../../../../test/helpers/setup';
import { Project } from '../../project/models/project.model';
import { ProjectConfig } from '@apillon/storage/src/modules/config/models/project-config.model';
import {
  addJwtToIPFSUrl,
  generateJwtSecret,
} from '@apillon/storage/src/lib/ipfs-utils';
import { JwtTokenType, parseJwtToken } from '@apillon/lib';

describe('Storage with custom IPFS node tests', () => {
  let stage: Stage;
  let testUser: TestUser;
  let testProject: Project;
  let testBucket: Bucket;
  let testSession_uuid: string = uuidV4();
  let testFile: File;
  let customCluster: IpfsCluster;

  beforeAll(async () => {
    stage = await setupTest();
    testUser = await createTestUser(
      stage.context.devConsole,
      stage.context.access,
    );
    testProject = await createTestProject(testUser, stage);
    testBucket = await createTestBucket(
      testUser,
      stage.context.storage,
      testProject,
    );

    //Insert custom ipfs cluster
    customCluster = await new IpfsCluster(
      {
        ipfsApi: 'http://34.253.247.44:5001/api/v0',
        ipfsGateway: 'https://ipfs-staging.apillon.io/ipfs/',
        ipnsGateway: 'https://ipfs-staging.apillon.io/ipns/',
        subdomainGateway: 'web3approved.com',
        domain: 'ipfs.apillon.io',
        private: false,
        region: 'EU',
        cloudProvider: 'AWS',
        isDefault: false,
        secret: 'secret123',
      },
      stage.context.storage,
    ).insert();

    await new ProjectConfig(
      {
        project_uuid: testProject.project_uuid,
        ipfsCluster_id: customCluster.id,
      },
      stage.context.storage,
    ).insert();
  });

  afterAll(async () => {
    await releaseStage(stage);
  });

  describe('IPFS config tests - storage with PUBLIC custom IPFS', () => {
    test('User should be able to upload files to custom IPFS node', async () => {
      testSession_uuid = uuidV4();

      let response = await request(stage.http)
        .post(`/storage/${testBucket.bucket_uuid}/files-upload`)
        .send({
          session_uuid: testSession_uuid,
          files: [
            {
              fileName: 'myTestFile.txt',
              contentType: 'text/plain',
              path: '',
            },
          ],
        })
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(201);

      const fur = response.body.data.files.find(
        (x) => x.fileName == 'myTestFile.txt',
      );

      response = await request(fur.url)
        .put(``)
        .send(new Date().toString() + 'File 2');
      expect(response.status).toBe(200);

      // trigger sync to IPFS
      response = await request(stage.http)
        .post(
          `/storage/${testBucket.bucket_uuid}/file-upload/${testSession_uuid}/end`,
        )
        .send({
          directSync: true,
        })
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(200);

      //Check if files exists
      testFile = await new File({}, stage.context.storage).populateByUUID(
        fur.file_uuid,
      );
      expect(testFile.exists()).toBeTruthy();
    });

    test('User should be able to get file details with link to custom IPFS. ', async () => {
      const response = await request(stage.http)
        .get(
          `/storage/${testBucket.bucket_uuid}/file/${testFile.file_uuid}/detail`,
        )
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(200);

      expect(response.body.data.fileStatus).toBe(FileStatus.UPLOADED_TO_IPFS);
      expect(response.body.data.file_uuid).toBe(testFile.file_uuid);
      expect(response.body.data.CID).toBe(testFile.CID);
      expect(response.body.data.name).toBe(testFile.name);
      expect(response.body.data.size).toBeGreaterThan(0);
      expect(response.body.data.link).toMatch(
        `https://${testFile.CID}.ipfs.web3approved.com/`,
      );
    });

    test('User should be able to download uploaded file from custom apillon ipfs gateway', async () => {
      expect(testFile).toBeTruthy();
      const response = await request(testFile.link).get('');
      expect(response.status).toBe(200);
    });

    test('User should be able to get bucket content. Items download link should point to custom ipfs', async () => {
      const response = await request(stage.http)
        .get(
          `/directories/directory-content?bucket_uuid=${testBucket.bucket_uuid}`,
        )
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(200);
      expect(response.body.data.items.length).toBe(1);
      expect(response.body.data.items[0]?.name).toBe('myTestFile.txt');
      expect(response.body.data.items[0]?.link).toMatch(
        `https://${testFile.CID}.ipfs.web3approved.com/`,
      );
    });
  });

  describe('IPFS config tests - storage with PRIVATE custom IPFS', () => {
    beforeAll(async () => {
      //Update cluster so that it will be private
      customCluster.private = true;
      await customCluster.update();
    });

    test('User should be able to get file details with link&token to project IPFS', async () => {
      const response = await request(stage.http)
        .get(
          `/storage/${testBucket.bucket_uuid}/file/${testFile.file_uuid}/detail`,
        )
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(200);

      expect(response.body.data.fileStatus).toBe(FileStatus.UPLOADED_TO_IPFS);
      expect(response.body.data.file_uuid).toBe(testFile.file_uuid);
      expect(response.body.data.CID).toBe(testFile.CID);
      expect(response.body.data.name).toBe(testFile.name);
      expect(response.body.data.size).toBeGreaterThan(0);

      expect(response.body.data.link).toMatch(
        `https://${testFile.CID}.ipfs.web3approved.com/?token=`,
      );

      //Verify token
      parseJwtToken(
        JwtTokenType.IPFS_TOKEN,
        response.body.data.link.split('?token=')[1],
        generateJwtSecret(testProject.project_uuid, customCluster.secret),
      );
    });

    test('User should be able to download uploaded file from custom apillon ipfs gateway', async () => {
      expect(testFile).toBeTruthy();
      const response = await request(testFile.link).get('');
      expect(response.status).toBe(200);
    });

    test('User should be able to get bucket content. Items download link&token should point to custom ipfs', async () => {
      const response = await request(stage.http)
        .get(
          `/directories/directory-content?bucket_uuid=${testBucket.bucket_uuid}`,
        )
        .set('Authorization', `Bearer ${testUser.token}`);
      expect(response.status).toBe(200);
      expect(response.body.data.items.length).toBe(1);
      expect(response.body.data.items[0]?.name).toBe('myTestFile.txt');
      expect(response.body.data.items[0]?.link).toMatch(
        `https://${testFile.CID}.ipfs.web3approved.com/?token=`,
      );
    });
  });
});

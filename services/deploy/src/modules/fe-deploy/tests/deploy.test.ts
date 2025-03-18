import {
  AWS_KMS,
  CreateDeploymentConfigDtoType,
  DefaultUserRole,
  DeploymentBuildQueryFilter,
  DeploymentBuildStatus,
  GithubLinkDto,
  SetEnvironmentVariablesDto,
  SqlModelStatus,
  UpdateDeploymentConfigDto,
} from '@apillon/lib';
import { Stage, releaseStage, setupTest } from '../../../test/setup';
import { BuildProjectWorker } from '../../../workers/build-project-worker';
import { DbTables as StorageDbTables } from '@apillon/storage/src/config/types';
import { DbTables } from '../../../config/types';
import { FrontendController } from '../frontend.controller';

const expectedProjectConfig = {
  accessToken: 'access_token',
  refreshToken: null,
  id: 123,
  login: 'apillon_user',
  projectUuid: 'uuid',
};

const expectedCreatedWebhook = {
  id: 1,
};

jest.mock('../services/github.service', () => {
  return {
    GithubService: jest.fn().mockImplementation(() => {
      return {
        getTokens: jest.fn().mockResolvedValue({
          access_token: expectedProjectConfig.accessToken,
          refresh_token: expectedProjectConfig.refreshToken,
          scope: '',
        }),
        getUser: jest.fn().mockResolvedValue({
          id: 123,
          login: expectedProjectConfig.login,
        }),
        getRepos: jest.fn().mockResolvedValue([]),
        deleteWebhook: jest.fn(),
        createWebhook: jest.fn().mockResolvedValue(expectedCreatedWebhook),
      };
    }),
  };
});

jest.mock('@apillon/lib', () => {
  return {
    ...jest.requireActual('@apillon/lib'),
    StorageMicroservice: jest.fn().mockImplementation(() => {
      return {
        getWebsiteWithAccess: jest.fn().mockResolvedValue({
          data: {
            project_uuid: 'uuid',
          },
        }),
        updateWebsite: jest.fn().mockResolvedValue({}),
      };
    }),
  };
});

// Mock the encrypt method of AWS_KMS
jest
  .spyOn(AWS_KMS.prototype, 'encrypt')
  .mockImplementation(async (data, keyId) => {
    // Your mock implementation here
    return `encrypted-${data}`;
  });

// Mock the encrypt method of AWS_KMS
jest
  .spyOn(AWS_KMS.prototype, 'decrypt')
  .mockImplementation(async (data, keyId) => {
    // Your mock implementation here
    return '[{"key":"key","value":"value"}]';
  });

jest
  .spyOn(BuildProjectWorker.prototype, 'runExecutor')
  .mockImplementation(async (data) => {
    return {};
  });

let frontendController: FrontendController;
let githubService: any;
describe('DeployService tests', () => {
  let stage: Stage;
  beforeAll(async () => {
    // To this:

    stage = await setupTest();

    frontendController = new FrontendController(stage.context);
  });
  afterAll(async () => {
    await releaseStage(stage);
  });

  describe('linkGithub', () => {
    afterEach(async () => {
      await stage.db.paramExecute(
        `DELETE FROM ${DbTables.GITHUB_PROJECT_CONFIG}`,
      );
    });
    test('User can link GitHub account', async () => {
      const dto = new GithubLinkDto({
        code: 'test-code',
        project_uuid: expectedProjectConfig.projectUuid,
      });
      const response = await frontendController.linkGithub(dto);
      expect(response).toBeDefined();
      expect(response.access_token).toBe(expectedProjectConfig.accessToken);
      expect(response.refresh_token).toBe(expectedProjectConfig.refreshToken);
      expect(response.username).toBe(expectedProjectConfig.login);
      expect(response.project_uuid).toBe(expectedProjectConfig.projectUuid);
    });

    test('User cannot link GitHub account if already linked', async () => {
      await stage.db.paramExecute(
        `INSERT INTO ${DbTables.GITHUB_PROJECT_CONFIG} (project_uuid, access_token, refresh_token, username)
        VALUES ('${expectedProjectConfig.projectUuid}', 'access_token', 'refresh_token', 'username')`,
      );

      const dto = new GithubLinkDto({
        code: 'test-code1',
        project_uuid: expectedProjectConfig.projectUuid,
      });

      expect(frontendController.linkGithub(dto)).rejects.toThrow();
    });
  });

  describe('unlinkGithub', () => {
    afterEach(async () => {
      await stage.db.paramExecute(`DELETE FROM ${DbTables.DEPLOYMENT_CONFIG}`);
      await stage.db.paramExecute(
        `DELETE FROM ${DbTables.GITHUB_PROJECT_CONFIG}`,
      );
    });
    test('User can unlink GitHub account', async () => {
      await stage.db.paramExecute(
        `INSERT INTO ${DbTables.GITHUB_PROJECT_CONFIG} (project_uuid, access_token, refresh_token, username)
        VALUES ('${expectedProjectConfig.projectUuid}', 'access_token', 'refresh_token', 'username')`,
      );

      const lastInsertId = await stage.db.paramExecute(
        `SELECT LAST_INSERT_ID() as id`,
      );
      const githubProjectConfigId = lastInsertId[0].id;

      await stage.db.paramExecute(
        `INSERT INTO ${DbTables.DEPLOYMENT_CONFIG} (repoId, repoName, repoOwnerName, hookId,branchName,websiteUuid, projectConfigId, buildDirectory,apiKey, apiSecret)
        VALUES (1, 'repo-name' ,'owner',1, 'main','0000', ${githubProjectConfigId},'dist','key','secret')`,
      );
      const dto = new GithubLinkDto({
        project_uuid: 'uuid',
      });
      await frontendController.unlinkGithub(dto);

      const response = await stage.db.paramExecute(
        `SELECT * FROM ${DbTables.GITHUB_PROJECT_CONFIG} WHERE project_uuid = '${expectedProjectConfig.projectUuid}' AND status <> ${SqlModelStatus.DELETED}`,
      );

      expect(response).toHaveLength(0);

      const deploymentConfigs = await stage.db.paramExecute(
        `SELECT * FROM ${DbTables.DEPLOYMENT_CONFIG} WHERE projectConfigId = '${githubProjectConfigId}' AND status <> ${SqlModelStatus.DELETED}`,
      );
      expect(deploymentConfigs).toHaveLength(0);
    });
  });

  describe('createDeploymentConfig', () => {
    afterEach(async () => {
      await stage.db.paramExecute(`DELETE FROM ${DbTables.DEPLOYMENT_BUILD}`);

      await stage.db.paramExecute(`DELETE FROM ${DbTables.DEPLOYMENT_CONFIG}`);

      await stage.db.paramExecute(
        `DELETE FROM ${DbTables.GITHUB_PROJECT_CONFIG}`,
      );

      await stage.storageContext.mysql.paramExecute(
        `DELETE FROM ${StorageDbTables.WEBSITE}`,
      );

      await stage.storageContext.mysql.paramExecute(
        `DELETE FROM ${StorageDbTables.BUCKET}`,
      );
    });

    test('User can create new deployment config', async () => {
      await stage.storageContext.mysql.paramExecute(
        `INSERT INTO ${StorageDbTables.BUCKET} (id,bucket_uuid, project_uuid, bucketType, name)
        VALUES (1, 'uuid', 'uuid', 1, 'name')`,
      );

      await stage.storageContext.mysql.paramExecute(
        `INSERT INTO ${StorageDbTables.WEBSITE} (website_uuid, project_uuid,bucket_id,stagingBucket_id,productionBucket_id,name, status)
        VALUES ('uuid','uuid', 1,1,1,'name' , ${SqlModelStatus.ACTIVE})`,
      );

      await stage.db.paramExecute(
        `INSERT INTO ${DbTables.GITHUB_PROJECT_CONFIG} (project_uuid, access_token, refresh_token, username)
        VALUES ('${expectedProjectConfig.projectUuid}', '${expectedProjectConfig.accessToken}', '${expectedProjectConfig.refreshToken}', '${expectedProjectConfig.login}')`,
      );

      const lastInsertId = await stage.db.paramExecute(
        `SELECT LAST_INSERT_ID() as id`,
      );

      const githubProjectConfigId = lastInsertId[0].id;

      stage.context.user = {
        authUser: {
          authUserRoles: [
            {
              project_uuid: 'uuid',
              role: {
                id: DefaultUserRole.PROJECT_ADMIN,
              },
            },
          ],
        },
      };
      const newConfigData = {
        apiKey: '1234',
        apiSecret: '4N49445GFTyv',
        branchName: 'main',
        buildCommand: 'npm run build',
        buildDirectory: 'dist',
        repoName: 'repo-name',
        repoOwnerName: 'owner',
        installCommand: 'npm install',
        projectUuid: 'uuid',
        repoUrl: 'https://apillon.io',
        repoId: 123,
        websiteUuid: 'uuid',
        project_uuid: 'uuid',
      } as CreateDeploymentConfigDtoType;

      const response =
        await frontendController.createDeploymentConfig(newConfigData);

      expect(response).toBeDefined();
      expect(response.apiKey).toBe(newConfigData.apiKey);
      expect(response.apiSecret).toBeDefined();
      expect(response.apiSecret).not.toBe(newConfigData.apiSecret);
      expect(response.branchName).toBe(newConfigData.branchName);
      expect(response.buildCommand).toBe(newConfigData.buildCommand);
      expect(response.buildDirectory).toBe(newConfigData.buildDirectory);
      expect(response.installCommand).toBe(newConfigData.installCommand);
      expect(response.repoId).toBe(newConfigData.repoId);
      expect(response.websiteUuid).toBe(newConfigData.websiteUuid);
      expect(response.hookId).toBe(expectedCreatedWebhook.id);
      expect(response.projectConfigId).toBe(githubProjectConfigId);
    });
  });

  describe('updateDeploymentConfig', () => {
    afterEach(async () => {
      await stage.db.paramExecute(`DELETE FROM ${DbTables.DEPLOYMENT_BUILD}`);
      await stage.db.paramExecute(`DELETE FROM ${DbTables.DEPLOYMENT_CONFIG}`);

      await stage.db.paramExecute(
        `DELETE FROM ${DbTables.GITHUB_PROJECT_CONFIG}`,
      );

      await stage.storageContext.mysql.paramExecute(
        `DELETE FROM ${StorageDbTables.WEBSITE}`,
      );

      await stage.storageContext.mysql.paramExecute(
        `DELETE FROM ${StorageDbTables.BUCKET}`,
      );
    });

    test('User can update deployment config', async () => {
      await stage.storageContext.mysql.paramExecute(
        `INSERT INTO ${StorageDbTables.BUCKET} (id,bucket_uuid, project_uuid, bucketType, name)
        VALUES (1, 'uuid', 'uuid', 1, 'name')`,
      );

      await stage.storageContext.mysql.paramExecute(
        `INSERT INTO ${StorageDbTables.WEBSITE} (website_uuid, project_uuid,bucket_id,stagingBucket_id,productionBucket_id,name, status)
        VALUES ('uuid','uuid', 1,1,1,'name' , ${SqlModelStatus.ACTIVE})`,
      );

      await stage.db.paramExecute(
        `INSERT INTO ${DbTables.GITHUB_PROJECT_CONFIG} (project_uuid, access_token, refresh_token, username)
        VALUES ('${expectedProjectConfig.projectUuid}', '${expectedProjectConfig.accessToken}', '${expectedProjectConfig.refreshToken}', '${expectedProjectConfig.login}')`,
      );

      const lastInsertId = await stage.db.paramExecute(
        `SELECT LAST_INSERT_ID() as id`,
      );

      const githubProjectConfigId = lastInsertId[0].id;

      stage.context.user = {
        authUser: {
          authUserRoles: [
            {
              project_uuid: 'uuid',
              role: {
                id: DefaultUserRole.PROJECT_ADMIN,
              },
            },
          ],
        },
      };
      const newConfigData = {
        apiKey: '1234',
        apiSecret: '4N49445GFTyv',
        branchName: 'main',
        buildCommand: 'npm run build',
        buildDirectory: 'dist',
        repoName: 'repo-name',
        repoOwnerName: 'owner',
        installCommand: 'npm install',
        repoId: 123,
        repoUrl: 'https://apillon.io',
        projectUuid: 'uuid',
        websiteUuid: 'uuid',
        project_uuid: 'uuid',
      } as CreateDeploymentConfigDtoType;

      const createResponse =
        await frontendController.createDeploymentConfig(newConfigData);

      const updatedConfigData = {
        apiKey: '234',
        apiSecret: '5M9445GFTyv',
        branchName: 'main',
        buildCommand: 'npm run build',
        buildDirectory: './out',
        repoName: 'new-repo',
        repoOwnerName: 'new-owner',
        installCommand: 'npm install',
        repoId: 234,
        websiteUuid: 'uuid',
        project_uuid: 'uuid',
      };
      const response = await frontendController.updateDeploymentConfig({
        id: createResponse.id,
        body: new UpdateDeploymentConfigDto({}, stage.context).populate(
          updatedConfigData,
        ),
      });

      expect(response).toBeDefined();
      expect(response.apiKey).toBe(updatedConfigData.apiKey);
      expect(response.apiSecret).toBeDefined();
      expect(response.apiSecret).not.toBe(updatedConfigData.apiSecret);
      expect(response.branchName).toBe(updatedConfigData.branchName);
      expect(response.buildCommand).toBe(updatedConfigData.buildCommand);
      expect(response.buildDirectory).toBe(updatedConfigData.buildDirectory);
      expect(response.installCommand).toBe(updatedConfigData.installCommand);
      expect(response.repoId).toBe(updatedConfigData.repoId);
      expect(response.websiteUuid).toBe(updatedConfigData.websiteUuid);
      expect(response.hookId).toBe(expectedCreatedWebhook.id);
      expect(response.projectConfigId).toBe(githubProjectConfigId);
    });
  });

  describe('deleteDeploymentConfig', () => {
    afterEach(async () => {
      await stage.db.paramExecute(`DELETE FROM ${DbTables.DEPLOYMENT_CONFIG}`);
      await stage.db.paramExecute(
        `DELETE FROM ${DbTables.GITHUB_PROJECT_CONFIG}`,
      );
      await stage.storageContext.mysql.paramExecute(
        `DELETE FROM ${StorageDbTables.BUCKET}`,
      );
      await stage.storageContext.mysql.paramExecute(
        `DELETE FROM ${StorageDbTables.WEBSITE}`,
      );
    });

    test('User can delete deployment config', async () => {
      stage.context.user = {
        authUser: {
          authUserRoles: [
            {
              project_uuid: 'uuid',
              role: {
                id: DefaultUserRole.PROJECT_ADMIN,
              },
            },
          ],
        },
      };
      await stage.storageContext.mysql.paramExecute(
        `INSERT INTO ${StorageDbTables.BUCKET} (id,bucket_uuid, project_uuid, bucketType, name)
        VALUES (1, 'uuid', 'uuid', 1, 'name')`,
      );

      await stage.storageContext.mysql.paramExecute(
        `INSERT INTO ${StorageDbTables.WEBSITE} (website_uuid, project_uuid,bucket_id,stagingBucket_id,productionBucket_id,name, status)
        VALUES ('uuid','uuid', 1,1,1,'name' , ${SqlModelStatus.ACTIVE})`,
      );

      await stage.db.paramExecute(
        `INSERT INTO ${DbTables.GITHUB_PROJECT_CONFIG} (project_uuid, access_token, refresh_token, username)
        VALUES ('${expectedProjectConfig.projectUuid}', '${expectedProjectConfig.accessToken}', '${expectedProjectConfig.refreshToken}', '${expectedProjectConfig.login}')`,
      );

      const lastInsertId = await stage.db.paramExecute(
        `SELECT LAST_INSERT_ID() as id`,
      );

      const githubProjectConfigId = lastInsertId[0].id;
      const testConfig = {
        repoId: 123,
        repoName: 'repo-name',
        repoOwnerName: 'owner',
        hookId: 1,
        branchName: 'main',
        websiteUuid: 'uuid',
        projectConfigId: githubProjectConfigId,
        buildDirectory: 'dist',
        apiKey: 'key',
        apiSecret: 'secret',
      };
      await stage.db.paramExecute(
        `INSERT INTO ${DbTables.DEPLOYMENT_CONFIG} (repoId, repoName, repoOwnerName, hookId, branchName, websiteUuid, projectConfigId, buildDirectory, apiKey, apiSecret)
        VALUES (${testConfig.repoId}, '${testConfig.repoName}', '${testConfig.repoOwnerName}', ${testConfig.hookId}, '${testConfig.branchName}', '${testConfig.websiteUuid}', ${testConfig.projectConfigId}, '${testConfig.buildDirectory}', '${testConfig.apiKey}', '${testConfig.apiSecret}')`,
      );

      const response = await frontendController.deleteDeploymentConfig(
        testConfig.websiteUuid,
      );

      expect(response).toBeDefined();
      expect(response).toBe(true);

      const deploymentConfigs = await stage.db.paramExecute(
        `SELECT * FROM ${DbTables.DEPLOYMENT_CONFIG} WHERE websiteUuid = '${testConfig.websiteUuid}' AND status <> ${SqlModelStatus.DELETED}`,
      );

      expect(deploymentConfigs).toHaveLength(0);
    });
  });
  describe('getDeploymentConfigByRepoId', () => {
    afterEach(async () => {
      await stage.db.paramExecute(`DELETE FROM ${DbTables.DEPLOYMENT_CONFIG}`);
      await stage.db.paramExecute(
        `DELETE FROM ${DbTables.GITHUB_PROJECT_CONFIG}`,
      );
    });
    test('User can retrieve deployment config by repo ID', async () => {
      await stage.db.paramExecute(
        `INSERT INTO ${DbTables.GITHUB_PROJECT_CONFIG} (project_uuid, access_token, refresh_token, username)
        VALUES ('${expectedProjectConfig.projectUuid}', '${expectedProjectConfig.accessToken}', '${expectedProjectConfig.refreshToken}', '${expectedProjectConfig.login}')`,
      );

      const lastInsertId = await stage.db.paramExecute(
        `SELECT LAST_INSERT_ID() as id`,
      );

      const githubProjectConfigId = lastInsertId[0].id;
      const testConfig = {
        repoId: 123,
        repoName: 'repo-name',
        repoOwnerName: 'owner',
        hookId: 1,
        branchName: 'main',
        websiteUuid: '0000',
        projectConfigId: githubProjectConfigId,
        buildDirectory: 'dist',
        apiKey: 'key',
        apiSecret: 'secret',
      };
      await stage.db.paramExecute(
        `INSERT INTO ${DbTables.DEPLOYMENT_CONFIG} (repoId, repoName, repoOwnerName, hookId, branchName, websiteUuid, projectConfigId, buildDirectory, apiKey, apiSecret)
        VALUES (${testConfig.repoId}, '${testConfig.repoName}', '${testConfig.repoOwnerName}', ${testConfig.hookId}, '${testConfig.branchName}', '${testConfig.websiteUuid}', ${testConfig.projectConfigId}, '${testConfig.buildDirectory}', '${testConfig.apiKey}', '${testConfig.apiSecret}')`,
      );
      const response = await frontendController.getDeploymentConfigByRepoId(
        testConfig.repoId,
      );

      expect(response).toBeDefined();
      expect(response.repoId).toBe(testConfig.repoId);
      expect(response.repoName).toBe(testConfig.repoName);
      expect(response.repoOwnerName).toBe(testConfig.repoOwnerName);
      expect(response.hookId).toBe(testConfig.hookId);
      expect(response.branchName).toBe(testConfig.branchName);
      expect(response.websiteUuid).toBe(testConfig.websiteUuid);
      expect(response.projectConfigId).toBe(testConfig.projectConfigId);
      expect(response.buildDirectory).toBe(testConfig.buildDirectory);
      expect(response.apiKey).toBe(testConfig.apiKey);
      expect(response.apiSecret).toBe(testConfig.apiSecret);
    });
  });

  describe('getProjectConfigByProjectUuid', () => {
    afterEach(async () => {
      await stage.db.paramExecute(
        `DELETE FROM ${DbTables.GITHUB_PROJECT_CONFIG}`,
      );
    });

    test('User can retrieve project config by project UUID', async () => {
      await stage.db.paramExecute(
        `INSERT INTO ${DbTables.GITHUB_PROJECT_CONFIG} (project_uuid, access_token, refresh_token, username)
        VALUES ('${expectedProjectConfig.projectUuid}', '${expectedProjectConfig.accessToken}', ${expectedProjectConfig.refreshToken}, '${expectedProjectConfig.login}')`,
      );

      const response = await frontendController.getGithubConfigByProjectUuid(
        expectedProjectConfig.projectUuid,
      );

      expect(response).toBeDefined();
      if (response) {
        expect(response.access_token).toBe(expectedProjectConfig.accessToken);
        expect(response.refresh_token).toBe(expectedProjectConfig.refreshToken);
        expect(response.username).toBe(expectedProjectConfig.login);
        expect(response.project_uuid).toBe(expectedProjectConfig.projectUuid);
      }
    });
  });

  describe('listRepos', () => {
    afterEach(async () => {
      await stage.db.paramExecute(
        `DELETE FROM ${DbTables.GITHUB_PROJECT_CONFIG}`,
      );
    });
    test('User can list repositories', async () => {
      await stage.db.paramExecute(
        `INSERT INTO ${DbTables.GITHUB_PROJECT_CONFIG} (project_uuid, access_token, refresh_token, username)
        VALUES ('${expectedProjectConfig.projectUuid}', '${expectedProjectConfig.accessToken}', '${expectedProjectConfig.refreshToken}', '${expectedProjectConfig.login}')`,
      );
      const response = await frontendController.listRepos(
        expectedProjectConfig.projectUuid,
      );
      expect(response).toBeDefined();
    });
  });

  describe('listDeploymentBuildsForWebsite', () => {
    afterEach(async () => {
      await stage.db.paramExecute(`DELETE FROM ${DbTables.DEPLOYMENT_BUILD}`);

      await stage.db.paramExecute(`DELETE FROM ${DbTables.DEPLOYMENT_CONFIG}`);

      await stage.storageContext.mysql.paramExecute(
        `DELETE FROM ${StorageDbTables.WEBSITE}`,
      );

      await stage.storageContext.mysql.paramExecute(
        `DELETE FROM ${StorageDbTables.BUCKET}`,
      );
    });

    test('User can list deployment builds for a website', async () => {
      stage.context.user = {
        authUser: {
          authUserRoles: [
            {
              project_uuid: 'uuid',
              role: {
                id: DefaultUserRole.PROJECT_ADMIN,
              },
            },
          ],
        },
      };
      await stage.storageContext.mysql.paramExecute(
        `INSERT INTO ${StorageDbTables.BUCKET} (id,bucket_uuid, project_uuid, bucketType, name)
        VALUES (1, 'uuid', 'uuid', 1, 'name')`,
      );

      await stage.storageContext.mysql.paramExecute(
        `INSERT INTO ${StorageDbTables.WEBSITE} (website_uuid, project_uuid,bucket_id,stagingBucket_id,productionBucket_id,name, status)
        VALUES ('uuid','uuid', 1,1,1,'name' , ${SqlModelStatus.ACTIVE})`,
      );
      await stage.db.paramExecute(
        `INSERT INTO ${DbTables.GITHUB_PROJECT_CONFIG} (project_uuid, access_token, refresh_token, username)
        VALUES ('${expectedProjectConfig.projectUuid}', '${expectedProjectConfig.accessToken}', '${expectedProjectConfig.refreshToken}', '${expectedProjectConfig.login}')`,
      );

      const lastInsertIdProjectConfig = await stage.db.paramExecute(
        `SELECT LAST_INSERT_ID() as id`,
      );

      const githubProjectConfigId = lastInsertIdProjectConfig[0].id;

      await stage.db.paramExecute(
        `INSERT INTO ${DbTables.DEPLOYMENT_CONFIG} (repoId, repoName, repoOwnerName, hookId, branchName, websiteUuid, projectConfigId, buildDirectory, apiKey, apiSecret)
        VALUES (1, 'repo-name', 'owner', 1, 'main', 'uuid', ${githubProjectConfigId}, 'dist', 'key', 'secret')`,
      );

      const lastInsertId = await stage.db.paramExecute(
        `SELECT LAST_INSERT_ID() as id`,
      );

      const deploymentConfigId = lastInsertId[0].id;

      const buildExample = {
        deploymentConfigId,
        buildStatus: DeploymentBuildStatus.SUCCESS,
        logs: 'logs',
        websiteUuid: 'uuid',
      };

      await stage.db.paramExecute(
        `INSERT INTO ${DbTables.DEPLOYMENT_BUILD} (deploymentConfigId, buildStatus, logs, websiteUuid)
        VALUES (${buildExample.deploymentConfigId}, ${buildExample.buildStatus}, '${buildExample.logs}',  '${buildExample.websiteUuid}')`,
      );

      const filter = new DeploymentBuildQueryFilter({ websiteUuid: 'uuid' });
      const response =
        await frontendController.listDeploymentBuildsForWebsite(filter);
      expect(response).toBeDefined();
      expect(response.items).toHaveLength(1);
      expect(response.items[0].deploymentConfigId).toBe(
        buildExample.deploymentConfigId,
      );
      expect(response.items[0].createTime).toBeDefined();
      expect(response.items[0].buildStatus).toBe(buildExample.buildStatus);
      expect(response.items[0].logs).toBe(buildExample.logs);
      expect(response.items[0].websiteUuid).toBe(buildExample.websiteUuid);
    });
  });

  describe('setEnvironmentVariables', () => {
    afterEach(async () => {
      await stage.db.paramExecute(`DELETE FROM ${DbTables.DEPLOYMENT_CONFIG}`);

      await stage.db.paramExecute(
        `DELETE FROM ${DbTables.GITHUB_PROJECT_CONFIG}`,
      );

      await stage.storageContext.mysql.paramExecute(
        `DELETE FROM ${StorageDbTables.WEBSITE}`,
      );

      await stage.storageContext.mysql.paramExecute(
        `DELETE FROM ${StorageDbTables.BUCKET}`,
      );
    });

    test('User can set environment variables', async () => {
      stage.context.user = {
        authUser: {
          authUserRoles: [
            {
              project_uuid: 'uuid',
              role: {
                id: DefaultUserRole.PROJECT_ADMIN,
              },
            },
          ],
        },
      };
      await stage.storageContext.mysql.paramExecute(
        `INSERT INTO ${StorageDbTables.BUCKET} (id,bucket_uuid, project_uuid, bucketType, name)
        VALUES (1, 'uuid', 'uuid', 1, 'name')`,
      );

      await stage.storageContext.mysql.paramExecute(
        `INSERT INTO ${StorageDbTables.WEBSITE} (website_uuid, project_uuid,bucket_id,stagingBucket_id,productionBucket_id,name, status)
        VALUES ('uuid','uuid', 1,1,1,'name' , ${SqlModelStatus.ACTIVE})`,
      );
      await stage.db.paramExecute(
        `INSERT INTO ${DbTables.GITHUB_PROJECT_CONFIG} (project_uuid, access_token, refresh_token, username)
        VALUES ('${expectedProjectConfig.projectUuid}', '${expectedProjectConfig.accessToken}', '${expectedProjectConfig.refreshToken}', '${expectedProjectConfig.login}')`,
      );

      const lastInsertIdProjectConfig = await stage.db.paramExecute(
        `SELECT LAST_INSERT_ID() as id`,
      );

      const githubProjectConfigId = lastInsertIdProjectConfig[0].id;

      await stage.db.paramExecute(
        `INSERT INTO ${DbTables.DEPLOYMENT_CONFIG} (repoId, repoName, repoOwnerName, hookId, branchName, websiteUuid, projectConfigId, buildDirectory, apiKey, apiSecret)
        VALUES (1, 'repo-name', 'owner', 1, 'main', 'uuid', ${githubProjectConfigId}, 'dist', 'key', 'secret')`,
      );

      const lastInsertId = await stage.db.paramExecute(
        `SELECT LAST_INSERT_ID() as id`,
      );

      const deploymentConfigId = lastInsertId[0].id;

      const variables = [
        {
          key: 'key',
          value: 'value',
        },
      ];

      const response = await frontendController.setEnvironmentVariables(
        new SetEnvironmentVariablesDto({}, stage.context).populate({
          variables,
          deploymentConfigId,
        }),
      );

      expect(response).toBeDefined();
      expect(response.encryptedVariables).toBeDefined();
    });
  });

  describe('getEnvironmentVariables', () => {
    test('User can get environment variables', async () => {
      stage.context.user = {
        authUser: {
          authUserRoles: [
            {
              project_uuid: 'uuid',
              role: {
                id: DefaultUserRole.PROJECT_ADMIN,
              },
            },
          ],
        },
      };
      await stage.storageContext.mysql.paramExecute(
        `INSERT INTO ${StorageDbTables.BUCKET} (id,bucket_uuid, project_uuid, bucketType, name)
        VALUES (1, 'uuid', 'uuid', 1, 'name')`,
      );

      await stage.storageContext.mysql.paramExecute(
        `INSERT INTO ${StorageDbTables.WEBSITE} (website_uuid, project_uuid, bucket_id, stagingBucket_id,productionBucket_id,name, status)
        VALUES ('uuid','uuid', 1,1,1,'name' , ${SqlModelStatus.ACTIVE})`,
      );
      await stage.db.paramExecute(
        `INSERT INTO ${DbTables.GITHUB_PROJECT_CONFIG} (project_uuid, access_token, refresh_token, username)
        VALUES ('${expectedProjectConfig.projectUuid}', '${expectedProjectConfig.accessToken}', '${expectedProjectConfig.refreshToken}', '${expectedProjectConfig.login}')`,
      );

      const lastInsertIdProjectConfig = await stage.db.paramExecute(
        `SELECT LAST_INSERT_ID() as id`,
      );

      const githubProjectConfigId = lastInsertIdProjectConfig[0].id;

      await stage.db.paramExecute(
        `INSERT INTO ${DbTables.DEPLOYMENT_CONFIG} (repoId, repoName, repoOwnerName, hookId, branchName, websiteUuid, projectConfigId, buildDirectory, apiKey, apiSecret, encryptedVariables)
        VALUES (1, 'repo-name', 'owner', 1, 'main', 'uuid', ${githubProjectConfigId}, 'dist', 'key', 'secret','variables')`,
      );

      const lastInsertId = await stage.db.paramExecute(
        `SELECT LAST_INSERT_ID() as id`,
      );

      const deploymentConfigId = lastInsertId[0].id;

      const response =
        await frontendController.getEnvironmentVariables(deploymentConfigId);

      expect(response).toBeDefined();
      expect(response.length).toBe(1);
    });
  });
});

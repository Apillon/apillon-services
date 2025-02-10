import {
  CreateDeploymentConfigDto,
  DefaultUserRole,
  DeploymentBuildQueryFilter,
  DeploymentBuildStatus,
  GithubLinkDto,
  SqlModelStatus,
} from '@apillon/lib';
import { Stage, releaseStage, setupTest } from '../../../../test/setup';
import { DeployService } from '../deploy.service';
import { DbTables } from '../../../config/types';

const expectedProjectConfig = {
  accessToken: 'access_token',
  refreshToken: 'refresh_token',
  id: 123,
  login: 'apillon_user',
  projectUuid: 'uuid',
};

const expectedCreatedWebhook = {
  id: 1,
};

jest.mock('../../../lib/github', () => ({
  getTokens: jest.fn(),
  getUser: jest.fn(),
  deleteWebhook: jest.fn(),
  getRepos: jest.fn(),
  createWebhook: jest.fn(),
}));

describe('DeployService tests', () => {
  let stage: Stage;
  beforeAll(async () => {
    const {
      getTokens,
      getUser,
      getRepos,
      createWebhook,
    } = require('../../../lib/github');
    getTokens.mockResolvedValue({
      access_token: expectedProjectConfig.accessToken,
      refresh_token: expectedProjectConfig.refreshToken,
    });
    getUser.mockResolvedValue({
      id: expectedProjectConfig.id,
      login: expectedProjectConfig.login,
    });
    getRepos.mockResolvedValue([]);
    createWebhook.mockResolvedValue(expectedCreatedWebhook);

    stage = await setupTest();
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
      const response = await DeployService.linkGithub(
        { body: dto },
        stage.context,
      );
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

      expect(
        DeployService.linkGithub({ body: dto }, stage.context),
      ).rejects.toThrow();
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
      await DeployService.unlinkGithub({ body: dto }, stage.context);

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
      await stage.db.paramExecute(`DELETE FROM ${DbTables.DEPLOYMENT_CONFIG}`);

      await stage.db.paramExecute(
        `DELETE FROM ${DbTables.GITHUB_PROJECT_CONFIG}`,
      );

      await stage.db.paramExecute(`DELETE FROM ${DbTables.WEBSITE}`);

      await stage.db.paramExecute(`DELETE FROM ${DbTables.BUCKET}`);
    });

    test('User can create new deployment config', async () => {
      await stage.db.paramExecute(
        `INSERT INTO ${DbTables.BUCKET} (id,bucket_uuid, project_uuid, bucketType, name)
        VALUES (1, 'uuid', 'uuid', 1, 'name')`,
      );

      await stage.db.paramExecute(
        `INSERT INTO ${DbTables.WEBSITE} (website_uuid, project_uuid,bucket_id,stagingBucket_id,productionBucket_id,name, status)
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
        websiteUuid: 'uuid',
        project_uuid: 'uuid',
      } as Partial<CreateDeploymentConfigDto>;

      const response = await DeployService.createDeploymentConfig(
        {
          body: new CreateDeploymentConfigDto({}, stage.context).populate(
            newConfigData,
          ),
        },
        stage.context,
      );

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
      const response = await DeployService.getDeploymentConfigByRepoId(
        { repoId: testConfig.repoId },
        stage.context,
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
        VALUES ('${expectedProjectConfig.projectUuid}', '${expectedProjectConfig.accessToken}', '${expectedProjectConfig.refreshToken}', '${expectedProjectConfig.login}')`,
      );

      const response = await DeployService.getProjectConfigByProjectUuid(
        { project_uuid: expectedProjectConfig.projectUuid },
        stage.context,
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
      const response = await DeployService.listRepos(
        { projectUuid: expectedProjectConfig.projectUuid },
        stage.context,
      );
      expect(response).toBeDefined();
    });
  });

  describe('listDeploymentBuildsForWebsite', () => {
    afterEach(async () => {
      await stage.db.paramExecute(`DELETE FROM ${DbTables.DEPLOYMENT_BUILD}`);

      await stage.db.paramExecute(`DELETE FROM ${DbTables.DEPLOYMENT_CONFIG}`);

      await stage.db.paramExecute(`DELETE FROM ${DbTables.WEBSITE}`);
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
      await stage.db.paramExecute(
        `INSERT INTO ${DbTables.BUCKET} (id,bucket_uuid, project_uuid, bucketType, name)
        VALUES (1, 'uuid', 'uuid', 1, 'name')`,
      );

      await stage.db.paramExecute(
        `INSERT INTO ${DbTables.WEBSITE} (website_uuid, project_uuid,bucket_id,stagingBucket_id,productionBucket_id,name, status)
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
      const response = await DeployService.listDeploymentBuildsForWebsite(
        { filter },
        stage.context,
      );
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
});

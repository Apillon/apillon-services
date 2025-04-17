import { Lmas, LogType, env } from '@apillon/lib';
import axios, { AxiosInstance } from 'axios';
import { GithubProjectConfig } from '../models/github-project-config.model';
import { DeployCodeException } from '../../../lib/exceptions';
import { DeployErrorCode } from '../../../config/types';

export class GithubService {
  client: AxiosInstance;
  constructor() {
    this.client = axios.create({
      baseURL: 'https://api.github.com',
    });
  }

  authorizedClient(accessToken: string) {
    this.client.defaults.headers.common['Authorization'] =
      `token ${accessToken}`;

    return this.client;
  }

  async getRepos(projectConfig: GithubProjectConfig) {
    try {
      return await this.getReposRequest(projectConfig.access_token);
    } catch (e) {
      if (e.response?.status === 401) {
        const accessToken = await this.refreshAccessToken(projectConfig);

        return await this.getReposRequest(accessToken);
      }

      throw e;
    }
  }

  async forkRepo(
    projectConfig: GithubProjectConfig,
    repoName: string,
    repoOwnerName: string,
    newRepoName: string,
  ) {
    try {
      return await this.forkRepoRequest(
        repoOwnerName,
        projectConfig.access_token,
        repoName,
        newRepoName,
      );
    } catch (e) {
      if (e.response?.status === 401) {
        const accessToken = await this.refreshAccessToken(projectConfig);
        return await this.forkRepoRequest(
          repoOwnerName,
          accessToken,
          repoName,
          newRepoName,
        );
      }

      throw e;
    }
  }

  private async getReposRequest(accessToken: string) {
    const { data } = await this.authorizedClient(accessToken).get<
      {
        id: number;
        name: string;
        clone_url: string;
      }[]
    >('/user/repos', {
      params: {
        sort: 'pushed',
        per_page: 100,
        affiliation: 'owner',
      },
    });

    return data;
  }

  async refreshAccessToken(projectConfig: GithubProjectConfig) {
    const {
      data: { refresh_token, access_token },
    } = await axios.post<{
      access_token: string;
      refresh_token?: string;
    }>('https://github.com/login/oauth/access_token', undefined, {
      params: {
        client_id: env.GITHUB_AUTH_CLIENT_ID,
        client_secret: env.GITHUB_AUTH_CLIENT_SECRET,
        grant_type: 'refresh_token',
        refresh_token: projectConfig.refresh_token,
      },
    });

    if (refresh_token) {
      projectConfig.refresh_token = refresh_token;
    }

    projectConfig.access_token = access_token;
    await projectConfig.update();

    return access_token;
  }

  async deleteAppRequest(accessToken: string) {
    const clientId = env.GITHUB_AUTH_CLIENT_ID;
    const clientSecret = env.GITHUB_AUTH_CLIENT_SECRET;

    return await axios.delete(
      `https://api.github.com/applications/${clientId}/grant`,
      {
        headers: {
          Accept: 'application/vnd.github+json',
        },
        auth: {
          username: clientId,
          password: clientSecret,
        },
        data: {
          access_token: accessToken,
        },
      },
    );
  }

  async deleteWebhook(
    projectConfig: GithubProjectConfig,
    repoOwnerName: string,
    repoName: string,
    hookId: number,
  ) {
    try {
      await this.deleteWebhookRequest(
        repoOwnerName,
        repoName,
        hookId,
        projectConfig.access_token,
      );
    } catch (e) {
      if (e.response?.status === 401) {
        const accessToken = await this.refreshAccessToken(projectConfig);
        await this.deleteWebhookRequest(
          repoOwnerName,
          repoName,
          hookId,
          accessToken,
        );
      } else {
        await new Lmas().writeLog({
          logType: LogType.ERROR,
          message: 'Failed to delete webhook',
          location: 'deleteWebhook',
          data: e,
        });
        throw new DeployCodeException({
          status: 400,
          code: DeployErrorCode.GITHUB_WEBHOOK_DELETION_FAILED,
        });
      }
    }
  }

  private async deleteWebhookRequest(
    repoOwnerName: string,
    repoName: string,
    hookId: number,
    accessToken: string,
  ) {
    await this.authorizedClient(accessToken).delete(
      `/repos/${repoOwnerName}/${repoName}/hooks/${hookId}`,
    );
  }

  // Note: If user already has a fork of the repo, this will return the existing fork
  private async forkRepoRequest(
    repoOwnerName: string,
    accessToken: string,
    repoName: string,
    newRepoName: string,
  ) {
    return await this.authorizedClient(accessToken).post<{
      id: number;
      clone_url: string;
      name: string;
      owner: {
        login: string;
      };
      default_branch: string;
    }>(`/repos/${repoOwnerName}/${repoName}/forks`, {
      name: newRepoName,
      default_branch_only: true,
    });
  }

  private async createWebhookRequest(
    projectConfig: GithubProjectConfig,
    repoName: string,
    accessToken: string,
  ) {
    return await this.authorizedClient(accessToken).post<{
      id: number;
    }>(`/repos/${projectConfig.username}/${repoName}/hooks`, {
      name: 'web',
      events: ['push'],
      active: true,
      config: {
        url: `${env.CONSOLE_API_URL}/deploy/webhook`,
        secret: env.GITHUB_WEBHOOK_SECRET,
        content_type: 'json',
      },
    });
  }

  async createWebhook(projectConfig: GithubProjectConfig, repoName: string) {
    try {
      return (
        await this.createWebhookRequest(
          projectConfig,
          repoName,
          projectConfig.access_token,
        )
      ).data;
    } catch (e) {
      if (e.response?.status === 401) {
        const accessToken = await this.refreshAccessToken(projectConfig);
        return (
          await this.createWebhookRequest(projectConfig, repoName, accessToken)
        ).data;
      } else {
        await new Lmas().writeLog({
          logType: LogType.ERROR,
          message: 'Failed to create webhook',
          location: 'createWebhook',
          data: e,
        });
        throw new DeployCodeException({
          status: 400,
          code: DeployErrorCode.GITHUB_WEBHOOK_CREATION_FAILED,
        });
      }
    }
  }

  async getUser(token: string) {
    try {
      const { data } = await this.authorizedClient(token).get<{
        id: number;
        login: string;
      }>('/user');
      return data;
    } catch (e) {
      await new Lmas().writeLog({
        logType: LogType.ERROR,
        message: 'Failed to get user from Github',
        location: 'getUser',
        data: e,
      });
      throw new DeployCodeException({
        status: 400,
        code: DeployErrorCode.GITHUB_USER_FETCHING_FAILED,
      });
    }
  }

  async getTokens(code: string) {
    try {
      const { data } = await axios.post<{
        access_token: string;
        refresh_token?: string;
        scope: string;
      }>(
        `https://github.com/login/oauth/access_token?client_id=${env.GITHUB_AUTH_CLIENT_ID}&client_secret=${env.GITHUB_AUTH_CLIENT_SECRET}&code=${code}`,
        {},
        {
          headers: {
            Accept: 'application/json',
          },
        },
      );
      return data;
    } catch (e) {
      await new Lmas().writeLog({
        logType: LogType.ERROR,
        message: 'Failed to get tokens from Github',
        location: 'getTokens',
        data: e,
      });
      throw new DeployCodeException({
        status: 400,
        code: DeployErrorCode.GITHUB_TOKEN_FETCHING_FAILED,
      });
    }
  }
}

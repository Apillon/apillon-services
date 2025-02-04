import axios from 'axios';
import { GithubProjectConfig } from '../modules/deploy/models/github-project-config.model';
import { Lmas, LogType, env } from '@apillon/lib';
import { StorageCodeException } from './exceptions';
import { StorageErrorCode } from '../config/types';

export async function getRepos(projectConfig: GithubProjectConfig) {
  try {
    return await getReposRequest(projectConfig.access_token);
  } catch (e) {
    if (e.response?.status === 401) {
      const accessToken = await refreshAccessToken(projectConfig);

      return await getReposRequest(accessToken);
    }

    throw e;
  }
}

export async function createWebhook(
  projectConfig: GithubProjectConfig,
  repoName: string,
) {
  try {
    return (
      await createWebhookRequest(
        projectConfig,
        repoName,
        projectConfig.access_token,
      )
    ).data;
  } catch (e) {
    if (e.response?.status === 401) {
      const accessToken = await refreshAccessToken(projectConfig);
      return (await createWebhookRequest(projectConfig, repoName, accessToken))
        .data;
    } else {
      await new Lmas().writeLog({
        logType: LogType.ERROR,
        message: 'Failed to create webhook',
        location: 'createWebhook',
        data: e,
      });
      throw new StorageCodeException({
        status: 400,
        code: StorageErrorCode.GITHUB_WEBHOOK_CREATION_FAILED,
      });
    }
  }
}

export async function deleteWebhook(
  projectConfig: GithubProjectConfig,
  repoOwnerName: string,
  repoName: string,
  hookId: number,
) {
  try {
    await deleteWebhookRequest(
      repoOwnerName,
      repoName,
      hookId,
      projectConfig.access_token,
    );
  } catch (e) {
    if (e.response?.status === 401) {
      const accessToken = await refreshAccessToken(projectConfig);
      await deleteWebhookRequest(repoOwnerName, repoName, hookId, accessToken);
    } else {
      await new Lmas().writeLog({
        logType: LogType.ERROR,
        message: 'Failed to delete webhook',
        location: 'deleteWebhook',
        data: e,
      });
      throw new StorageCodeException({
        status: 400,
        code: StorageErrorCode.GITHUB_WEBHOOK_DELETION_FAILED,
      });
    }
  }
}

export async function getTokens(code: string) {
  try {
    const res = await axios.post<{
      access_token: string;
      refresh_token: string;
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
    return res.data;
  } catch (e) {
    await new Lmas().writeLog({
      logType: LogType.ERROR,
      message: 'Failed to get tokens from Github',
      location: 'getTokens',
      data: e,
    });
    throw new StorageCodeException({
      status: 400,
      code: StorageErrorCode.GITHUB_TOKEN_FETCHING_FAILED,
    });
  }
}

export async function getUser(token: string) {
  try {
    const res = await axios.get<{
      id: number;
      login: string;
    }>('https://api.github.com/user', {
      headers: {
        Authorization: `token ${token}`,
      },
    });
    return res.data;
  } catch (e) {
    await new Lmas().writeLog({
      logType: LogType.ERROR,
      message: 'Failed to get user from Github',
      location: 'getUser',
      data: e,
    });
    throw new StorageCodeException({
      status: 400,
      code: StorageErrorCode.GITHUB_USER_FETCHING_FAILED,
    });
  }
}

async function createWebhookRequest(
  projectConfig: GithubProjectConfig,
  repoName: string,
  accessToken: string,
) {
  return await axios.post<{
    id: string;
  }>(
    `https://api.github.com/repos/${projectConfig.username}/${repoName}/hooks`,
    {
      name: 'web',
      events: ['push'],
      active: true,
      config: {
        url: `${env.CONSOLE_API_URL}/deploy/webhook`,
        secret: env.GITHUB_WEBHOOK_SECRET,
      },
    },
    {
      headers: {
        Authorization: `token ${accessToken}`,
      },
    },
  );
}

async function deleteWebhookRequest(
  repoOwnerName: string,
  repoName: string,
  hookId: number,
  accessToken: string,
) {
  await axios.delete(
    `https://api.github.com/repos/${repoOwnerName}/${repoName}/hooks/${hookId}`,
    {
      headers: {
        Authorization: `token ${accessToken}`,
      },
    },
  );
}

export async function refreshAccessToken(projectConfig: GithubProjectConfig) {
  const refreshData = await axios.post<{
    access_token: string;
  }>('https://github.com/login/oauth/access_token', undefined, {
    params: {
      client_id: env.GITHUB_AUTH_CLIENT_ID,
      client_secret: env.GITHUB_AUTH_CLIENT_SECRET,
      grant_type: 'refresh_token',
      refresh_token: projectConfig.refresh_token,
    },
  });

  projectConfig.access_token = refreshData.data.access_token;
  await projectConfig.update();

  return refreshData.data.access_token;
}

async function getReposRequest(accessToken: string) {
  const repos = await axios.get<
    {
      id: number;
      name: string;
      clone_url: string;
    }[]
  >('https://api.github.com/user/repos', {
    headers: {
      Authorization: `token ${accessToken}`,
    },
  });

  return repos.data;
}

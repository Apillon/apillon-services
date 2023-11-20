import { DomainQueryFilter, SqlModelStatus, env } from '@apillon/lib';
import { Injectable } from '@nestjs/common';
import { ApillonApiContext } from '../../context';
import { getConsoleApiMysql } from '../../lib/mysql-utils';
import { StorageMicroservice } from '@apillon/lib';

@Injectable()
export class SystemService {
  /**
   * Return uuids of projects, that are currently blocked on apillon ipfs gateway
   * @param context
   * @returns
   */
  async getProjectsBlockedOnIpfs(
    context: ApillonApiContext,
    query: DomainQueryFilter,
  ) {
    let blockedProjects = [];
    //Get blocked projects
    const mysql = getConsoleApiMysql();
    try {
      await mysql.connect();

      blockedProjects = await mysql.paramExecute(
        `
        SELECT project_uuid, status
        FROM \`project\`
        WHERE status = ${SqlModelStatus.BLOCKED}
      `,
        {},
      );
      await mysql.close();
    } catch (e) {
      console.error(e);
      throw e;
    }

    //Get projects that have reached bandwidth quota
    const projectsOverBandwidthQouta = (
      await new StorageMicroservice(context).getProjectsOverBandwidthQuota(
        query,
      )
    ).data;

    projectsOverBandwidthQouta.forEach((projectOverQuota) => {
      blockedProjects.push({ project_uuid: projectOverQuota, status: 10 });
    });

    return blockedProjects;
  }
}

/*
https://docs.nestjs.com/providers#services
*/

import {
  BaseQueryFilter,
  BucketQueryFilter,
  FilesQueryFilter,
  NFTCollectionQueryFilter,
  NftsMicroservice,
  SqlModelStatus,
  StorageMicroservice,
  WebsiteQueryFilter,
} from '@apillon/lib';
import { Injectable } from '@nestjs/common';
import { DevConsoleApiContext } from '../../context';
import { User } from '../user/models/user.model';
import { Project } from '../project/models/project.model';
import { ProjectsQueryFilter } from './project/dtos/projects-query-filter.dto';

@Injectable()
export class AdminPanelService {
  async generalSearch(context: DevConsoleApiContext, query: BaseQueryFilter) {
    //Search files (uuid & CID)
    const files = (
      await new StorageMicroservice(context).listFiles(
        new FilesQueryFilter({
          ...query,
          status: SqlModelStatus.ACTIVE,
        }),
      )
    ).data;

    //Search buckets
    const buckets = (
      await new StorageMicroservice(context).listBuckets(
        new BucketQueryFilter(query),
      )
    ).data;
    //Search websites
    const websites = (
      await new StorageMicroservice(context).listWebsites(
        new WebsiteQueryFilter(query),
      )
    ).data;
    //Search collections
    const collections = (
      await new NftsMicroservice(context).listNftCollections(
        new NFTCollectionQueryFilter(query),
      )
    ).data;
    //Search users (email & uuid)
    const users = await new User({}, context).listUsers(query);

    //Search projects
    const projects = await new Project({}, context).listProjects(
      context,
      new ProjectsQueryFilter(query),
    );

    return {
      files: files.items,
      buckets: buckets.items,
      websites: websites.items,
      collections: collections.items,
      users: users,
      projects: projects,
    };
  }
}

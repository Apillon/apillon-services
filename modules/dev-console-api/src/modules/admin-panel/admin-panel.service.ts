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
    const filesQuery: FilesQueryFilter = new FilesQueryFilter({
      ...query,
      status: SqlModelStatus.ACTIVE,
    });

    const files = (await new StorageMicroservice(context).listFiles(filesQuery))
      .data;

    //Search buckets
    const bucketQuery: BucketQueryFilter = new BucketQueryFilter(query);
    const buckets = (
      await new StorageMicroservice(context).listBuckets(bucketQuery)
    ).data;
    //Search websites
    const websiteQuery: WebsiteQueryFilter = new WebsiteQueryFilter(query);
    const websites = (
      await new StorageMicroservice(context).listWebsites(websiteQuery)
    ).data;
    //Search collections
    const collectionQuery: NFTCollectionQueryFilter =
      new NFTCollectionQueryFilter(query);
    const collections = (
      await new NftsMicroservice(context).listNftCollections(collectionQuery)
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

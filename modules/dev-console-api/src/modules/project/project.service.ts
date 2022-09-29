import { HttpStatus, Injectable } from '@nestjs/common';
import { CodeException, Ctx, ValidationException } from 'at-lib';
import {
  ResourceNotFoundErrorCode,
  ValidatorErrorCode,
} from '../../config/types';
import { DevConsoleApiContext } from '../../context';
import { FileService } from '../file/file.service';
import { File } from '../file/models/file.model';
import { Project } from './models/project.model';

@Injectable()
export class ProjectService {
  constructor(private readonly fileService: FileService) {}

  async createProject(
    context: DevConsoleApiContext,
    body: Project,
  ): Promise<Project> {
    return await body.insert();
  }

  async updateProject(
    context: DevConsoleApiContext,
    id: number,
    data: any,
  ): Promise<Project> {
    const project: Project = await new Project({}, context).populateById(id);
    if (!project.exists()) {
      throw new CodeException({
        code: ResourceNotFoundErrorCode.PROJECT_DOES_NOT_EXISTS,
        status: HttpStatus.NOT_FOUND,
        errorCodes: ResourceNotFoundErrorCode,
      });
    }

    project.populate(data);

    try {
      await project.validate();
    } catch (err) {
      await project.handle(err);
      if (!project.isValid())
        throw new ValidationException(project, ValidatorErrorCode);
    }

    await project.update();
    return project;
  }

  async getUserProjects(@Ctx() context: DevConsoleApiContext) {
    return await new Project({}).getUserProjects(context);
  }

  async updateProjectImage(
    @Ctx() context: DevConsoleApiContext,
    project_id: number,
    uploadedFile: File,
  ) {
    const project = await new Project({}, context).populateById(project_id);
    if (!project.exists()) {
      throw new CodeException({
        code: ResourceNotFoundErrorCode.PROJECT_DOES_NOT_EXISTS,
        status: HttpStatus.NOT_FOUND,
        errorCodes: ResourceNotFoundErrorCode,
      });
    }
    const createdFile = await this.fileService.createFile(
      context,
      uploadedFile,
    );

    const existingProjectImageID = project.imageFile_id;
    project.imageFile_id = createdFile.id;
    await project.update();

    if (existingProjectImageID) {
      await this.fileService.deleteFileById(context, existingProjectImageID);
    }

    return createdFile;
  }
}

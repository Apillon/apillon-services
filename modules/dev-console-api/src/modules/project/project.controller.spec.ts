import { Test, TestingModule } from '@nestjs/testing';
import { env, MySql } from 'at-lib';
import { DevConsoleApiContext } from '../../context';
import { Project } from './models/project.model';
import { ProjectController } from './project.controller';
import { ProjectService } from './project.service';

describe('ProjectController', () => {
  let controller: ProjectController;
  const context: DevConsoleApiContext = new DevConsoleApiContext();

  beforeAll(async () => {
    try {
      const mysql = new MySql({
        host: env.AT_DEV_CONSOLE_API_MYSQL_HOST,
        database: env.AT_DEV_CONSOLE_API_DB,
        password: env.AT_DEV_CONSOLE_API_MYSQL_PASSWORD,
        port: env.AT_DEV_CONSOLE_API_MYSQL_PORT,
        user: env.AT_DEV_CONSOLE_API_MYSQL_USER,
      });
      await mysql.connect();

      context.mysql = mysql;
      await context.authenticate(undefined);
    } catch (e) {
      console.error(e);
      throw e;
    }

    const app: TestingModule = await Test.createTestingModule({
      controllers: [ProjectController],
      providers: [ProjectService],
    }).compile();

    controller = app.get<ProjectController>(ProjectController);
  });

  afterAll(async () => {
    await context.mysql.close();
  });

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  beforeEach(async () => {});

  describe('POST root', () => {
    let createdProject: Project;
    it('should create new Project & return it as response', async () => {
      const body: Project = new Project({}, context).fake();
      createdProject = await controller.createProject(context, body);
      expect(createdProject.id).not.toBeNull();
    });

    it('should update existing Project & return it as response', async () => {
      const body = { shortDescription: 'Ma tole je nek test' };
      const res = await controller.updateProject(
        context,
        createdProject.id,
        body,
      );
      expect(res.id).toBe(createdProject.id);
      expect(res.shortDescription).toBe('Ma tole je nek test');
    });
  });
});

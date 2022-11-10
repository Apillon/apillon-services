import { Test, TestingModule } from '@nestjs/testing';
import { ApillonApiContext } from '../../context';
import { StorageController } from './storage.controller';
import { StorageService } from './storage.service';

describe('StorageController', () => {
  let controller: StorageController;
  const context: ApillonApiContext = new ApillonApiContext();

  beforeAll(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [StorageController],
      providers: [StorageService],
    }).compile();

    controller = app.get<StorageController>(StorageController);
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { globSource } from 'ipfs-http-client';
import { ApillonApiContext } from '../../context';
import { UploadFilesToIPFSDto } from './dtos/upload-files-to-IPFS';
import { StorageController } from './storage.controller';
import { StorageService } from './storage.service';
import { fstat, read, readFileSync, createReadStream } from 'fs';
import { UploadFileToIPFSDto } from './dtos/upload-file-to-IPFS.dto';

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

  afterAll(async () => {
    //await context.mysql.close();
  });

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  beforeEach(async () => {});

  describe('POST root', () => {
    it('should upload files to IPFS & return success', async () => {
      const fileContent = readFileSync('test.txt', { encoding: 'base64' });

      console.info('fileContentLength:', fileContent.length);

      //console.info('fileContent', fileContent);

      const filesToUpload: UploadFilesToIPFSDto = new UploadFilesToIPFSDto();
      filesToUpload.files = [
        new UploadFileToIPFSDto().populate({
          path: 'test.txt',
          content: fileContent,
        }),
      ];

      //console.info('param', filesToUpload, filesToUpload.files);
      const res = await controller.uploadFilesToIPFS(context, filesToUpload);

      //await controller.test();
    });
  });
});

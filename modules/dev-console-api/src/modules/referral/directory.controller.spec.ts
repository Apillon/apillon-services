import { Test, TestingModule } from '@nestjs/testing';
import { ReferralController } from './referral.controller';

describe('DirectoryController', () => {
  let controller: ReferralController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReferralController],
    }).compile();

    controller = module.get<ReferralController>(ReferralController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});

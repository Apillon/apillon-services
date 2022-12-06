import { releaseStage, setupTest, Stage } from '../../../test/setup';
import { v4 as uuid } from 'uuid';
import { QuotaService } from './quota.service';
import { GetQuotaDto } from '@apillon/lib';

describe('Quota unit test', () => {
  let stage: Stage;

  const project1_uuid = uuid();
  const project2_uuid = uuid();

  let defaultQuotas;

  beforeAll(async () => {
    stage = await setupTest();

    // get defaults
    defaultQuotas = await stage.db.paramExecute(`SELECT * FROM quota`);

    // setup subscription packages
    await stage.db.paramExecute(`
    INSERT INTO subscriptionPackage (id, status, name, description, isDefault)
    VALUES 
      (1, 5, 'Freemium', 'Free subscription package', 1),
      (2, 5, 'Basic', 'Basic subscription package', 0),
      (3, 5, 'Extra', 'Super subscription package', 0)
    `);
  });

  afterAll(async () => {
    await releaseStage(stage);
  });

  test('Should get default quotas project', async () => {
    const input = new GetQuotaDto({
      quota_id: 1,
      project_uuid: project1_uuid,
    });

    const quota = await QuotaService.getQuota(input, stage.context);

    expect(quota.value).toBe(
      defaultQuotas.find((x) => x.id === input.quota_id).value,
    );
  });
});

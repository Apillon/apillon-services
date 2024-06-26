import { releaseStage, setupTest, Stage } from '../../../test/setup';
import { v4 as uuid } from 'uuid';
import { QuotaService } from './quota.service';
import { getFaker, GetQuotaDto, QuotaCode } from '@apillon/lib';

describe('Quota unit test', () => {
  let stage: Stage;

  const project1_uuid = uuid();
  const project2_uuid = uuid();
  const projectWithSubscription_uuid = uuid();
  const projectWithExpiredSubscription_uuid = uuid();
  const object1_uuid = uuid();
  const object2_uuid = uuid();

  let defaultQuotas;

  beforeAll(async () => {
    stage = await setupTest();

    // get defaults
    defaultQuotas = await stage.db.paramExecute(`SELECT * FROM quota`);

    // setup overrides
    await stage.db.paramExecute(`
    INSERT INTO override (status, quota_id, project_uuid,  object_uuid, package_id, value)
    VALUES
      (
        5,
        ${QuotaCode.MAX_PROJECT_COUNT},
        '${project2_uuid}',
        null,
        null,
        '${
          defaultQuotas.find((x) => x.id == QuotaCode.MAX_PROJECT_COUNT).value +
          10
        }'
      ),
      (
        5,
        ${QuotaCode.MAX_BUCKET_SIZE},
        '${project1_uuid}',
        '${object2_uuid}',
        null,
        '${
          defaultQuotas.find((x) => x.id == QuotaCode.MAX_BUCKET_SIZE).value +
          11
        }'
      )
    `);

    // setup subscription overrides
    let insertValues = '';
    for (const q of defaultQuotas) {
      if (insertValues) {
        insertValues += ',';
      }
      insertValues += `
    (
      5,
      ${q.id},
      2,
      '${defaultQuotas.find((x) => x.id == q.id).value + 20}'
    ),
    (
      5,
      ${q.id},
      3,
      '${defaultQuotas.find((x) => x.id == q.id).value + 30}'
    )
    `;
    }

    await stage.db.paramExecute(`
      INSERT INTO override (status, quota_id, package_id, value)
      VALUES ${insertValues}
    `);

    await stage.db.paramExecute(`
      INSERT INTO subscription (package_id, status, project_uuid, subscriberEmail, stripeId)
      VALUES (2, 5, '${projectWithSubscription_uuid}', '${getFaker().internet.email()}', '${uuid()}')
    `);

    await stage.db.paramExecute(`
      INSERT INTO subscription (package_id, status, project_uuid, expiresOn, subscriberEmail, stripeId)
      VALUES (2, 5, '${projectWithExpiredSubscription_uuid}', DATE_ADD(NOW(), INTERVAL -1 DAY), '${getFaker().internet.email()}', '${uuid()}')
    `);
  });

  afterAll(async () => {
    await releaseStage(stage);
  });

  test('Should get default quota for project', async () => {
    const input = new GetQuotaDto({
      quota_id: QuotaCode.MAX_PROJECT_COUNT,
      project_uuid: project1_uuid,
    });

    const quota = await QuotaService.getQuota(input, stage.context);

    expect(quota.value).toBe(
      defaultQuotas.find((x) => x.id == input.quota_id).value,
    );
  });

  test('Should get override quota for specific project', async () => {
    const input = new GetQuotaDto({
      quota_id: QuotaCode.MAX_PROJECT_COUNT,
      project_uuid: project2_uuid,
    });

    const quota = await QuotaService.getQuota(input, stage.context);

    expect(quota.value).toBe(
      defaultQuotas.find((x) => x.id == input.quota_id).value + 10,
    );
  });

  test('Should get default quota for specific object', async () => {
    const input = new GetQuotaDto({
      quota_id: QuotaCode.MAX_BUCKET_SIZE,
      project_uuid: project1_uuid,
      object_uuid: object1_uuid,
    });

    const quota = await QuotaService.getQuota(input, stage.context);

    expect(quota.value).toBe(
      defaultQuotas.find((x) => x.id == input.quota_id).value,
    );
  });

  test('Should get override quota for specific object', async () => {
    const input = new GetQuotaDto({
      quota_id: QuotaCode.MAX_BUCKET_SIZE,
      project_uuid: project1_uuid,
      object_uuid: object2_uuid,
    });

    const quota = await QuotaService.getQuota(input, stage.context);

    expect(quota.value).toBe(
      defaultQuotas.find((x) => x.id == input.quota_id).value + 11,
    );
  });

  test('Should get override quota for project with valid subscription', async () => {
    const input = new GetQuotaDto({
      quota_id: QuotaCode.MAX_API_KEYS,
      project_uuid: projectWithSubscription_uuid,
    });

    const quota = await QuotaService.getQuota(input, stage.context);

    expect(quota.value).toBe(
      defaultQuotas.find((x) => x.id == input.quota_id).value + 20,
    );
  });

  test('Should get default quota for project with expired subscription', async () => {
    const input = new GetQuotaDto({
      quota_id: QuotaCode.MAX_HOSTING_BUCKETS,
      project_uuid: projectWithExpiredSubscription_uuid,
    });

    const quota = await QuotaService.getQuota(input, stage.context);

    expect(quota.value).toBe(
      defaultQuotas.find((x) => x.id == input.quota_id).value,
    );
  });
});

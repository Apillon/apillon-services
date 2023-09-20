import { v4 as uuid } from 'uuid';
import { releaseStage, setupTest, Stage } from '../../../test/setup';
import { CreditService } from './credit.service';
import { Credit } from './models/credit.model';
import { AddCreditDto, Products, SpendCreditDto } from '@apillon/lib';
import { Product } from './models/product.model';

describe('Quota unit test', () => {
  let stage: Stage;

  const project1_uuid = uuid();
  const project2_uuid = uuid();
  let project2Credit: Credit;

  /**
   * TODO: Write tests
   * - different types of value (1-max, 2-min, 3-boolean)
   **/

  beforeAll(async () => {
    stage = await setupTest();

    project2Credit = new Credit(
      {
        project_uuid: project2_uuid,
        balance: 500,
      },
      stage.context,
    );

    await project2Credit.insert();
  });

  afterAll(async () => {
    await releaseStage(stage);
  });

  describe('Add credit tests', () => {
    test('Test AddCredit function for project without existing credit record', async () => {
      const data = new AddCreditDto({
        project_uuid: project1_uuid,
        amount: 1000,
        referenceTable: 'invoice',
        referenceId: 1,
      });

      await CreditService.addCredit({ body: data }, stage.context);

      const projectCredit: Credit = await new Credit(
        {},
        stage.context,
      ).populateByUUID(project1_uuid);

      expect(projectCredit.exists()).toBeTruthy();
      expect(projectCredit.balance).toBe(1000);
    });

    test('Test AddCredit function for project with existing credit record', async () => {
      const data = new AddCreditDto({
        project_uuid: project2_uuid,
        amount: 1000,
        referenceTable: 'invoice',
        referenceId: 1,
      });

      await CreditService.addCredit({ body: data }, stage.context);

      const projectCredit: Credit = await new Credit(
        {},
        stage.context,
      ).populateByUUID(project2_uuid);

      expect(projectCredit.exists()).toBeTruthy();
      expect(projectCredit.balance).toBe(1500);
    });

    test('AddCredit should add record to creditTransaction table. Sum of amounts should match credit balance.', async () => {
      //TODO
    });
  });
  describe('Spend credit tests', () => {
    test('Test successful spend credit', async () => {
      const product: Product = await new Product(
        {},
        stage.context,
      ).populateById(Products.WEBSITE);
      await product.populateCurrentPrice();

      const data = new SpendCreditDto({
        project_uuid: project1_uuid,
        product_id: Products.WEBSITE,
        referenceTable: 'website',
        referenceId: 'uuid1',
      });

      await CreditService.spendCredit({ body: data }, stage.context);

      const projectCredit: Credit = await new Credit(
        {},
        stage.context,
      ).populateByUUID(project1_uuid);

      expect(projectCredit?.balance).toBe(1000 - product.currentPrice);
    });
  });
});

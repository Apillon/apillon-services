import { v4 as uuid } from 'uuid';
import { releaseStage, setupTest, Stage } from '../../../test/setup';
import { CreditService } from './credit.service';
import { Credit } from './models/credit.model';
import { AddCreditDto, ProductCode, SpendCreditDto } from '@apillon/lib';
import { Product } from '../product/models/product.model';
import { CreditTransaction } from './models/credit-transaction.model';
import { ScsCodeException } from '../../lib/exceptions';

describe('Credits unit test', () => {
  let stage: Stage;

  const project1_uuid = uuid();
  const project2_uuid = uuid();
  const project3_uuid = uuid();
  let project1Balance = 0;
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

      project1Balance += 1000;
      await CreditService.addCredit({ body: data }, stage.context, null);

      const projectCredit: Credit = await new Credit(
        {},
        stage.context,
      ).populateByUUID(project1_uuid);

      expect(projectCredit.exists()).toBeTruthy();
      expect(projectCredit.balance).toBe(project1Balance);
    });

    test('Test AddCredit function for project with existing credit record', async () => {
      const data = new AddCreditDto({
        project_uuid: project2_uuid,
        amount: 1000,
        referenceTable: 'invoice',
        referenceId: 2,
      });

      await CreditService.addCredit({ body: data }, stage.context, null);

      const projectCredit: Credit = await new Credit(
        {},
        stage.context,
      ).populateByUUID(project2_uuid);

      expect(projectCredit.exists()).toBeTruthy();
      expect(projectCredit.balance).toBe(1500);
    });

    test('AddCredit should add record to creditTransaction table.', async () => {
      const data = new AddCreditDto({
        project_uuid: project1_uuid,
        amount: 1000,
        referenceTable: 'invoice',
        referenceId: 3,
      });

      project1Balance += 1000;
      await CreditService.addCredit({ body: data }, stage.context, null);

      const projectCredit: Credit = await new Credit(
        {},
        stage.context,
      ).populateByUUID(project1_uuid);

      expect(projectCredit.exists()).toBeTruthy();
      expect(projectCredit.balance).toBe(project1Balance);

      const creditTransaction: CreditTransaction = await new CreditTransaction(
        {},
        stage.context,
      ).populateByReference('invoice', '3');
      expect(creditTransaction.exists()).toBeTruthy();
      expect(creditTransaction.amount).toBe(1000);
      expect(creditTransaction.direction).toBe(1);
    });
  });
  describe('Spend/refund credit tests', () => {
    test('Test successful spend credit', async () => {
      const product: Product = await new Product(
        {},
        stage.context,
      ).populateById(ProductCode.HOSTING_WEBSITE);
      await product.populateCurrentPrice();

      const data = new SpendCreditDto({
        project_uuid: project1_uuid,
        product_id: ProductCode.HOSTING_WEBSITE,
        referenceTable: 'website',
        referenceId: '1',
        location: 'creditTest',
        service: 'TEST',
      });

      project1Balance -= product.currentPrice;
      await CreditService.spendCredit({ body: data }, stage.context);

      const projectCredit: Credit = await new Credit(
        {},
        stage.context,
      ).populateByUUID(project1_uuid);

      expect(projectCredit?.balance).toBe(project1Balance);

      //Check credit transaction
      const creditTransaction: CreditTransaction = await new CreditTransaction(
        {},
        stage.context,
      ).populateByReference('website', '1');
      expect(creditTransaction.exists()).toBeTruthy();
      expect(creditTransaction.amount).toBe(product.currentPrice);
      expect(creditTransaction.direction).toBe(2);
    });

    test('Test failed spend credit - balance too low', async () => {
      await new Credit(
        {
          project_uuid: project3_uuid,
          balance: 5,
        },
        stage.context,
      ).insert();

      const product: Product = await new Product(
        {},
        stage.context,
      ).populateById(ProductCode.HOSTING_WEBSITE);
      await product.populateCurrentPrice();

      const data = new SpendCreditDto({
        project_uuid: project3_uuid,
        product_id: ProductCode.HOSTING_WEBSITE,
        referenceTable: 'website',
        referenceId: '2',
        location: 'creditTest',
        service: 'TEST',
      });

      const fun = async () => {
        await CreditService.spendCredit({ body: data }, stage.context);
      };
      await expect(fun).rejects.toThrowError(ScsCodeException);

      //Balance should stay the same
      const projectCredit: Credit = await new Credit(
        {},
        stage.context,
      ).populateByUUID(project3_uuid);
      expect(projectCredit?.balance).toBe(5);
    });

    test('Test refund credit', async () => {
      const product: Product = await new Product(
        {},
        stage.context,
      ).populateById(ProductCode.HOSTING_WEBSITE);
      await product.populateCurrentPrice();
      project1Balance += product.currentPrice;

      await CreditService.refundCredit(
        { referenceId: '1', referenceTable: 'website' },
        stage.context,
      );

      const projectCredit: Credit = await new Credit(
        {},
        stage.context,
      ).populateByUUID(project1_uuid);

      expect(projectCredit?.balance).toBe(project1Balance);
    });
  });
});

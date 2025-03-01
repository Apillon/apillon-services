import { v4 as uuid } from 'uuid';
import { releaseStage, setupTest, Stage } from '../../../test/setup';
import { InvoiceService } from './invoice.service';
import {
  getFaker,
  InvoicesQueryFilter,
  UpdateSubscriptionDto,
} from '@apillon/lib';
import { SubscriptionPackage } from '../subscription/models/subscription-package.model';
import { CreditPackage } from '../credit/models/credit-package.model';
import { Credit } from '../credit/models/credit.model';
import { Subscription } from '../subscription/models/subscription.model';
import { DbTables } from '../../config/types';
import { SubscriptionService } from '../subscription/subscription.service';

describe('Invoice unit tests', () => {
  let stage: Stage;

  const project_uuid = uuid();
  let subscriptionPackage: SubscriptionPackage;
  let creditPackage: CreditPackage;
  let subscriptionStripeId: string;
  const clientEmail = getFaker().internet.email();

  beforeAll(async () => {
    stage = await setupTest();

    subscriptionPackage = new SubscriptionPackage({}, stage.context)
      .fake()
      .populate({
        creditAmount: 2000,
      });
    creditPackage = new CreditPackage({}, stage.context).fake().populate({
      creditAmount: 20000,
      bonusCredits: 2000,
    });

    await subscriptionPackage.insert();
    await creditPackage.insert();
  });

  afterAll(async () => {
    await releaseStage(stage);
  });

  describe('Handling stripe webhook data', () => {
    test('should handle credit purchase data', async () => {
      const event = {
        data: {
          package_id: creditPackage.id,
          isCreditPurchase: true,
          project_uuid,
          subtotalAmount: 20,
          totalAmount: 20,
          clientName: getFaker().internet.userName(),
          clientEmail,
          subscriberEmail: getFaker().internet.email(),
          currency: getFaker().finance.currencyCode(),
          invoiceStripeId: uuid(),
        },
      };

      const result = await InvoiceService.handlePaymentWebhookData(
        event,
        stage.context,
      );
      expect(result).toBeTruthy();

      // Check if project has received credits for new subscription
      const projectCredit = await new Credit({}, stage.context).populateByUUID(
        project_uuid,
      );

      expect(projectCredit.exists()).toBeTruthy();
      expect(projectCredit.balance).toBe(
        creditPackage.creditAmount + creditPackage.bonusCredits,
      );
    });

    test('should handle subscription create', async () => {
      const expiresOn = new Date();
      expiresOn.setDate(expiresOn.getDate() + 30); // Extend by 30 days
      const event = {
        data: {
          package_id: subscriptionPackage.id,
          isCreditPurchase: false,
          project_uuid,
          subtotalAmount: 49.99,
          totalAmount: 49.99,
          clientName: getFaker().internet.userName(),
          clientEmail,
          subscriberEmail: getFaker().internet.email(),
          currency: getFaker().finance.currencyCode(),
          expiresOn,
          stripeId: uuid(),
          invoiceStripeId: uuid(),
        },
      };

      const result = await InvoiceService.handlePaymentWebhookData(
        event,
        stage.context,
      );
      expect(result).toBeTruthy();

      // Check if project has an active subscription
      const activeSubscription = await new Subscription(
        {},
        stage.context,
      ).getActiveSubscription(project_uuid);

      expect(activeSubscription.exists()).toBeTruthy();
      expect(activeSubscription.project_uuid).toEqual(project_uuid);
      expect(activeSubscription.package_id).toEqual(subscriptionPackage.id);
      subscriptionStripeId = activeSubscription.stripeId;
    });

    test('should create new invoice on subscription update', async () => {
      const expiresOn = new Date();
      expiresOn.setDate(expiresOn.getDate() + 60); // Extend by another 30 days
      await SubscriptionService.updateSubscription(
        {
          updateSubscriptionDto: new UpdateSubscriptionDto({
            subscriptionStripeId,
            stripePackageId: subscriptionPackage.stripeId,
            expiresOn,
          }),
        },
        stage.context,
      );

      const invoices = await stage.db.paramExecute(
        `SELECT * FROM ${DbTables.INVOICE}`,
      );

      // One from credit purchase, one for sub. creation, one for sub. renewal
      expect(invoices.length).toEqual(3);
      expect(invoices[1].referenceTable).toEqual(invoices[2].referenceTable);
      expect(invoices[1].referenceId).toEqual(invoices[2].referenceId);
      expect(invoices[1].clientEmail).toEqual(invoices[2].clientEmail);
      expect(invoices[1].totalAmount).toEqual(invoices[2].totalAmount);
    });

    describe('Invoice listing', () => {
      test('should list invoices', async () => {
        const event = {
          query: new InvoicesQueryFilter({ project_uuid }, stage.context),
        };

        const invoices = await InvoiceService.listInvoices(
          event,
          stage.context,
        );
        expect(invoices?.items).toHaveLength(3);
        expect(invoices.items[0].referenceTable).toBe(DbTables.CREDIT_PACKAGE);
        // expect(+invoices.items[0].referenceId).toBe(creditPackage.id);
        expect(invoices.items[0].clientEmail).toBe(clientEmail);

        expect(invoices.items[1].referenceTable).toBe(DbTables.SUBSCRIPTION);
        // expect(+invoices.items[1].referenceId).toBe(subscriptionId);
        expect(invoices.items[1].clientEmail).toBe(clientEmail);
      });
    });
  });
});

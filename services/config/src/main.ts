import { ScsEventType } from '@apillon/lib';
import { ServiceContext } from '@apillon/service-lib';

import { QuotaService } from './modules/quota/quota.service';
import { TermsService } from './modules/terms/terms.service';
import { OverrideService } from './modules/override/override.service';
import { CreditService } from './modules/credit/credit.service';
import { SubscriptionService } from './modules/subscription/subscription.service';
import { InvoiceService } from './modules/invoice/invoice.service';
import { ProductService } from './modules/product/product.service';

/**
 * Processing lambda event with appropriate service function based on event name
 * @param event lambda event
 * @param context lambda context
 * @returns service response
 */
export async function processEvent(
  event,
  context: ServiceContext,
): Promise<any> {
  const processors = {
    [ScsEventType.GET_QUOTA]: QuotaService.getQuota,
    [ScsEventType.GET_ALL_QUOTAS]: QuotaService.getQuotas,
    [ScsEventType.CREATE_OVERRIDE]: OverrideService.createOverride,
    [ScsEventType.DELETE_OVERRIDE]: OverrideService.deleteOverride,

    [ScsEventType.GET_ACTIVE_TERMS]: TermsService.getActiveTerms,

    [ScsEventType.ADD_CREDIT]: CreditService.addCredit,
    [ScsEventType.SPEND_CREDIT]: CreditService.spendCredit,
    [ScsEventType.REFUND_CREDIT]: CreditService.refundCredit,
    [ScsEventType.GET_PROJECT_CREDIT]: CreditService.getCredit,
    [ScsEventType.GET_CREDIT_TRANSACTIONS]:
      CreditService.listCreditTransactions,
    [ScsEventType.GET_CREDIT_PACKAGES]: CreditService.getCreditPackages,
    [ScsEventType.GET_CREDIT_PACKAGE_STRIPE_ID]:
      CreditService.getCreditPackageStripeId,
    [ScsEventType.ADD_FREEMIUM_CREDITS]: CreditService.addFreemiumCredits,

    [ScsEventType.GET_PRODUCT_PRICELIST]: ProductService.getProductPricelist,
    [ScsEventType.GET_PRODUCT_PRICE]: ProductService.getProductPrice,

    [ScsEventType.GET_SUBSCRIPTION_PACKAGE_STRIPE_ID]:
      SubscriptionService.getSubscriptionPackageStripeId,
    [ScsEventType.UPDATE_SUBSCRIPTION]: SubscriptionService.updateSubscription,
    [ScsEventType.GET_ACTIVE_SUBSCRIPTION]:
      SubscriptionService.getProjectActiveSubscription,
    [ScsEventType.LIST_SUBSCRIPTIONS]: SubscriptionService.listSubscriptions,
    [ScsEventType.GET_SUBSCRIPTION_PACKAGES]:
      SubscriptionService.getSubscriptionPackages,

    [ScsEventType.HANDLE_STRIPE_WEBHOOK_DATA]:
      InvoiceService.handleStripeWebhookData,

    [ScsEventType.LIST_INVOICES]: InvoiceService.listInvoices,
  };

  return await processors[event.eventName](event, context);
}

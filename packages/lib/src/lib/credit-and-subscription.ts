import { LogType, ProductCode, ServiceName } from '../config/types';
import { SpendCreditDto } from './at-services/config/dtos/spend-credit.dto';
import { Scs } from './at-services/config/scs';
import { Lmas } from './at-services/lmas/lmas';
import { Context } from './context';
import { CodeException, ValidationException } from './exceptions/exceptions';

/**
 * General function for refunding credit, with additional error handling.
 * Call Config MS to refund credit.
 * @param context
 * @param referenceTable
 * @param referenceId
 * @param location
 * @param service
 */
export async function refundCredit(
  context: Context,
  referenceTable: string,
  referenceId: string,
  location: string,
  service: ServiceName,
  product_id?: ProductCode,
) {
  try {
    await new Scs(context).refundCredit(
      referenceTable,
      referenceId,
      product_id,
    );
  } catch (error) {
    await new Lmas().writeLog({
      logType: LogType.ERROR,
      message: 'Error refunding credit',
      location,
      service,
      data: {
        referenceTable,
        referenceId,
        error,
      },
    });
  }
}

/**
 * Wrapper function which spends credit, executes action and refund credit if action fails
 * @param context
 * @param spendCreditDto
 * @param action
 */
export async function spendCreditAction<T>(
  context: any,
  spendCreditDto: SpendCreditDto,
  action: () => Promise<T>,
): Promise<T> {
  // Validate input
  await spendCreditDto.validateOrThrow(ValidationException);
  // Spend credit
  await new Scs(context).spendCredit(spendCreditDto).catch((err) => {
    throw new CodeException({
      code: err.code,
      status: err.status,
      context,
      errorMessage: err.message,
    });
  });

  try {
    //Execute action and return result
    return await action();
  } catch (err) {
    //If action fails, refund credit
    await refundCredit(
      context,
      spendCreditDto.referenceTable,
      spendCreditDto.referenceId,
      spendCreditDto.location,
      spendCreditDto.service,
      spendCreditDto.product_id,
    );
    throw err;
  }
}

/**
 * Check if project has subscription
 * @param context
 * @param project_uuid
 * @returns id of subscription. Undefined if project doesn't have subscription.
 */
export async function checkProjectSubscription(
  context: any,
  project_uuid: string,
): Promise<boolean> {
  const subscription = (
    await new Scs(context).getProjectActiveSubscription(project_uuid)
  ).data;

  return subscription.id;
}

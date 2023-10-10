import { LogType, ProductCode, ServiceName } from '../config/types';
import { SpendCreditDto } from './at-services/config/dtos/spend-credit.dto';
import { Scs } from './at-services/config/scs';
import { Lmas } from './at-services/lmas/lmas';
import { Context } from './context';
import { ValidationException } from './exceptions/exceptions';

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
export async function spendCreditAction(
  context: any,
  spendCreditDto: SpendCreditDto,
  action: () => Promise<any>,
) {
  //Validate input
  try {
    await spendCreditDto.validate();
  } catch (err) {
    await spendCreditDto.handle(err);
    if (!spendCreditDto.isValid()) {
      throw new ValidationException(spendCreditDto);
    }
  }
  //Spend credit
  await new Scs(context).spendCredit(spendCreditDto);
  try {
    //Execute action
    await action();
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

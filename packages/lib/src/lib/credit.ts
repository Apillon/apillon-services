import { LogType, ProductCode, ServiceName } from '../config/types';
import { Scs } from './at-services/config/scs';
import { Lmas } from './at-services/lmas/lmas';
import { Context } from './context';

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

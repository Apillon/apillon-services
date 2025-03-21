import { ServiceContext } from '@apillon/service-lib';
import { ServiceName, spendCreditAction, SpendCreditDto } from '@apillon/lib';
import { DbTables } from '../../../config/types';

export class SimpletsSpendService {
  private readonly context: ServiceContext;

  constructor(context: ServiceContext) {
    this.context = context;
  }

  chargeDeploy: ChargeDeploySimpletType = async (
    project_uuid,
    simplet_uuid,
    product_id,
    action,
  ) => {
    const spendCredit = new SpendCreditDto(
      {
        project_uuid,
        product_id,
        referenceTable: DbTables.SIMPLET_DEPLOY,
        referenceId: simplet_uuid,
        location: 'SimpletsService.chargeDeploy',
        service: ServiceName.SIMPLETS,
      },
      this.context,
    );

    const result = await spendCreditAction(
      this.context,
      spendCredit,
      async () => await action(),
    );

    return { spendUuid: spendCredit.referenceId, result };
  };
}

type ChargeDeploySimpletType = <T>(
  project_uuid: string,
  simplet_uuid: string,
  product_id: string,
  action: () => Promise<T>,
) => Promise<{ result: T; spendUuid: string }>;

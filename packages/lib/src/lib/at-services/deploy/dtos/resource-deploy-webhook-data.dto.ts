import { integerParser, stringParser } from '@rawmodel/parsers';
import { PopulateFrom, SerializeFor } from '../../../../config/types';
import { prop } from '../../../base-models/base';
import { BaseTransactionDto } from '../../blockchain/dtos/base-transaction.dto';
import { ResourceStatus } from '../types/resource-status.type';

export class ResourceDeployWebhookDataDto extends BaseTransactionDto {
  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.PROFILE, PopulateFrom.ADMIN],
    serializable: [SerializeFor.PROFILE, SerializeFor.ADMIN],
  })
  public referenceTable: string;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.PROFILE, PopulateFrom.ADMIN],
    serializable: [SerializeFor.PROFILE, SerializeFor.ADMIN],
  })
  public referenceId: string;

  @prop({
    parser: { resolver: integerParser() },
    populatable: [PopulateFrom.PROFILE, PopulateFrom.ADMIN],
    serializable: [SerializeFor.PROFILE, SerializeFor.ADMIN],
  })
  public resourceStatus: ResourceStatus;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.PROFILE, PopulateFrom.ADMIN],
    serializable: [SerializeFor.PROFILE, SerializeFor.ADMIN],
  })
  public data: string;
}

import { prop } from '@rawmodel/core';
import {
  booleanParser,
  floatParser,
  integerParser,
  stringParser,
} from '@rawmodel/parsers';
import { PopulateFrom, SerializeFor } from '../../../../config/types';
import { ModelBase } from '../../../base-models/base';

export class CreateInvoiceDto extends ModelBase {
  @prop({
    parser: { resolver: stringParser() },
    populatable: [
      PopulateFrom.ADMIN, //
      PopulateFrom.SERVICE,
    ],
    serializable: [
      SerializeFor.ADMIN, //
      SerializeFor.SERVICE,
    ],
  })
  public project_uuid: string;

  @prop({
    parser: { resolver: floatParser() },
    populatable: [
      PopulateFrom.ADMIN, //
      PopulateFrom.SERVICE,
    ],
    serializable: [
      SerializeFor.ADMIN, //
      SerializeFor.SERVICE,
    ],
  })
  public subtotalAmount: number;

  @prop({
    parser: { resolver: floatParser() },
    populatable: [
      PopulateFrom.ADMIN, //
      PopulateFrom.SERVICE,
    ],
    serializable: [
      SerializeFor.ADMIN, //
      SerializeFor.SERVICE,
    ],
  })
  public totalAmount: number;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [
      PopulateFrom.ADMIN, //
      PopulateFrom.SERVICE,
    ],
    serializable: [
      SerializeFor.ADMIN, //
      SerializeFor.SERVICE,
    ],
  })
  public referenceTable: string;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [
      PopulateFrom.ADMIN, //
      PopulateFrom.SERVICE,
    ],
    serializable: [
      SerializeFor.ADMIN, //
      SerializeFor.SERVICE,
    ],
  })
  public referenceId: string;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [
      PopulateFrom.ADMIN, //
      PopulateFrom.SERVICE,
    ],
    serializable: [
      SerializeFor.ADMIN, //
      SerializeFor.SERVICE,
    ],
  })
  public clientEmail: string;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [
      PopulateFrom.ADMIN, //
      PopulateFrom.SERVICE,
    ],
    serializable: [
      SerializeFor.ADMIN, //
      SerializeFor.SERVICE,
    ],
  })
  public clientName: string;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [
      PopulateFrom.ADMIN, //
      PopulateFrom.SERVICE,
    ],
    serializable: [
      SerializeFor.ADMIN, //
      SerializeFor.SERVICE,
    ],
  })
  public currency: string;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [
      PopulateFrom.ADMIN, //
      PopulateFrom.SERVICE,
    ],
    serializable: [
      SerializeFor.ADMIN, //
      SerializeFor.SERVICE,
    ],
  })
  public invoiceStripeId: string;

  @prop({
    parser: { resolver: integerParser() },
    populatable: [
      PopulateFrom.ADMIN, //
      PopulateFrom.SERVICE,
    ],
    serializable: [
      SerializeFor.ADMIN, //
      SerializeFor.SERVICE,
    ],
  })
  public quantity: number;

  @prop({
    parser: { resolver: booleanParser() },
    populatable: [
      PopulateFrom.ADMIN, //
      PopulateFrom.SERVICE,
    ],
    serializable: [
      SerializeFor.ADMIN, //
      SerializeFor.SERVICE,
    ],
  })
  public isCreditPurchase: boolean;
}

import {
  BaseSQLModel,
  Lmas,
  LogType,
  PopulateFrom,
  presenceValidator,
  prop,
  SerializeFor,
  ServiceName,
} from '@apillon/lib';
import {
  integerParser,
  stringParser,
  dateParser,
  booleanParser,
} from '@rawmodel/parsers';
import { ComputingErrorCode, DbTables } from '../../../config/types';
import { ComputingModelValidationException } from '../../../lib/exceptions';

export class CloudFunctionCall extends BaseSQLModel {
  public readonly tableName = DbTables.CLOUD_FUNCTION_CALL;

  @prop({
    parser: { resolver: integerParser() },
    populatable: [PopulateFrom.DB],
    serializable: [SerializeFor.INSERT_DB, SerializeFor.SELECT_DB],
  })
  public id: number;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.DB, PopulateFrom.SERVICE],
    serializable: [SerializeFor.INSERT_DB, SerializeFor.SELECT_DB],
    validators: [
      {
        resolver: presenceValidator(),
        code: ComputingErrorCode.REQUIRED_DATA_NOT_PRESENT,
      },
    ],
  })
  public function_uuid: string;

  @prop({
    parser: { resolver: booleanParser() },
    populatable: [PopulateFrom.DB, PopulateFrom.SERVICE],
    serializable: [
      SerializeFor.INSERT_DB,
      SerializeFor.SELECT_DB,
      SerializeFor.PROFILE,
    ],
    validators: [
      {
        resolver: presenceValidator(),
        code: ComputingErrorCode.REQUIRED_DATA_NOT_PRESENT,
      },
    ],
  })
  public success: boolean;

  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.DB, PopulateFrom.SERVICE],
    serializable: [
      SerializeFor.INSERT_DB,
      SerializeFor.SELECT_DB,
      SerializeFor.PROFILE,
    ],
  })
  public error?: string;

  @prop({
    parser: { resolver: dateParser() },
    populatable: [PopulateFrom.DB],
    serializable: [
      SerializeFor.INSERT_DB,
      SerializeFor.SELECT_DB,
      SerializeFor.PROFILE,
    ],
    defaultValue: new Date(),
  })
  public timestamp: Date;

  public exists(): boolean {
    return !!this.id;
  }

  public async getList(filter: any) {
    const context = this.getContext();

    if (!filter.function_uuid) {
      throw new Error(
        `function_uuid should not be null: ${filter.function_uuid}`,
      );
    }

    const params = {
      function_uuid: filter.function_uuid,
      dateFrom: filter.dateFrom ? new Date(filter.dateFrom) : null,
      dateTo: filter.dateTo ? new Date(filter.dateTo) : null,
    };

    const calls = await this.getContext().mysql.paramExecute(
      `
        SELECT ${this.generateSelectFields('c', '', SerializeFor.SELECT_DB)}
        FROM \`${DbTables.CLOUD_FUNCTION_CALL}\`
        WHERE function_uuid = @apiKey_id
        ${params.dateFrom ? 'AND c.timestamp >= @dateFrom' : ''}
        ${params.dateTo ? 'AND c.timestamp <= @dateTo' : ''}
      `,
      params,
    );

    return calls.map((call) =>
      new CloudFunctionCall(call, context).serialize(SerializeFor.PROFILE),
    );
  }

  public async save(data: Partial<this>) {
    try {
      this.populate(data);
      await this.validateOrThrow(ComputingModelValidationException);
      await this.insert();
    } catch (err) {
      new Lmas().writeLog({
        logType: LogType.ALERT,
        message: `Error saving cloud function call: ${err}`,
        location: 'CloudFunctionCall.save',
        service: ServiceName.COMPUTING,
        data: { ...data, error: err },
        sendAdminAlert: true,
      });
    }
  }
}

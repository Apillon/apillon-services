import {
  AdvancedSQLModel,
  PopulateFrom,
  presenceValidator,
  prop,
  selectAndCountQuery,
  SerializeFor,
} from '@apillon/lib';
import { stringParser } from '@rawmodel/parsers';
import { ValidatorErrorCode, DbTables } from '../../../config/types';
import { AuthorizationApiContext } from '../../../context';

export class Attestation extends AdvancedSQLModel {
  /**
   * User's table.
   */
  tableName = DbTables.ATTESTATION;

  /**
   * Attestation state as defined in types
   */
  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.DB],
    serializable: [
      SerializeFor.INSERT_DB,
      SerializeFor.ADMIN,
      SerializeFor.PROFILE,
    ],
    validators: [
      {
        resolver: presenceValidator(),
        code: ValidatorErrorCode.ATTESTATION_STATE_NOT_PRESENT,
      },
    ],
  })
  public state: string;

  /**
   * TODO: Attestation user email -> Review!
   */
  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.DB],
    serializable: [
      SerializeFor.INSERT_DB,
      SerializeFor.ADMIN,
      SerializeFor.PROFILE,
    ],
    validators: [
      {
        resolver: presenceValidator(),
        code: ValidatorErrorCode.ATTESTATION_STATE_NOT_PRESENT,
      },
    ],
  })
  public email: string;

  public async populateByUserEmail(
    context: AuthorizationApiContext,
    email: string,
  ) {
    const data = await context.mysql.paramExecute(
      `
        SELECT *
        FROM \`${DbTables.ATTESTATION}\` a
        WHERE a.email = @email
      `,
      { email },
    );
    if (data && data.length) {
      return this.populate(data[0], PopulateFrom.DB);
    }
  }

  /**
   * Returns all attestations, filtered by specific state
   */
  public async getAttestationsByState(
    context: AuthorizationApiContext,
    state: string,
  ) {
    const params = {
      state: state,
    };
    const sqlQuery = {
      qSelect: `
        SELECT ${this.generateSelectFields('a', '', SerializeFor.SELECT_DB)}
        `,
      qFrom: `
        FROM ${DbTables.ATTESTATION} a
        WHERE a.state = ${params.state}
        `,
    };

    return selectAndCountQuery(context.mysql, sqlQuery, params, 'a.id');
  }
}

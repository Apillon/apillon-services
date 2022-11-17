import {
  AdvancedSQLModel,
  PopulateFrom,
  presenceValidator,
  prop,
  selectAndCountQuery,
  SerializeFor,
} from '@apillon/lib';
import { stringParser } from '@rawmodel/parsers';
import { ModuleValidatorErrorCode, DbTables } from '../../../config/types';
import { AuthorizationApiContext } from '../../../context';

export class Attestation extends AdvancedSQLModel {
  /**
   * User's table.
   */
  tableName = DbTables.ATTESTATION;

  /**
   * TODO: Attestation user email -> Review!
   */
  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.DB],
    serializable: [
      SerializeFor.PROFILE,
      SerializeFor.ADMIN,
      SerializeFor.INSERT_DB,
      SerializeFor.UPDATE_DB,
      SerializeFor.SELECT_DB,
    ],
    validators: [
      {
        resolver: presenceValidator(),
        code: ModuleValidatorErrorCode.ATTEST_EMAIL_NOT_PRESENT,
      },
    ],
  })
  public email: string;

  /**
   * Attestation state as defined in types
   */
  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.DB],
    serializable: [
      SerializeFor.PROFILE,
      SerializeFor.ADMIN,
      SerializeFor.INSERT_DB,
      SerializeFor.UPDATE_DB,
      SerializeFor.SELECT_DB,
    ],
    validators: [
      {
        resolver: presenceValidator(),
        code: ModuleValidatorErrorCode.ATTEST_STATE_NOT_PRESENT,
      },
    ],
  })
  public state: string;

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

    return this.reset();
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

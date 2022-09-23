import { stringParser, integerParser } from '@rawmodel/parsers';
import { presenceValidator } from '@rawmodel/validators';
import { AdvancedSQLModel, PopulateFrom, prop, selectAndCountQuery, SerializeFor } from 'at-lib';
import { DbTables, ValidatorErrorCode } from '../../../config/types';
import { DevConsoleApiContext } from '../../../context';
import { ServiceQueryFilter } from '../dto/instruction-query-filter.dto';

/**
 * Instruction model.
 */
export class Instruction extends AdvancedSQLModel {
  collectionName = DbTables.INSTRUCTION;

  /**
   * Instruction title
   */
  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.DB],
    serializable: [SerializeFor.PROFILE, SerializeFor.INSERT_DB, SerializeFor.UPDATE_DB],
    validators: [
      {
        resolver: presenceValidator(),
        code: ValidatorErrorCode.INSTRUCTION_NAME_NOT_PRESENT,
      },
    ],
  })
  public title: string;

  /**
   * Instruction type
   */
  @prop({
    parser: { resolver: integerParser() },
    populatable: [PopulateFrom.DB],
    serializable: [SerializeFor.PROFILE, SerializeFor.INSERT_DB, SerializeFor.UPDATE_DB],
  })
  public instructionType: number;

  /**
   * Instruction html content
   */
  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.DB],
    serializable: [SerializeFor.PROFILE, SerializeFor.INSERT_DB, SerializeFor.UPDATE_DB],
  })
  public htmlContent: string;

  /**
   * Instruction extended html content
   */
  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.DB],
    serializable: [SerializeFor.PROFILE, SerializeFor.INSERT_DB, SerializeFor.UPDATE_DB],
  })
  public extendedHtmlContent: string;

  /**
   * Instruction docs url
   */
  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.DB],
    serializable: [SerializeFor.PROFILE, SerializeFor.INSERT_DB, SerializeFor.UPDATE_DB],
  })
  public docsUrl: string;

  /**
   * Instruction instruction enum
   */
  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.DB],
    serializable: [SerializeFor.PROFILE, SerializeFor.INSERT_DB, SerializeFor.UPDATE_DB],
  })
  public instructionEnum: string;

  /**
   * Instruction instruction enum
   */
  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.DB],
    serializable: [SerializeFor.PROFILE, SerializeFor.INSERT_DB, SerializeFor.UPDATE_DB],
  })
  public forRoute: string;

  /**
   * Returns name, service type, status
   */
  public async getInstruction(context: DevConsoleApiContext, instruction_enum: string) {
    const sqlQuery = {
      qSelect: `
        SELECT FIRST i.*
        `,
      qFrom: `
        FROM \`${DbTables.INSTRUCTION}\` s
        WHERE instructionEnum = ${instruction_enum}
      `,
    };

    return selectAndCountQuery(context.mysql, sqlQuery, {}, 'i.id');
  }
}

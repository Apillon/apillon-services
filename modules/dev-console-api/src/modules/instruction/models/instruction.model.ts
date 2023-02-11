import {
  AdvancedSQLModel,
  PopulateFrom,
  prop,
  SerializeFor,
  SqlModelStatus,
} from '@apillon/lib';
import { booleanParser, integerParser, stringParser } from '@rawmodel/parsers';
import { presenceValidator } from '@rawmodel/validators';
import { DbTables, ValidatorErrorCode } from '../../../config/types';
import { DevConsoleApiContext } from '../../../context';

/**
 * Instruction model.
 */
export class Instruction extends AdvancedSQLModel {
  tableName = DbTables.INSTRUCTION;

  /**
   * Instruction title
   */
  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.DB, PopulateFrom.PROFILE, PopulateFrom.ADMIN],
    serializable: [
      SerializeFor.PROFILE,
      SerializeFor.INSERT_DB,
      SerializeFor.UPDATE_DB,
      SerializeFor.SELECT_DB,
    ],
  })
  public title: string;

  /**
   * Instruction type
   */
  @prop({
    parser: { resolver: integerParser() },
    populatable: [PopulateFrom.DB, PopulateFrom.PROFILE, PopulateFrom.ADMIN],
    serializable: [
      SerializeFor.PROFILE,
      SerializeFor.INSERT_DB,
      SerializeFor.UPDATE_DB,
      SerializeFor.SELECT_DB,
    ],
    validators: [
      {
        resolver: presenceValidator(),
        code: ValidatorErrorCode.INSTRUCTION_TYPE_NOT_PRESENT,
      },
    ],
  })
  public instructionType: number;

  /**
   * Instruction html content
   */
  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.DB, PopulateFrom.PROFILE, PopulateFrom.ADMIN],
    serializable: [
      SerializeFor.PROFILE,
      SerializeFor.INSERT_DB,
      SerializeFor.UPDATE_DB,
      SerializeFor.SELECT_DB,
    ],
    validators: [
      {
        resolver: presenceValidator(),
        code: ValidatorErrorCode.INSTRUCTION_HTML_CONTENT_NOT_PRESENT,
      },
    ],
  })
  public htmlContent: string;

  /**
   * Instruction extended html content
   */
  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.DB, PopulateFrom.PROFILE, PopulateFrom.ADMIN],
    serializable: [
      SerializeFor.PROFILE,
      SerializeFor.INSERT_DB,
      SerializeFor.UPDATE_DB,
      SerializeFor.SELECT_DB,
    ],
  })
  public extendedHtmlContent: string;

  /**
   * Instruction docs url
   */
  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.DB, PopulateFrom.PROFILE, PopulateFrom.ADMIN],
    serializable: [
      SerializeFor.PROFILE,
      SerializeFor.INSERT_DB,
      SerializeFor.UPDATE_DB,
      SerializeFor.SELECT_DB,
    ],
  })
  public docsUrl: string;

  /**
   * Instruction for route
   */
  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.DB, PopulateFrom.PROFILE, PopulateFrom.ADMIN],
    serializable: [
      SerializeFor.PROFILE,
      SerializeFor.INSERT_DB,
      SerializeFor.UPDATE_DB,
      SerializeFor.SELECT_DB,
    ],
    validators: [
      {
        resolver: presenceValidator(),
        code: ValidatorErrorCode.INSTRUCTION_FOR_ROUTE_NOT_PRESENT,
      },
    ],
  })
  public forRoute: string;

  @prop({
    parser: { resolver: booleanParser() },
    populatable: [PopulateFrom.DB, PopulateFrom.PROFILE, PopulateFrom.ADMIN],
    serializable: [
      SerializeFor.PROFILE,
      SerializeFor.INSERT_DB,
      SerializeFor.UPDATE_DB,
      SerializeFor.SELECT_DB,
    ],
    defaultValue: true,
  })
  public expanded: boolean;

  @prop({
    parser: { resolver: integerParser() },
    populatable: [PopulateFrom.DB, PopulateFrom.PROFILE, PopulateFrom.ADMIN],
    serializable: [
      SerializeFor.PROFILE,
      SerializeFor.INSERT_DB,
      SerializeFor.UPDATE_DB,
      SerializeFor.SELECT_DB,
    ],
  })
  public sortId: number;

  /**
   * Returns instructions filtered by route
   */
  public async getInstructions(
    context: DevConsoleApiContext,
    forRoute?: string,
  ) {
    return await context.mysql.paramExecute(
      `
        SELECT ${this.generateSelectFields('i')}
        FROM \`${DbTables.INSTRUCTION}\` i
        WHERE (@forRoute IS NULL OR forRoute = @forRoute)
        AND status <> ${SqlModelStatus.DELETED}
        ORDER BY sortId ASC;
      `,
      { forRoute: forRoute || null },
    );
  }
}

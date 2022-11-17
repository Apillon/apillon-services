import { stringParser, integerParser } from '@rawmodel/parsers';
import { presenceValidator } from '@rawmodel/validators';
import {
  AdvancedSQLModel,
  PopulateFrom,
  prop,
  selectAndCountQuery,
  SerializeFor,
} from '@apillon/lib';
import { DbTables, ValidatorErrorCode } from '../../../config/types';
import { DevConsoleApiContext } from '../../../context';

/**
 * Instruction model.
 */
export class Instruction extends AdvancedSQLModel {
  tableName = DbTables.INSTRUCTION;

  /**
   * Instruction instruction enum
   */
  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.DB],
    serializable: [
      SerializeFor.PROFILE,
      SerializeFor.INSERT_DB,
      SerializeFor.UPDATE_DB,
    ],
    validators: [
      {
        resolver: presenceValidator(),
        code: ValidatorErrorCode.INSTRUCTION_ENUM_NOT_PRESENT,
      },
    ],
  })
  public instructionEnum: string;

  /**
   * Instruction title
   */
  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.DB],
    serializable: [
      SerializeFor.PROFILE,
      SerializeFor.INSERT_DB,
      SerializeFor.UPDATE_DB,
    ],
  })
  public title: string;

  /**
   * Instruction type
   */
  @prop({
    parser: { resolver: integerParser() },
    populatable: [PopulateFrom.DB],
    serializable: [
      SerializeFor.PROFILE,
      SerializeFor.INSERT_DB,
      SerializeFor.UPDATE_DB,
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
    populatable: [PopulateFrom.DB],
    serializable: [
      SerializeFor.PROFILE,
      SerializeFor.INSERT_DB,
      SerializeFor.UPDATE_DB,
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
    populatable: [PopulateFrom.DB],
    serializable: [
      SerializeFor.PROFILE,
      SerializeFor.INSERT_DB,
      SerializeFor.UPDATE_DB,
    ],
  })
  public extendedHtmlContent: string;

  /**
   * Instruction docs url
   */
  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.DB],
    serializable: [
      SerializeFor.PROFILE,
      SerializeFor.INSERT_DB,
      SerializeFor.UPDATE_DB,
    ],
  })
  public docsUrl: string;

  /**
   * Instruction for route
   */
  @prop({
    parser: { resolver: stringParser() },
    populatable: [PopulateFrom.DB],
    serializable: [
      SerializeFor.PROFILE,
      SerializeFor.INSERT_DB,
      SerializeFor.UPDATE_DB,
    ],
  })
  public forRoute: string;

  /**
   * Returns instruction instance from instructionEnum
   */
  public async getInstructionByEnum(
    context: DevConsoleApiContext,
    instructionEnum: string,
  ) {
    const data = await context.mysql.paramExecute(
      `
        SELECT *
        FROM \`${DbTables.INSTRUCTION}\` i
        WHERE instructionEnum = @instructionEnum
        LIMIT 1
      `,
      { instructionEnum },
    );

    if (data && data.length) {
      return this.populate(data[0], PopulateFrom.DB);
    }

    return this.reset();
  }

  /**
   * Returns instructions filtered by route
   */
  public async getInstructions(
    context: DevConsoleApiContext,
    forRoute: string,
  ) {
    /** Routes with all subparts */
    const routeParts = forRoute.split('-');
    const routes = routeParts.map((_, key) => {
      return routeParts.slice(0, key + 1).join('-');
    });

    const params = {
      forRoute: `'${routes.join(`','`)}'`,
      offset: 0,
      limit: 10,
    };

    const sqlQuery = {
      qSelect: `
        SELECT *
        `,
      qFrom: `
        FROM \`${DbTables.INSTRUCTION}\` 
        WHERE  forRoute IN (${params.forRoute})
      `,
      qFilter: `
        ORDER BY CHAR_LENGTH(forRoute) DESC, instructionType
        LIMIT ${params.limit} OFFSET ${params.offset};
      `,
    };

    return selectAndCountQuery(context.mysql, sqlQuery, params, 'id');
  }
}

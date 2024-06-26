import { numberSizeValidator, presenceValidator } from '@rawmodel/validators';
import { AdvancedSQLModel } from './base-models/advanced-sql.model';
import { ModelBase } from './base-models/base';

/**
 * Expose standard validators.
 */
export { numberSizeValidator, presenceValidator };

/**
 *  Validates if value is inside enumerator
 */
export function enumInclusionValidator(enumerator: any, allowNull = false) {
  return (value: any) => {
    if (allowNull && value == null) {
      return true;
    }

    for (const key in enumerator) {
      if (key in enumerator && value == enumerator[key]) {
        return true;
      }
    }
    return false;
  };
}

/**
 * Validates uniqueness of field value.
 */
export function uniqueFieldValue(
  sqlTableName: string,
  fieldName: string,
  allowStatuses = [],
  idField = 'id',
  checkNull = false,
) {
  return async function (this: AdvancedSQLModel, value: any) {
    if ((!checkNull && value === null) || value === undefined) {
      return true;
    }
    const count = await this.getContext()
      .mysql.paramExecute(
        `
      SELECT COUNT(*) as Count FROM \`${sqlTableName}\`
      WHERE \`${fieldName}\` = @value
      AND (@id IS NULL OR (@id IS NOT NULL AND \`${idField}\` <> @id ))
      ${
        allowStatuses.length
          ? `AND NOT FIND_IN_SET(status, @allowStatuses)`
          : ''
      }`,
        { value, id: this?.id || null, allowStatuses },
      )
      .then((rows) => rows[0].Count);

    return count === 0;
  };
}

/**
 * Validates presence of at least one property.
 */
export function anyPresenceValidator(fields: string[]) {
  return function (this: AdvancedSQLModel, _value: any) {
    for (const field of fields) {
      if (!!this[field]) {
        return true;
      }
    }
    return false;
    // return fields.some((val) => !!this[val]);
  };
}

export function arrayLengthValidator() {
  return async function (this: ModelBase, value: any): Promise<boolean> {
    return value?.length > 0;
  };
}

/**
 * Require presence if field with name fieldName satisfies condition
 * @param fieldName field for passing to condition
 * @param condition condition used to enable presenceValidator
 */
export function conditionalPresenceValidator(
  fieldName: string,
  condition: (fieldValue: any) => boolean,
) {
  return async function (this: ModelBase, value: any): Promise<boolean> {
    if (condition(this[fieldName])) {
      return presenceValidator()(value);
    }

    return true;
  };
}

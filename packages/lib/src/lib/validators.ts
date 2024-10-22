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
  return function (this: ModelBase, value: any): boolean {
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

export function urlValidator() {
  return function (this: ModelBase, value: string): boolean {
    const urlPattern = new RegExp(
      '^(https?:\\/\\/)' + // protocol
        '((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.?)+[a-z]{2,}|' + // domain name
        '((\\d{1,3}\\.){3}\\d{1,3}))' + // OR ip (v4) address
        '(\\:\\d+)?' + // port
        '(\\/[-a-z\\d%_.~+]*)*' + // path
        '(\\?[;&a-z\\d%_.~+=-]*)?' + // query string
        '(\\#[-a-z\\d_]*)?$',
      'i', // fragment locator
    );
    return !!urlPattern.test(value);
  };
}

export function urlDomainValidator(validDomains: string[]) {
  return function (this: ModelBase, value: string): boolean {
    const urlPattern = new RegExp(
      `^(https?:\\/\\/)` + // protocol
        `((([a-z\\d]([a-z\\d-]*[a-z\\d])*)\\.?)*` + // subdomain
        `\\b(${validDomains.map((x) => x.replace('.', '\\.')).join('|')}))` + // match specific domains
        `(\\:\\d+)?` + // port
        `(\\/[-a-z\\d%_.~+]*)*` + // path
        `(\\?[;&a-z\\d%_.~+=-]*)?` + // query string
        `(\\#[-a-z\\d_]*)?$`,
      'i', // fragment locator
    );
    return !!urlPattern.test(value);
  };
}

export function minutesInFutureValidator(minutesInFuture: number) {
  return (value?: any) => {
    if (!(value instanceof Date)) {
      return false;
    }

    const now = new Date();
    const minDate = new Date(now.getTime() + minutesInFuture * 60_000);

    if (minDate instanceof Date && value < minDate) {
      return false;
    }

    return true;
  };
}

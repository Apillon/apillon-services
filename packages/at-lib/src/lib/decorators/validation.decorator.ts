import { SetMetadata } from '@nestjs/common';
import { PopulateFrom, ValidateFor } from '../../config/types';
import { ModelBase } from '../base-models/base';

/**
 * Validation options definition.
 */
export interface IValidationOptions {
  dto: typeof ModelBase;
  validateFor?: ValidateFor;
  populateFrom?: PopulateFrom;
}

/**
 * Validation options key definition.
 */
export const VALIDATION_OPTIONS_KEY = 'options';

/**
 * Adds validation options parameter to chosen class.
 *
 * @param options Validation options
 */
export const Validation = (options: IValidationOptions) => {
  if (!options.validateFor) {
    options.validateFor = ValidateFor.BODY;
  }
  if (!options.populateFrom) {
    options.populateFrom = PopulateFrom.PROFILE;
  }
  return SetMetadata(VALIDATION_OPTIONS_KEY, options);
};

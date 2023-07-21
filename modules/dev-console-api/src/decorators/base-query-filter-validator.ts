import { BaseQueryFilter, ValidateFor } from '@apillon/lib';
import { Validation } from '@apillon/modules-lib';
import { UseGuards, applyDecorators } from '@nestjs/common';
import { ValidationGuard } from '../guards/validation.guard';

/**
 * Adds a validator to an endpoint to validate that the request's query has type BaseQueryFilter
 */
export function BaseQueryFilterValidator() {
  return applyDecorators(
    Validation({ dto: BaseQueryFilter, validateFor: ValidateFor.QUERY }),
    UseGuards(ValidationGuard),
  );
}

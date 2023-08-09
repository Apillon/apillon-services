import { numberSizeValidator } from '@rawmodel/validators';

/**
 * Validates that drop price is in the range o numbers
 * @param minOrEqual lowest drop price
 * @param max highest drop price
 */
export function validateDropPriceIfDrop(minOrEqual: number, max: number) {
  return function (this: any, dropPrice: number): boolean {
    if (!this.drop) {
      return true;
    }
    const validate = numberSizeValidator({
      minOrEqual,
      max,
    });

    return validate(dropPrice);
  };
}

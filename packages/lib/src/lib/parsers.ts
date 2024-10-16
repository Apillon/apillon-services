import { isArray } from 'lodash';

export function JSONParser(): any {
  return (value: string | any) => {
    try {
      if (typeof value == 'string') {
        return JSON.parse(value);
      }
      return value;
    } catch (e) {
      return null;
    }
  };
}

// Not to be confused with arrayParser from rawmodel
export function stringArrayParser(
  separator = ',',
): (value: string) => string | string[] {
  return (value: string) =>
    value?.includes(separator)
      ? value.split(separator)
      : isArray(value)
        ? value
        : [value];
}

/**
 * Parses a given input to return an array.
 *
 * This function handles various input types to produce an array:
 * - If the input is already an array, it is returned as-is.
 * - If the input is a string formatted as a JSON array, it is parsed and returned as an array.
 * - If the input is a string not formatted as a JSON array, the string is split by commas to form an array.
 * - Other input types return an empty array.
 *
 * @param value - The input value to parse into an array
 * @returns The resulting array after parsing the input value
 */
export const jsonArrayParser = (value: unknown): unknown[] => {
  if (Array.isArray(value)) {
    return value;
  }
  if (typeof value !== 'string') {
    return [];
  }
  if (value.startsWith('[') && value.endsWith(']')) {
    return JSON.parse(value);
  }
  return value.split(',');
};

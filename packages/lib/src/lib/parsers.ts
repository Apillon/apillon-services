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

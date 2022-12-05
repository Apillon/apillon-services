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

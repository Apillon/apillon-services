export function stripHtmlElements(input: string): string {
  return input
    .replace(/<[^>]*>/g, '')
    .replace(/<!--/g, '')
    .replace(/-->/g, '')
    .replace(/\b[^\s]+\.[^\s]{2,}/g, '');
}

export function stripHtmlFromObject(obj: any): any {
  if (typeof obj === 'string') {
    return stripHtmlElements(obj);
  } else if (Array.isArray(obj)) {
    return obj.map((item) => stripHtmlFromObject(item));
  } else if (obj && typeof obj === 'object') {
    return Object.fromEntries(
      Object.entries(obj).map(([key, value]) => [
        key,
        stripHtmlFromObject(value),
      ]),
    );
  }
  return obj; // Return the value as is if it's neither a string, array, nor object
}

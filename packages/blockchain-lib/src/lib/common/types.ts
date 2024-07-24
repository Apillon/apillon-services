export interface IValidationError {
  code: number | string;
  property: string;
  message?: string;
}

import { errors, utils } from 'ethers';
import { IValidationError } from '../common';

export class EthersGenericError extends Error {}

export class EthersValidationError extends Error {
  readonly errors: IValidationError[];

  constructor(errors: IValidationError | IValidationError[]) {
    super('Argument validation failed');
    this.errors = Array.isArray(errors) ? errors : [errors];
  }
}

export class EthersUnhandledError extends Error {}

export async function parseEthersException(
  error: unknown,
  abi: unknown[],
  property: string,
): Promise<void> {
  if (typeof error !== 'object') {
    throw new EthersGenericError(`${error}`);
  }

  // Handle RPC errors
  if ('code' in error && 'message' in error) {
    switch (error.code) {
      case errors.INVALID_ARGUMENT:
      case errors.MISSING_ARGUMENT:
      case errors.UNEXPECTED_ARGUMENT: {
        throw new EthersValidationError({
          code: `${error.code}`,
          property:
            'argument' in error ? `${property}.${error.argument}` : property,
          message: `${error.message}`,
        });
      }
      default: {
        throw new EthersGenericError(`${error.message}`);
      }
    }
  }

  // Decode error data if available
  if ('data' in error) {
    let errorMessage: string;
    try {
      const iface = new utils.Interface(abi);
      const decodedError = iface.parseError(error.data as any);
      errorMessage = `${decodedError}`;
    } catch (decodeError) {
      errorMessage = `${decodeError}`;
    }
    throw new EthersGenericError(errorMessage);
  }

  throw new EthersUnhandledError(`${error}`);
}

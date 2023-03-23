import { ScsCodeException } from '../lib/exceptions';

/**
 * Error middleware for logging and formatting response
 * @returns formatted error response
 */
export function ErrorHandler() {
  const onError = (request) => {
    console.log('ON ERROR MIDLLEWARE');
    console.log(request);
    request.response = {
      success: false,
      status: request?.error?.status || 500,
      data: null,
      error:
        request?.error instanceof ScsCodeException
          ? {
              message: request?.error?.options.errorMessage,
              errorCode: request?.error?.options.code,
            }
          : request?.error,
      code: request?.error?.options?.code || request?.code,
    };
  };
  return {
    onError,
  };
}

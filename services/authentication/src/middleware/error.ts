import { AuthenticationCodeException } from '../lib/exceptions';

export function ErrorHandler() {
  const onError = (request) => {
    console.error('ON ERROR MIDLLEWARE');
    console.error(request);

    request.response = {
      success: false,
      status: request?.error?.status || 500,
      data: null,
      error:
        request?.error instanceof AuthenticationCodeException
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

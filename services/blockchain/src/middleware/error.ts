import { BlockchainCodeException } from '../lib/exceptions';

export function ErrorHandler() {
  const onError = (request) => {
    console.log('ON ERROR MIDLLEWARE');
    console.log(request);
    request.response = {
      success: false,
      status: request?.error?.status || 500,
      data: null,
      error:
        request?.error instanceof BlockchainCodeException
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

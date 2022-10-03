export function ErrorHandler() {
  const onError = (request) => {
    console.log('ON ERROR MIDLLEWARE');
    console.log(request);
    request.response = {
      success: false,
      status: request?.error?.status || 500,
      data: null,
      error: request?.error,
    };
  };
  return {
    onError,
  };
}

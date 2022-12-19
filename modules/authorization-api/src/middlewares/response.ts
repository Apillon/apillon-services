export function ResponseFormat() {
  const after = (request) => {
    if (request.response) {
      request.response = {
        success: true,
        status: 200,
        data: request.response,
      };
    } else {
      request.response = {
        success: false,
        status: request?.error?.status || 500,
        data: null,
        error: request?.error,
      };
    }
  };

  return { after };
}

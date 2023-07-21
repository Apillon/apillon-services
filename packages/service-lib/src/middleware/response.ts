/**
 * Response middleware
 * @returns formatted service response
 */
export function ResponseFormat() {
  const after = (request) => {
    // console.log('RESPONSE FORMAT MIDDLEWARE');
    // console.log(request);
    if (request.response != null) {
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
    // console.log(request);
  };

  return { after };
}

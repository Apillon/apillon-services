export class HttpException extends Error {
  public response: any;
  public status: number;
  public cause: any;
  /**
   * Instantiate a plain HTTP Exception.
   *
   * @example
   * `throw new HttpException()`
   *
   * @usageNotes
   * The constructor arguments define the response and the HTTP response status code.
   * - The `response` argument (required) defines the JSON response body.
   * - The `status` argument (required) defines the HTTP Status Code.
   *
   * By default, the JSON response body contains two properties:
   * - `statusCode`: the Http Status Code.
   * - `message`: a short description of the HTTP error by default; override this
   * by supplying a string in the `response` parameter.
   *
   * To override the entire JSON response body, pass an object to the `createBody`
   * method. Nest will serialize the object and return it as the JSON response body.
   *
   * The `status` argument is required, and should be a valid HTTP status code.
   * Best practice is to use the `HttpStatus` enum imported from `nestjs/common`.
   *
   * @param response string or object describing the error condition.
   * @param status HTTP response status code.
   */
  constructor(response, status) {
    super();
    this.response = response;
    this.status = status;
    this.initMessage();
    this.initName();
    this.initCause();
  }
  /**
   * Configures error chaining support
   *
   * See:
   * - https://nodejs.org/en/blog/release/v16.9.0/#error-cause
   * - https://github.com/microsoft/TypeScript/issues/45167
   */
  initCause() {
    if (this.response instanceof Error) {
      this.cause = this.response;
    }
  }
  initMessage() {
    if (typeof this.response === 'string') {
      this.message = this.response;
    } else if (this.response?.message) {
      this.message = this.response.message;
    } else if (this.constructor?.name) {
      try {
        this.message = this.constructor?.name
          .match(/[A-Z][a-z]+|[0-9]+/g)
          .join(' ');
      } catch (err) {
        console.error('initMessage failed!', this?.constructor?.name);
      }
    }
  }
  initName() {
    this.name = this.constructor.name;
  }
  getResponse() {
    return this.response;
  }
  getStatus() {
    return this.status;
  }
  static createBody(objectOrError, description, statusCode) {
    if (!objectOrError) {
      return { statusCode, message: description };
    }
    return typeof objectOrError === 'object' && !Array.isArray(objectOrError)
      ? objectOrError
      : { statusCode, message: objectOrError, error: description };
  }
}

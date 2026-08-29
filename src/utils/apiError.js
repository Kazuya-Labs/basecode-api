/**
 * Error class that carries an HTTP status. Throw it and the global error
 * middleware responds with the matching status (4xx logged as warn, 5xx error).
 * @class
 * @extends {Error}
 * @property {number} status HTTP status code
 * @property {*} data Optional payload attached to the error
 */
export class ApiError extends Error {
  /**
   * @param {number} status HTTP status code
   * @param {string} [message] Error message
   * @param {*} [data] Optional payload
   */
  constructor(status, message = "Error", data = null) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }

  /** @param {string} [message] @param {*} [data] @returns {ApiError} */
  static badRequest(message = "Bad request", data = null) {
    return new ApiError(400, message, data);
  }

  /** @param {string} [message] @param {*} [data] @returns {ApiError} */
  static unauthorized(message = "Unauthorized", data = null) {
    return new ApiError(401, message, data);
  }

  /** @param {string} [message] @param {*} [data] @returns {ApiError} */
  static forbidden(message = "Forbidden", data = null) {
    return new ApiError(403, message, data);
  }

  /** @param {string} [message] @param {*} [data] @returns {ApiError} */
  static notFound(message = "Resource not found", data = null) {
    return new ApiError(404, message, data);
  }

  /** @param {string} [message] @param {*} [data] @returns {ApiError} */
  static conflict(message = "Conflict", data = null) {
    return new ApiError(409, message, data);
  }
}

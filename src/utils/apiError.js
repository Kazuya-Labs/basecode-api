export class ApiError extends Error {
  constructor(status, message = "Error", data = null) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }

  static badRequest(message = "Bad request", data = null) {
    return new ApiError(400, message, data);
  }

  static unauthorized(message = "Unauthorized", data = null) {
    return new ApiError(401, message, data);
  }

  static forbidden(message = "Forbidden", data = null) {
    return new ApiError(403, message, data);
  }

  static notFound(message = "Resource not found", data = null) {
    return new ApiError(404, message, data);
  }

  static conflict(message = "Conflict", data = null) {
    return new ApiError(409, message, data);
  }
}

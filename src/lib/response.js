/**
 * Send a success response envelope `{ success, message, data, meta? }`.
 * @param {import("express").Response} res
 * @param {*} [data]
 * @param {string} [message]
 * @param {number} [status]
 * @param {object|null} [meta] Optional metadata (e.g. pagination); omitted when null
 * @returns {import("express").Response}
 */
export function ok(res, data = null, message = "Success", status = 200, meta = null) {
  const body = { success: true, message, data };
  if (meta) body.meta = meta;
  return res.status(status).json(body);
}

/**
 * Send an error response envelope `{ success: false, message, data }`.
 * @param {import("express").Response} res
 * @param {number} [status]
 * @param {string} [message]
 * @param {*} [data]
 * @returns {import("express").Response}
 */
export function fail(res, status = 500, message = "Internal Server Error", data = null) {
  return res.status(status).json({ success: false, message, data });
}

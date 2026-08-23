export function ok(res, data = null, message = "Success", status = 200, meta = null) {
  const body = { success: true, message, data };
  if (meta) body.meta = meta;
  return res.status(status).json(body);
}

export function fail(res, status = 500, message = "Internal Server Error", data = null) {
  return res.status(status).json({ success: false, message, data });
}

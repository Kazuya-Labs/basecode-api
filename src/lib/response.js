export function ok(res, data = null, message = "Success", status = 200) {
  return res.status(status).json({ success: true, message, data });
}

export function fail(res, status = 500, message = "Internal Server Error", data = null) {
  return res.status(status).json({ success: false, message, data });
}

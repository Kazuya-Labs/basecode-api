export function parsePagination(query = {}, { defaultLimit = 10, maxLimit = 100 } = {}) {
  const page = Math.max(Number(query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(query.limit) || defaultLimit, 1), maxLimit);
  return { page, limit, offset: page * limit - limit };
}

export function buildPageMeta(total, { page, limit }) {
  return { total, page, limit, totalPages: Math.ceil(total / limit) };
}

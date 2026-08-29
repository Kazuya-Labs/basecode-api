/**
 * Parse and clamp page/limit from a query object (e.g. controller `req.query`).
 * @param {Object} [query]
 * @param {string|number} [query.page] 1-based page number
 * @param {string|number} [query.limit] items per page
 * @param {Object} [options]
 * @param {number} [options.defaultLimit=10]
 * @param {number} [options.maxLimit=100]
 * @returns {{page: number, limit: number, offset: number}}
 */
export function parsePagination(query = {}, { defaultLimit = 10, maxLimit = 100 } = {}) {
  const page = Math.max(Number(query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(query.limit) || defaultLimit, 1), maxLimit);
  return { page, limit, offset: page * limit - limit };
}

/**
 * Build pagination metadata for a total row count.
 * @param {number} total Total number of rows
 * @param {{page: number, limit: number}} pagination From {@link parsePagination}
 * @returns {{total: number, page: number, limit: number, totalPages: number}}
 */
export function buildPageMeta(total, { page, limit }) {
  return { total, page, limit, totalPages: Math.ceil(total / limit) };
}

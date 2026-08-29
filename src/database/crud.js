import { eq } from "drizzle-orm";

import { db } from "./db.js";
import { buildPageMeta } from "../utils/pagination.js";

/**
 * Build a select query (thenable, also supports `.toSQL()` / further chaining).
 * @param {object} table Drizzle table (any `pgTable`)
 * @param {object} [options]
 * @param {import("drizzle-orm").SQL|undefined} [options.where]
 * @param {import("drizzle-orm").SQL|{fields:object}|object|undefined} [options.orderBy]
 * @param {number} [options.limit]
 * @param {number} [options.offset]
 * @returns {import("drizzle-orm").PgSelect}
 */
export function findAll(table, { where, orderBy, limit, offset } = {}) {
  let query = db.select().from(table);
  if (where) query = query.where(where);
  if (orderBy) query = query.orderBy(orderBy);
  if (limit !== undefined) query = query.limit(limit);
  if (offset !== undefined) query = query.offset(offset);
  return query;
}

/**
 * Fetch one page of rows plus pagination metadata (total via `$count`).
 * @param {object} table Drizzle table
 * @param {object} [options]
 * @param {import("drizzle-orm").SQL|undefined} [options.where]
 * @param {(import("drizzle-orm").SQL|{fields:object}|object)|undefined} [options.orderBy]
 * @param {number} [options.page=1]
 * @param {number} [options.limit=10]
 * @returns {Promise<{rows: Array<object>, meta: {total: number, page: number, limit: number, totalPages: number}}>}
 */
export async function findPage(table, { where, orderBy, page = 1, limit = 10 } = {}) {
  const safeLimit = Math.min(Math.max(Number(limit) || 10, 1), 100);
  const currentPage = Math.max(Number(page) || 1, 1);
  const offset = currentPage * safeLimit - safeLimit;

  const rows = await findAll(table, { where, orderBy, limit: safeLimit, offset });
  const total = await db.$count(table, where);

  return { rows, meta: buildPageMeta(total, { page: currentPage, limit: safeLimit }) };
}

/**
 * Fetch a single row by id, or null if not found.
 * @param {object} table Drizzle table
 * @param {string} id Primary key value
 * @param {import("drizzle-orm").AnyPgColumn} [idColumn=table.id] Defaults to column named `id`
 * @returns {Promise<object|null>}
 */
export async function findById(table, id, idColumn = table.id) {
  const [row] = await db.select().from(table).where(eq(idColumn, id)).limit(1);
  return row ?? null;
}

/**
 * Insert a row and return it.
 * @param {object} table Drizzle table
 * @param {object} values Column values to insert
 * @returns {Promise<object>}
 */
export async function insertOne(table, values) {
  const [row] = await db.insert(table).values(values).returning();
  return row;
}

/**
 * Update a row by id and return it, or null if not found.
 * @param {object} table Drizzle table
 * @param {string} id Primary key value
 * @param {object} values Columns to update
 * @param {import("drizzle-orm").AnyPgColumn} [idColumn=table.id]
 * @returns {Promise<object|null>}
 */
export async function updateById(table, id, values, idColumn = table.id) {
  const [row] = await db
    .update(table)
    .set(values)
    .where(eq(idColumn, id))
    .returning();
  return row ?? null;
}

/**
 * Delete a row by id and return it, or null if not found.
 * @param {object} table Drizzle table
 * @param {string} id Primary key value
 * @param {import("drizzle-orm").AnyPgColumn} [idColumn=table.id]
 * @returns {Promise<object|null>}
 */
export async function deleteById(table, id, idColumn = table.id) {
  const [row] = await db.delete(table).where(eq(idColumn, id)).returning();
  return row ?? null;
}

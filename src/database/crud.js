import { eq } from "drizzle-orm";

import { db } from "./db.js";
import { buildPageMeta } from "../utils/pagination.js";

export function findAll(table, { where, orderBy, limit, offset } = {}) {
  let query = db.select().from(table);
  if (where) query = query.where(where);
  if (orderBy) query = query.orderBy(orderBy);
  if (limit !== undefined) query = query.limit(limit);
  if (offset !== undefined) query = query.offset(offset);
  return query;
}

export async function findPage(table, { where, orderBy, page = 1, limit = 10 } = {}) {
  const safeLimit = Math.min(Math.max(Number(limit) || 10, 1), 100);
  const currentPage = Math.max(Number(page) || 1, 1);
  const offset = currentPage * safeLimit - safeLimit;

  const rows = await findAll(table, { where, orderBy, limit: safeLimit, offset });
  const total = await db.$count(table, where);

  return { rows, meta: buildPageMeta(total, { page: currentPage, limit: safeLimit }) };
}

export async function findById(table, id, idColumn = table.id) {
  const [row] = await db.select().from(table).where(eq(idColumn, id)).limit(1);
  return row ?? null;
}

export async function insertOne(table, values) {
  const [row] = await db.insert(table).values(values).returning();
  return row;
}

export async function updateById(table, id, values, idColumn = table.id) {
  const [row] = await db
    .update(table)
    .set(values)
    .where(eq(idColumn, id))
    .returning();
  return row ?? null;
}

export async function deleteById(table, id, idColumn = table.id) {
  const [row] = await db.delete(table).where(eq(idColumn, id)).returning();
  return row ?? null;
}

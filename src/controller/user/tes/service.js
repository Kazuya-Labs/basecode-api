import {
  deleteById,
  findPage,
  findById,
  insertOne,
  updateById,
} from "../../../database/crud.js";
import { users as table } from "../../../database/schema.js"; // TODO: swap "users" for your table

export function listTes({ page, limit }) {
  // Add business rules here (filters, ordering, scoping)
  return findPage(table, { page, limit });
}

export function getTes(id) {
  return findById(table, id);
}

export function createTes(data) {
  // Validate / transform input before persisting
  return insertOne(table, data);
}

export function updateTes(id, data) {
  return updateById(table, id, data);
}

export function removeTes(id) {
  return deleteById(table, id);
}

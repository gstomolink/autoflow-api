export const DEFAULT_PAGE = 1;
export const DEFAULT_LIMIT = 10;
export const MAX_LIMIT = 500;

export type PaginatedResult<T> = {
  items: T[];
  total: number;
  page: number;
  limit: number;
};

export function normalizePagination(
  page?: number,
  limit?: number,
): { page: number; limit: number; skip: number } {
  let p = Number(page);
  let l = Number(limit);
  if (!Number.isFinite(p) || p < 1) p = DEFAULT_PAGE;
  if (!Number.isFinite(l) || l < 1) l = DEFAULT_LIMIT;
  if (l > MAX_LIMIT) l = MAX_LIMIT;
  return { page: p, limit: l, skip: (p - 1) * l };
}

export function toPaginated<T>(
  items: T[],
  total: number,
  page: number,
  limit: number,
): PaginatedResult<T> {
  return { items, total, page, limit };
}

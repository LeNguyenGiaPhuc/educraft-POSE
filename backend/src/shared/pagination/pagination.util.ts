import type { PaginationParams, PaginationMeta } from './pagination.dto.js';

export function parsePaginationParams(query: Record<string, unknown>): PaginationParams {
  let page = 1;
  if (query.page !== undefined) {
    const rawPage = Number(query.page);
    page = !Number.isNaN(rawPage) ? Math.max(1, Math.floor(rawPage)) : 1;
  }

  let limit = 20;
  if (query.limit !== undefined) {
    const rawLimit = Number(query.limit);
    limit = !Number.isNaN(rawLimit) ? Math.min(100, Math.max(1, Math.floor(rawLimit))) : 20;
  }

  const search = typeof query.search === 'string' && query.search.trim() ? query.search.trim() : undefined;
  const sortBy = typeof query.sortBy === 'string' && query.sortBy.trim() ? query.sortBy.trim() : undefined;
  const sortOrder = query.sortOrder === 'asc' || query.sortOrder === 'desc' ? query.sortOrder : 'desc';

  const skip = (page - 1) * limit;
  const take = limit;

  return {
    page,
    limit,
    skip,
    take,
    search,
    sortBy,
    sortOrder,
  };
}

export function createPaginationMeta(params: {
  page: number;
  limit: number;
  totalItems: number;
}): PaginationMeta {
  const { page, limit, totalItems } = params;
  const totalPages = totalItems > 0 ? Math.ceil(totalItems / limit) : 0;
  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1 && totalPages > 0;

  return {
    page,
    limit,
    totalItems,
    totalPages,
    hasNextPage,
    hasPrevPage,
  };
}

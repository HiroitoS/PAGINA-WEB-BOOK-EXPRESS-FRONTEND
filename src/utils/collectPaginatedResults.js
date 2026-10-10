/**
 * Retrieve every page of a bounded DRF listing.
 *
 * Preserve existing caller filters while following page-number pagination.
 * Fail explicitly at the safety limit instead of silently losing records.
 */
export async function collectPaginatedResults(fetchPage, params = {}, options = {}) {
  const pageSize = options.pageSize ?? 200;
  const maxPages = options.maxPages ?? 100;
  const items = [];

  for (let page = 1; page <= maxPages; page += 1) {
    const response = await fetchPage({
      ...params,
      page,
      page_size: pageSize,
    });

    // Keep compatibility with unpaginated responses.
    if (Array.isArray(response)) {
      return [...items, ...response];
    }

    if (!response || !Array.isArray(response.results)) {
      throw new Error("Invalid paginated response.");
    }

    items.push(...response.results);

    if (!response.next) {
      return items;
    }
  }

  throw new Error("Pagination limit reached; results were not truncated silently.");
}

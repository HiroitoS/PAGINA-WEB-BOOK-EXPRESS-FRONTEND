import assert from "node:assert/strict";
import test from "node:test";
import { collectPaginatedResults } from "../src/utils/collectPaginatedResults.js";

test("collects all pages in order", async () => {
  const pages = [];
  const result = await collectPaginatedResults(async (params) => {
    pages.push(params);
    return params.page === 1
      ? { results: [{ id: 1 }, { id: 2 }], next: "/api/admin/reminders/?page=2" }
      : { results: [{ id: 3 }], next: null };
  }, { scope: "upcoming" }, { pageSize: 2 });

  assert.deepEqual(result.map((item) => item.id), [1, 2, 3]);
  assert.deepEqual(pages, [
    { scope: "upcoming", page: 1, page_size: 2 },
    { scope: "upcoming", page: 2, page_size: 2 },
  ]);
});

test("accepts an unpaginated response", async () => {
  const result = await collectPaginatedResults(async () => [{ id: 5 }]);
  assert.deepEqual(result, [{ id: 5 }]);
});

test("fails on invalid response rather than treating it as empty", async () => {
  await assert.rejects(
    collectPaginatedResults(async () => ({ detail: "Unexpected response" })),
    /Invalid paginated response/,
  );
});

test("does not hide data if the page limit is exceeded", async () => {
  await assert.rejects(
    collectPaginatedResults(
      async () => ({ results: [{ id: 1 }], next: "more" }),
      {},
      { maxPages: 2 },
    ),
    /Pagination limit reached/,
  );
});

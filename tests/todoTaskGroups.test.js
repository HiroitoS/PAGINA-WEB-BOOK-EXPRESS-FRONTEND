import assert from "node:assert/strict";
import test from "node:test";

import {
  groupTodoTasksByStatus,
  taskMatchesTodoView,
} from "../src/components/admin/workspace/todo/todoTaskUtils.js";

const TODAY = "2026-10-10";

function ids(tasks) {
  return tasks.map((task) => task.id);
}

test("groups open, overdue, waiting, completed and cancelled without overlap", () => {
  const tasks = [
    { id: 1, status: "pending", is_overdue: true },
    { id: 2, status: "in_progress", is_overdue: false },
    { id: 3, status: "waiting", is_overdue: false },
    { id: 4, status: "completed", is_overdue: false },
    { id: 5, status: "cancelled", is_overdue: false },
    { id: 6, status: "waiting", is_overdue: true },
    { id: 7, status: "completed", is_overdue: true },
  ];

  const groups = groupTodoTasksByStatus(tasks, TODAY);

  assert.deepEqual(ids(groups.overdueTasks), [1, 6]);
  assert.deepEqual(ids(groups.activeTasks), [2]);
  assert.deepEqual(ids(groups.waitingTasks), [3]);
  assert.deepEqual(ids(groups.completedTasks), [4, 7]);
  assert.deepEqual(ids(groups.cancelledTasks), [5]);

  const displayedIds = Object.values(groups).flatMap(ids);
  assert.equal(displayedIds.length, tasks.length);
  assert.equal(new Set(displayedIds).size, tasks.length);
});

test("never treats cancelled or completed tasks as overdue action items", () => {
  const groups = groupTodoTasksByStatus([
    { id: 1, status: "completed", is_overdue: true },
    { id: 2, status: "cancelled", is_overdue: true },
  ], TODAY);

  assert.equal(groups.overdueTasks.length, 0);
  assert.deepEqual(ids(groups.completedTasks), [1]);
  assert.deepEqual(ids(groups.cancelledTasks), [2]);
});

test("preserves overdue priority order and completed most recently first", () => {
  const groups = groupTodoTasksByStatus([
    { id: 1, status: "pending", is_overdue: true, priority: "medium" },
    { id: 2, status: "pending", is_overdue: true, priority: "urgent" },
    {
      id: 3,
      status: "completed",
      completed_at: "2026-10-08T10:00:00Z",
    },
    {
      id: 4,
      status: "completed",
      completed_at: "2026-10-09T10:00:00Z",
    },
  ], TODAY);

  assert.deepEqual(ids(groups.overdueTasks), [2, 1]);
  assert.deepEqual(ids(groups.completedTasks), [4, 3]);
});

test("Mi día is an explicit task selection, not an automatic due-date rule", () => {
  const dueToday = {
    status: "pending",
    due_at: "2026-10-10T16:00:00-05:00",
    in_my_day: false,
  };
  assert.equal(taskMatchesTodoView(dueToday, "today", 1), false);
  assert.equal(taskMatchesTodoView({
    ...dueToday,
    in_my_day: true,
  }, "today", 1), true);
  assert.equal(taskMatchesTodoView(dueToday, "planned", 1), true);
});

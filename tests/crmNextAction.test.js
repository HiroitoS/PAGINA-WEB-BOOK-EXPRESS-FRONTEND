import assert from "node:assert/strict";
import test from "node:test";

import { buildCRMNextActionTaskPayload } from "../src/utils/crmNextAction.js";

test("converts a CRM next action to a task with the activity and school context", () => {
  const payload = buildCRMNextActionTaskPayload({
    title: "  Visitar colegio  ",
    actionType: "visit",
    dueAt: new Date("2026-11-30T22:40:00.000Z"),
    originActivityId: 85,
    opportunityId: 42,
    contactId: 19,
  });

  assert.deepEqual(payload, {
    title: "Visitar colegio",
    origin_activity: 85,
    opportunity: 42,
    commercial_action_type: "visit",
    due_at: "2026-11-30T22:40:00.000Z",
    contact: 19,
  });
});

test("keeps school-only next actions valid without a contact or opportunity", () => {
  const payload = buildCRMNextActionTaskPayload({
    title: "Dar seguimiento",
    actionType: "follow_up",
    dueAt: new Date("2026-12-01T15:00:00.000Z"),
    originActivityId: 86,
    opportunityId: null,
    contactId: null,
  });

  assert.equal(payload.opportunity, null);
  assert.equal(payload.commercial_action_type, "follow_up");
  assert.equal(payload.due_at, "2026-12-01T15:00:00.000Z");
  assert.ok(!Object.hasOwn(payload, "contact"));
  assert.ok(!Object.hasOwn(payload, "event_type"));
  assert.ok(!Object.hasOwn(payload, "start_at"));
});

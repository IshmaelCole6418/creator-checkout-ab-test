import test from "node:test";
import assert from "node:assert/strict";
import { chooseCheckout } from "./checkout_ab_test.ts";

test("the subscriber-update assignment changes delivery for the same resolved user", async () => {
  const calls: string[] = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    calls.push(`${init?.method} ${String(input)}`);
    if (String(input).includes("/v1/auth/user/get/")) {
      return new Response(JSON.stringify({ ok: true, data: { id: "user-42" } }), { status: 200 });
    }
    return new Response(JSON.stringify({ ok: true, data: { variant: "subscriber-update" } }), { status: 200 });
  };
  process.env.INFRAI_API_KEY = "test-key";
  const result = await chooseCheckout({ userId: "input-user", flagKey: "creator-checkout", creatorId: "creator-1", assetId: "asset-1" });
  globalThis.fetch = originalFetch;
  assert.equal(result.userId, "user-42");
  assert.equal(result.delivery, "subscriber-update");
  assert.equal(calls.every((call) => call.startsWith("GET ")), true);
  assert.equal(calls.some((call) => call.includes("user_id=user-42")), true);
});

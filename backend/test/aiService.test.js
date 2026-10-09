const assert = require("node:assert/strict");
const test = require("node:test");
const { askAria, summarizeCall } = require("../services/aiService");

let originalFetch;
let originalApiKey;
let requests;
let summaryResponse;
let chatResponse;

function groqResponse(content) {
  return new Response(
    JSON.stringify({
      choices: [{ message: { content } }],
    }),
    {
      status: 200,
      headers: { "content-type": "application/json" },
    }
  );
}

test.beforeEach(() => {
  originalFetch = global.fetch;
  originalApiKey = process.env.GROQ_API_KEY;
  process.env.GROQ_API_KEY = "test-key";
  requests = [];
  summaryResponse = JSON.stringify({
    customer_intent: "ORDER_TRACKING",
    order_id: null,
    resolution_status: "RESOLVED",
    call_summary: "The customer received order information.",
  });
  chatResponse = "Here is the available information.";
  global.fetch = async (_url, options) => {
    const body = JSON.parse(options.body);
    requests.push(body);
    return groqResponse(
      body.response_format ? summaryResponse : chatResponse
    );
  };
});

test.afterEach(() => {
  global.fetch = originalFetch;
  if (originalApiKey === undefined) {
    delete process.env.GROQ_API_KEY;
  } else {
    process.env.GROQ_API_KEY = originalApiKey;
  }
});

test("normalizes supported order references and looks up the current ID", async () => {
  const cases = [
    ["ORD-101", "ORD-101"],
    ["order 101", "ORD-101"],
    ["where is my order 101?", "ORD-101"],
    ["can I cancel order 103?", "ORD-103"],
    ["cancel 103 order", "ORD-103"],
  ];

  for (const [message, expectedId] of cases) {
    requests = [];
    await askAria(message, [
      { role: "user", content: "Where is order ORD-101?" },
    ]);

    const lookup = requests[0].messages.find((item) =>
      item.content?.includes("VERIFIED ORDER LOOKUP")
    );
    assert.ok(lookup, `expected lookup for ${message}`);
    assert.ok(lookup.content.includes(`Requested order ID: ${expectedId}`));
    assert.match(lookup.content, /"found":true/);

    if (expectedId === "ORD-101") {
      assert.match(lookup.content, /BD-982103/);
    }
    if (expectedId === "ORD-103") {
      assert.match(lookup.content, /Eligible for cancellation/);
    }
  }
});

test("uses recent history only when the current message has no order ID", async () => {
  await askAria("When will it arrive?", [
    { role: "user", content: "Where is order ORD-101?" },
    { role: "assistant", content: "Your order is out for delivery." },
  ]);

  assert.ok(
    requests[0].messages.some((item) =>
      item.content?.includes("Requested order ID: ORD-101")
    )
  );
});

test("does not use a previous ID when the current message specifies another order", async () => {
  await askAria("Can I cancel order 103?", [
    { role: "user", content: "Where is order ORD-101?" },
  ]);

  assert.ok(
    requests[0].messages.some((item) =>
      item.content?.includes("Requested order ID: ORD-103")
    )
  );
});

test("does not look up an old order for a missing or invalid current ID", async () => {
  await askAria("Where is my order?", []);
  assert.equal(
    requests[0].messages.some((item) =>
      item.content?.includes("VERIFIED ORDER LOOKUP")
    ),
    false
  );

  requests = [];
  await askAria("Where is order 999?", [
    { role: "user", content: "Where is order ORD-101?" },
  ]);
  const lookup = requests[0].messages.find((item) =>
    item.content?.includes("VERIFIED ORDER LOOKUP")
  );
  assert.ok(lookup);
  assert.match(lookup.content, /"found":false/);
  assert.match(lookup.content, /ORD-999/);
  assert.doesNotMatch(lookup.content, /BD-982103/);
});

test("summaries have exactly four validated fields and cannot resolve unsupported actions", async () => {
  summaryResponse = JSON.stringify({
    customer_intent: "ORDER_CANCELLATION",
    order_id: "ORD-103",
    resolution_status: "RESOLVED",
    call_summary: "The customer asked to cancel order 103.",
    extra: "ignored",
  });

  const summary = await summarizeCall([
    { speaker: "Customer", text: "Can I cancel order 103?" },
    {
      speaker: "Aria",
      text: "It is eligible; please contact support to complete cancellation.",
    },
  ]);

  assert.deepEqual(Object.keys(summary), [
    "customer_intent",
    "order_id",
    "resolution_status",
    "call_summary",
  ]);
  assert.equal(summary.order_id, "ORD-103");
  assert.equal(summary.resolution_status, "UNRESOLVED");

  summaryResponse = JSON.stringify({
    customer_intent: "ORDER_TRACKING",
    order_id: "ORD-101",
    resolution_status: "RESOLVED",
    call_summary: "The customer asked a general question.",
  });
  const noOrderSummary = await summarizeCall([
    { speaker: "Customer", text: "What are your shipping fees?" },
  ]);
  assert.equal(noOrderSummary.order_id, null);
});

test("cancellation guidance does not claim or offer to perform the action", async () => {
  await askAria("Can I cancel order 103?");
  const systemMessage = requests[0].messages.find(
    (item) => item.role === "system" && item.content.includes("POLICIES:")
  );

  assert.match(systemMessage.content, /direct the customer to support/);
  assert.match(systemMessage.content, /never offer to initiate it/);
});

test("rejects malformed summary JSON and raw tool-call output", async () => {
  summaryResponse = "not-json";
  await assert.rejects(
    summarizeCall([{ speaker: "Customer", text: "Hi" }]),
    /Unable to summarize/
  );

  chatResponse =
    '{"name":"get_order_details","parameters":{"order_id":"ORD-101"}}';
  await assert.rejects(
    askAria("Where is order ORD-101?"),
    /Unable to generate/
  );
});

test("reports missing Groq credentials without returning a fabricated answer", async () => {
  delete process.env.GROQ_API_KEY;
  await assert.rejects(
    askAria("Where is order ORD-101?"),
    /GROQ_API_KEY is not configured/
  );
});

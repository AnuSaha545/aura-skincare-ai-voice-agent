
const { Ollama } = require("ollama");
const { get_order_details } = require("./orderService");

const ollama = new Ollama();
const MODEL = "llama3.2";

const ARIA_PROMPT = `You are Aria, Aura Skincare's friendly, professional customer support specialist. Be concise, natural, accurate, and never invent information.

POLICIES:
- Free shipping on orders above ₹499; orders below ₹499 have a ₹50 fee.
- Standard delivery takes 3–5 business days.
- Returns are accepted within 7 days of delivery only for unopened, unused products in original packaging.
- Damaged or defective products must be reported within 48 hours with photos. Eligible cases can receive a replacement.
- Processing orders ARE eligible for cancellation.
- Shipped and Out for Delivery orders cannot be cancelled. Customers may refuse delivery at the doorstep.
- Never claim a cancellation, refund, return, or replacement was completed unless the system confirms the action.
- COD is available up to ₹2,500, payable by cash or UPI at the doorstep.

SCOPE:
Answer Aura Skincare questions only. Politely refuse unrelated requests.

ORDERS:
Use get_order_details for order-specific questions when an order ID is available. Resolve follow-up references from conversation history. Never invent order details. Ask for an order ID if it cannot be determined. If an order is not found, explain that clearly.
Apply the cancellation policy according to the actual order status. Processing means eligible for cancellation, not already cancelled.
Never output tool-call JSON to the customer.`;

const tools = [
  {
    type: "function",
    function: {
      name: "get_order_details",
      description: "Retrieve Aura Skincare order information using an order ID.",
      parameters: {
        type: "object",
        properties: {
          order_id: {
            type: "string",
            description: "Order ID such as ORD-101",
          },
        },
        required: ["order_id"],
      },
    },
  },
];

const CUSTOMER_INTENTS = [
  "ORDER_TRACKING",
  "ORDER_CANCELLATION",
  "RETURN_REQUEST",
  "REFUND_REQUEST",
  "DAMAGED_PRODUCT",
  "SHIPPING_POLICY",
  "PRODUCT_QUERY",
  "GENERAL_SUPPORT",
  "OUT_OF_SCOPE",
];

const RESOLUTION_STATUSES = [
  "RESOLVED",
  "UNRESOLVED",
  "NEEDS_CUSTOMER_INFO",
  "OUT_OF_SCOPE",
];

function extractOrderId(text) {
  if (typeof text !== "string") return null;

  const explicit = text.match(/\bORD-\d+\b/i);
  if (explicit) return explicit[0].toUpperCase();

  // Supports spoken/typed references such as "order 101".
  const numbered = text.match(/\border\s*(?:number\s*)?#?\s*(\d{3,})\b/i);
  return numbered ? `ORD-${numbered[1]}`.toUpperCase() : null;
}

function parsePlainTextToolCall(content) {
  if (typeof content !== "string") {
    return { looksLikeToolCall: false, call: null };
  }

  const trimmed = content.trim();
  const jsonText = trimmed
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();

  let parsed;

  try {
    parsed = JSON.parse(jsonText);
  } catch {
    return {
      looksLikeToolCall: /^\s*(?:```(?:json)?\s*)?\{/.test(trimmed),
      call: null,
    };
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return { looksLikeToolCall: false, call: null };
  }

  const name = parsed.name || parsed.function?.name;
  const args =
    parsed.parameters ??
    parsed.arguments ??
    parsed.function?.arguments;

  // Only treat JSON as a tool call when it has a tool-like structure.
  if (typeof name !== "string") {
    return { looksLikeToolCall: false, call: null };
  }

  let parameters = args;

  if (typeof parameters === "string") {
    try {
      parameters = JSON.parse(parameters);
    } catch {
      parameters = null;
    }
  }

  return {
    looksLikeToolCall: true,
    call: {
      name,
      arguments:
        parameters && typeof parameters === "object" ? parameters : {},
    },
  };
}

function isToolCallLike(content) {
  return parsePlainTextToolCall(content).looksLikeToolCall;
}

function detectIntent(text) {
  const value = String(text || "").toLowerCase();

  if (/\b(cancel|cancellation)\b/.test(value)) return "ORDER_CANCELLATION";
  if (/\b(return|returning)\b/.test(value)) return "RETURN_REQUEST";
  if (/\b(refund|money back)\b/.test(value)) return "REFUND_REQUEST";
  if (/\b(damaged|defective|broken)\b/.test(value)) return "DAMAGED_PRODUCT";
  if (/\b(shipping|delivery fee|delivery time|how long)\b/.test(value)) {
    return "SHIPPING_POLICY";
  }
  if (/\b(where is|track|tracking|status|order|arrive|delivered)\b/.test(value)) {
    return "ORDER_TRACKING";
  }
  if (/\b(product|serum|sunscreen|face wash|toner)\b/.test(value)) {
    return "PRODUCT_QUERY";
  }

  return "GENERAL_SUPPORT";
}

async function generateConversationalFallback(messages) {
  const response = await ollama.chat({
    model: MODEL,
    messages: [
      ...messages,
      {
        role: "user",
        content:
          "Respond to the customer's latest request in concise, natural language. Never output JSON or describe internal tool calls. If you cannot determine the answer, ask a short clarifying question.",
      },
    ],
    keep_alive: "10m",
    options: { num_predict: 128 },
  });

  const content = response.message?.content?.trim();

  if (content && !isToolCallLike(content)) {
    return content;
  }

  return "I'm sorry, I couldn't process that request properly. Could you please repeat your question?";
}

async function askAria(message, history = []) {
  const startedAt = Date.now();
  let firstModelMs = 0;
  let toolMs = 0;
  let finalModelMs = 0;
  let toolCallCount = 0;

  const cleanHistory = Array.isArray(history)
    ? history
        .filter(
          (item) =>
            item &&
            ["user", "assistant"].includes(item.role) &&
            typeof item.content === "string"
        )
        .slice(-6)
    : [];

  const messages = [
    { role: "system", content: ARIA_PROMPT },
    ...cleanHistory,
    { role: "user", content: message },
  ];

  try {
    let stageStartedAt = Date.now();

    const firstResponse = await ollama.chat({
      model: MODEL,
      messages,
      tools,
      keep_alive: "10m",
      options: { num_predict: 128 },
    });

    firstModelMs = Date.now() - stageStartedAt;

    const structuredCalls = firstResponse.message?.tool_calls || [];
    const plainResult = parsePlainTextToolCall(
      firstResponse.message?.content
    );

    let callsToProcess = structuredCalls;

    if (structuredCalls.length === 0 && plainResult.looksLikeToolCall) {
      // Never return raw tool-call JSON as the customer-facing answer.
      if (!plainResult.call || plainResult.call.name !== "get_order_details") {
        return await generateConversationalFallback(messages);
      }

      callsToProcess = [{ function: plainResult.call }];
    } else if (structuredCalls.length === 0) {
      return firstResponse.message?.content?.trim() ||
        "I'm sorry, I couldn't generate a response. Could you repeat your question?";
    }

    toolCallCount = callsToProcess.length;

    // Resolve a missing ID from the current message or recent conversation.
    const previousCustomerMessages = cleanHistory
      .filter((item) => item.role === "user")
      .map((item) => item.content)
      .reverse();

    const contextualOrderId =
      extractOrderId(message) ||
      previousCustomerMessages.map(extractOrderId).find(Boolean) ||
      null;

    // Preserve Ollama's structured assistant tool-call message.
    if (structuredCalls.length > 0) {
      messages.push(firstResponse.message);
    } else {
      // Some local models return a tool call as plain-text JSON.
      // Normalize it to the tool-call structure expected by the next turn.
      messages.push({
        role: "assistant",
        content: "",
        tool_calls: callsToProcess,
      });
    }

    stageStartedAt = Date.now();
    let executedToolCount = 0;

    for (const call of callsToProcess) {
      if (call?.function?.name !== "get_order_details") {
        continue;
      }

      executedToolCount += 1;

      const suppliedId = call.function.arguments?.order_id;
      let orderId =
        typeof suppliedId === "string"
          ? extractOrderId(suppliedId)
          : null;

      orderId = orderId || contextualOrderId;

      const result = orderId
        ? get_order_details(orderId)
        : {
            found: false,
            message: "Order ID was not provided.",
          };

      messages.push({
        role: "tool",
        tool_name: "get_order_details",
        content: JSON.stringify(result),
      });
    }

    toolMs = Date.now() - stageStartedAt;

    if (executedToolCount === 0) {
      return await generateConversationalFallback(messages);
    }

    stageStartedAt = Date.now();

    const finalResponse = await ollama.chat({
      model: MODEL,
      messages,
      keep_alive: "10m",
      options: { num_predict: 128 },
    });

    finalModelMs = Date.now() - stageStartedAt;

    const answer = finalResponse.message?.content?.trim();

    if (!answer || isToolCallLike(answer)) {
      return await generateConversationalFallback(messages);
    }

    return answer;
  } finally {
    console.info("[AI latency] chat", {
      totalMs: Date.now() - startedAt,
      firstModelMs,
      toolMs,
      finalModelMs,
      historyMessages: cleanHistory.length,
      toolCallCount,
    });
  }
}

async function summarizeCall(transcript) {
  if (!Array.isArray(transcript) || transcript.length === 0) {
    throw new Error("Transcript is empty");
  }

  const transcriptText = transcript
    .map(
      ({ speaker, text }) =>
        `${speaker}: ${String(text || "").trim()}`
    )
    .join("\n");

  const customerText = transcript
    .filter((item) => item.speaker === "Customer")
    .map((item) => String(item.text || ""))
    .join(" ");

  const explicitOrderIds = [
    ...new Set(transcriptText.match(/\bORD-\d+\b/gi) || []),
  ].map((id) => id.toUpperCase());

  const prompt = `Analyze this Aura Skincare support conversation.

TRANSCRIPT:
${transcriptText}

Return only JSON with this structure:
{
  "customer_intent": "${detectIntent(customerText)}",
  "order_id": null,
  "resolution_status": "UNRESOLVED",
  "call_summary": "Short factual summary"
}

Allowed customer_intent: ${CUSTOMER_INTENTS.join(", ")}
Allowed resolution_status: ${RESOLUTION_STATUSES.join(", ")}

Rules:
- Use only facts supported by the transcript.
- order_id must be an explicitly mentioned order ID or null.
- Use NEEDS_CUSTOMER_INFO if essential information is missing.
- Use UNRESOLVED if the issue remains unresolved.
- Do not claim a cancellation, refund, or replacement was completed unless confirmed.
- Keep the summary short.`;

  let response;

  try {
    const startedAt = Date.now();

    response = await ollama.chat({
      model: MODEL,
      format: "json",
      keep_alive: "10m",
      options: { num_predict: 160 },
      messages: [
        {
          role: "system",
          content: "Generate accurate structured JSON summaries for support calls.",
        },
        { role: "user", content: prompt },
      ],
    });

    console.info("[AI latency] summary", {
      totalMs: Date.now() - startedAt,
      transcriptMessages: transcript.length,
    });
  } catch (error) {
    console.error("Ollama summary request failed:", error);
    throw new Error("Ollama summary request failed");
  }

  let result;

  try {
    result = JSON.parse(response.message.content);
  } catch {
    console.error("Invalid JSON returned by Ollama:", response.message.content);
    throw new Error("Ollama returned invalid summary JSON");
  }

  const customerIntent = CUSTOMER_INTENTS.includes(result.customer_intent)
    ? result.customer_intent
    : detectIntent(customerText);

  const orderId =
    typeof result.order_id === "string" &&
    explicitOrderIds.includes(result.order_id.toUpperCase())
      ? result.order_id.toUpperCase()
      : explicitOrderIds[0] || null;

  let resolutionStatus = RESOLUTION_STATUSES.includes(result.resolution_status)
    ? result.resolution_status
    : "UNRESOLVED";

  if (customerIntent === "OUT_OF_SCOPE") {
    resolutionStatus = "OUT_OF_SCOPE";
  }

  const callSummary =
    typeof result.call_summary === "string" && result.call_summary.trim()
      ? result.call_summary.trim()
      : "Customer contacted Aura Skincare support regarding their request.";

  return {
    customer_intent: customerIntent,
    order_id: orderId,
    resolution_status: resolutionStatus,
    call_summary: callSummary,
  };
}

module.exports = {
  askAria,
  summarizeCall,
};

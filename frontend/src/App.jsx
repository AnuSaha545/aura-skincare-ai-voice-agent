
import { useCallback, useEffect, useRef, useState } from "react";
import "./App.css";

const API_URL = "http://localhost:5000/api/ai";
const MAX_RETRIES = 5;

const orders = [
  {
    id: "ORD-101",
    customer: "Priya Sharma",
    product: "Vitamin C Serum (30ml)",
    value: "₹699",
    status: "Out for Delivery",
    courier: "BlueDart",
    tracking: "BD-982103",
    note: "Expected by 6 PM today",
  },
  {
    id: "ORD-102",
    customer: "Rahul Verma",
    product: "Hydrating Sunscreen SPF 50",
    value: "₹499",
    status: "Delivered",
    courier: "Delhivery",
    tracking: "DL-441029",
    note: "Delivered 14 days ago",
  },
  {
    id: "ORD-103",
    customer: "Ananya Patel",
    product: "Green Tea Face Wash + Toner",
    value: "₹850",
    status: "Processing",
    courier: "—",
    tracking: "—",
    note: "Ordered 3 hours ago • Cancellation eligible",
  },
];

function isRawToolCall(text) {
  if (typeof text !== "string") return false;

  const value = text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "");

  try {
    const parsed = JSON.parse(value);

    return Boolean(
      parsed &&
        typeof parsed === "object" &&
        (parsed.name === "get_order_details" ||
          parsed.function?.name === "get_order_details" ||
          (parsed.name &&
            (parsed.parameters || parsed.arguments)))
    );
  } catch {
    return false;
  }
}

function App() {
  const [callState, setCallState] = useState("Idle");
  const [transcript, setTranscript] = useState([]);
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [sessionActive, setSessionActive] = useState(false);

  const recognitionRef = useRef(null);
  const voiceEnabledRef = useRef(false);
  const phaseRef = useRef("idle");
  const conversationRef = useRef([]);
  const transcriptRef = useRef([]);
  const restartTimerRef = useRef(null);
  const requestInFlightRef = useRef(false);
  const abortRef = useRef(null);
  const requestIdRef = useRef(0);
  const retryCountRef = useRef(0);
  const mountedRef = useRef(true);
  const endingRef = useRef(false);
  const utteranceRef = useRef(null);

  const SpeechRecognition =
    typeof window === "undefined"
      ? null
      : window.SpeechRecognition || window.webkitSpeechRecognition;

  const setPhase = useCallback((phase) => {
    phaseRef.current = phase;

    const labels = {
      idle: "Idle",
      listening: "Listening",
      thinking: "Thinking",
      speaking: "Speaking",
    };

    setCallState(labels[phase] || "Idle");
  }, []);

  const clearRestartTimer = useCallback(() => {
    if (restartTimerRef.current !== null) {
      clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
  }, []);

  const addTranscript = useCallback((speaker, text) => {
    const updated = [...transcriptRef.current, { speaker, text }];
    transcriptRef.current = updated;
    setTranscript(updated);
  }, []);

  const stopRecognition = useCallback(() => {
    clearRestartTimer();

    const recognition = recognitionRef.current;
    recognitionRef.current = null;

    if (recognition) {
      recognition.onend = null;
      recognition.onerror = null;
      recognition.onresult = null;

      try {
        recognition.abort();
      } catch {
        // Recognition may already have stopped.
      }
    }
  }, [clearRestartTimer]);

  const cancelSpeech = useCallback(() => {
    const utterance = utteranceRef.current;
    utteranceRef.current = null;

    if (utterance) {
      utterance.onend = null;
      utterance.onerror = null;
    }

    if (typeof window !== "undefined") {
      window.speechSynthesis.cancel();
    }
  }, []);

  const scheduleListening = useCallback(
    (delay = 400) => {
      clearRestartTimer();

      if (
        !voiceEnabledRef.current ||
        phaseRef.current !== "listening" ||
        requestInFlightRef.current ||
        recognitionRef.current
      ) {
        return;
      }

      restartTimerRef.current = setTimeout(() => {
        restartTimerRef.current = null;

        if (
          voiceEnabledRef.current &&
          phaseRef.current === "listening" &&
          !requestInFlightRef.current
        ) {
          startListening();
        }
      }, delay);
    },
    [clearRestartTimer]
  );

  const speak = useCallback(
    (text) => {
      stopRecognition();
      cancelSpeech();

      if (!voiceEnabledRef.current || !text) {
        setPhase(voiceEnabledRef.current ? "listening" : "idle");
        scheduleListening();
        return;
      }

      setPhase("speaking");

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "en-IN";
      utterance.rate = 0.95;
      utterance.pitch = 1;
      utteranceRef.current = utterance;

      const resumeListening = () => {
        if (
          utteranceRef.current !== utterance ||
          !voiceEnabledRef.current
        ) {
          return;
        }

        utteranceRef.current = null;
        setPhase("listening");
        scheduleListening(500);
      };

      utterance.onend = resumeListening;
      utterance.onerror = resumeListening;

      window.speechSynthesis.speak(utterance);
    },
    [cancelSpeech, scheduleListening, setPhase, stopRecognition]
  );

  async function sendMessage(input) {
    const cleanMessage = input.trim();

    if (
      !cleanMessage ||
      requestInFlightRef.current ||
      endingRef.current
    ) {
      return;
    }

    requestInFlightRef.current = true;
    const requestId = ++requestIdRef.current;
    const controller = new AbortController();
    abortRef.current = controller;

    clearRestartTimer();
    stopRecognition();
    setPhase("thinking");
    setError("");
    setSummary(null);
    setSessionActive(true);

    const history = [...conversationRef.current];

    conversationRef.current = [
      ...history,
      { role: "user", content: cleanMessage },
    ];

    addTranscript("Customer", cleanMessage);

    try {
      const response = await fetch(`${API_URL}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: cleanMessage,
          history,
        }),
        signal: controller.signal,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "AI request failed.");
      }

      if (requestId !== requestIdRef.current) return;

      let answer =
        typeof data.response === "string" ? data.response.trim() : "";

      // Frontend safeguard: never display or speak internal tool-call JSON.
      if (!answer || isRawToolCall(answer)) {
        throw new Error(
          "Aria returned an invalid response. Please try the question again."
        );
      }

      conversationRef.current = [
        ...conversationRef.current,
        { role: "assistant", content: answer },
      ];

      addTranscript("Aria", answer);
      requestInFlightRef.current = false;
      abortRef.current = null;

      speak(answer);
    } catch (err) {
      if (
        requestId !== requestIdRef.current ||
        err.name === "AbortError"
      ) {
        return;
      }

      console.error("AI request failed:", err);

      setError(
        err.message ||
          "Unable to connect to Aria. Check that the backend and Ollama are running."
      );

      requestInFlightRef.current = false;
      abortRef.current = null;

      if (voiceEnabledRef.current) {
        setPhase("listening");
        scheduleListening(500);
      } else {
        setPhase("idle");
      }
    }
  }

  function startListening() {
    if (
      !SpeechRecognition ||
      !voiceEnabledRef.current ||
      phaseRef.current !== "listening" ||
      requestInFlightRef.current ||
      recognitionRef.current
    ) {
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-IN";
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      if (
        recognitionRef.current !== recognition ||
        !voiceEnabledRef.current ||
        phaseRef.current !== "listening" ||
        requestInFlightRef.current
      ) {
        return;
      }

      const result = event.results[event.resultIndex];
      const text = result?.[0]?.transcript?.trim();

      if (result?.isFinal && text) {
        retryCountRef.current = 0;
        void sendMessage(text);
      }
    };

    recognition.onerror = (event) => {
      if (recognitionRef.current !== recognition) return;

      console.warn("Speech recognition:", event.error);

      if (
        event.error === "not-allowed" ||
        event.error === "service-not-allowed"
      ) {
        voiceEnabledRef.current = false;
        setError(
          "Microphone access is blocked. Allow microphone access or type your question."
        );
        setPhase("idle");
        return;
      }

      if (event.error === "audio-capture") {
        voiceEnabledRef.current = false;
        setError(
          "No microphone is available. Check your microphone or type your question."
        );
        setPhase("idle");
        return;
      }

      // A silent interval is normal; onend will schedule another attempt.
      if (event.error === "no-speech") return;

      if (event.error === "aborted") return;

      if (event.error === "network") {
        retryCountRef.current += 1;

        if (retryCountRef.current > MAX_RETRIES) {
          voiceEnabledRef.current = false;
          setError(
            "Voice recognition is temporarily unavailable. You can continue by typing."
          );
          setPhase("idle");
          return;
        }
      }
    };

    recognition.onend = () => {
      if (recognitionRef.current !== recognition) return;

      recognitionRef.current = null;

      if (
        voiceEnabledRef.current &&
        phaseRef.current === "listening" &&
        !requestInFlightRef.current
      ) {
        const delay = Math.min(
          400 * 2 ** Math.max(0, retryCountRef.current - 1),
          4000
        );

        scheduleListening(delay);
      }
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
    } catch (err) {
      console.warn("Could not start recognition:", err);
      recognitionRef.current = null;

      if (voiceEnabledRef.current && phaseRef.current === "listening") {
        retryCountRef.current += 1;

        if (retryCountRef.current > MAX_RETRIES) {
          voiceEnabledRef.current = false;
          setError(
            "Voice recognition could not restart. Please use typed input."
          );
          setPhase("idle");
        } else {
          scheduleListening(
            Math.min(400 * 2 ** (retryCountRef.current - 1), 4000)
          );
        }
      }
    }
  }

  function startCall() {
    if (!SpeechRecognition) {
      setError(
        "Speech recognition is not supported in this browser. You can still ask Aria questions by typing."
      );
      return;
    }

    clearRestartTimer();
    stopRecognition();
    cancelSpeech();

    requestIdRef.current += 1;
    abortRef.current?.abort();
    abortRef.current = null;
    requestInFlightRef.current = false;
    endingRef.current = false;
    retryCountRef.current = 0;

    conversationRef.current = [];
    transcriptRef.current = [];

    setTranscript([]);
    setSummary(null);
    setMessage("");
    setError("");
    setSessionActive(true);

    voiceEnabledRef.current = true;
    setPhase("speaking");

    const greeting =
      "Hello, I'm Aria from Aura Skincare. How can I help you today?";

    addTranscript("Aria", greeting);
    speak(greeting);
  }

  async function endCall() {
    if (endingRef.current || !transcriptRef.current.length) return;

    endingRef.current = true;
    voiceEnabledRef.current = false;
    setSessionActive(false);

    requestIdRef.current += 1;
    requestInFlightRef.current = false;
    abortRef.current?.abort();
    abortRef.current = null;

    clearRestartTimer();
    stopRecognition();
    cancelSpeech();
    setError("");
    setPhase("thinking");

    const currentTranscript = [...transcriptRef.current];
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const response = await fetch(`${API_URL}/summary`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript: currentTranscript }),
        signal: controller.signal,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to generate call summary.");
      }

      if (mountedRef.current) setSummary(data);
    } catch (err) {
      if (err.name !== "AbortError") {
        console.error("Summary error:", err);
        if (mountedRef.current) {
          setError(err.message || "Unable to generate call summary.");
        }
      }
    } finally {
      abortRef.current = null;
      endingRef.current = false;

      if (mountedRef.current) setPhase("idle");
    }
  }

  function handleSubmit(event) {
    event.preventDefault();

    if (!message.trim() || requestInFlightRef.current) return;

    const submittedMessage = message;
    setMessage("");
    void sendMessage(submittedMessage);
  }

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      voiceEnabledRef.current = false;
      requestIdRef.current += 1;

      abortRef.current?.abort();
      abortRef.current = null;

      clearRestartTimer();

      const recognition = recognitionRef.current;
      recognitionRef.current = null;

      if (recognition) {
        recognition.onend = null;
        recognition.onerror = null;
        recognition.onresult = null;

        try {
          recognition.abort();
        } catch {
          // Recognition may already have stopped.
        }
      }

      const utterance = utteranceRef.current;
      utteranceRef.current = null;

      if (utterance) {
        utterance.onend = null;
        utterance.onerror = null;
      }

      window.speechSynthesis.cancel();
    };
  }, [clearRestartTimer]);

  const sendDisabled =
    !message.trim() || callState === "Thinking";

  return (
    <div className="app">
      <header className="header">
        <div>
          <h1>Aura Skincare</h1>
          <p>AI Customer Support</p>
        </div>

        <div className={`state ${callState.toLowerCase()}`}>
          <span className="state-dot" />
          {callState}
        </div>
      </header>

      <main>
        <section className="hero">
          <div className="aria-card">
            <div className="avatar">A</div>
            <div>
              <h2>Aria</h2>
              <p>AI Customer Support Specialist</p>
            </div>
          </div>

          <div className="call-controls">
            <button
              className="start-btn"
              onClick={startCall}
              disabled={sessionActive || callState !== "Idle"}
            >
              🎙 Start Call
            </button>

            <button
              className="end-btn"
              onClick={endCall}
              disabled={!sessionActive || transcript.length === 0}
            >
              End Call
            </button>
          </div>

          <form className="message-form" onSubmit={handleSubmit}>
            <input
              aria-label="Type a question for Aria"
              className="message-input"
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Type your question for Aria..."
              value={message}
              disabled={callState === "Thinking"}
            />

            <button
              className="send-btn"
              type="submit"
              disabled={sendDisabled}
            >
              Send
            </button>
          </form>

          {error && <p className="error" role="alert">{error}</p>}
        </section>

        <section>
          <h2 className="section-title">Test Orders</h2>

          <div className="orders-grid">
            {orders.map((order) => (
              <div className="order-card" key={order.id}>
                <div className="order-top">
                  <strong>{order.id}</strong>
                  <span>{order.status}</span>
                </div>

                <div className="order-info">
                  <div>
                    <label>Customer</label>
                    <p>{order.customer}</p>
                  </div>
                  <div>
                    <label>Product</label>
                    <p>{order.product}</p>
                  </div>
                  <div>
                    <label>Order Value</label>
                    <p className="value">{order.value}</p>
                  </div>
                  <div>
                    <label>Delivery</label>
                    <p>{order.courier}</p>
                  </div>
                  <div>
                    <label>Tracking</label>
                    <p>{order.tracking}</p>
                  </div>
                </div>

                <small>{order.note}</small>
              </div>
            ))}
          </div>
        </section>

        <section className="conversation">
          <div className="panel">
            <h2>Call Transcript</h2>

            {transcript.length === 0 ? (
              <p className="empty">
                Start a call or type a question to see the conversation here.
              </p>
            ) : (
              <div className="messages">
                {transcript.map((item, index) => (
                  <div
                    className={`message ${
                      item.speaker === "Aria" ? "aria" : "customer"
                    }`}
                    key={`${index}-${item.speaker}`}
                  >
                    <strong>{item.speaker}</strong>
                    <p>{item.text}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="panel">
            <h2>Call Summary</h2>

            {!summary ? (
              <p className="empty">
                Summary will appear after you end the conversation.
              </p>
            ) : (
              <div className="summary">
                <div className="summary-row">
                  <span>Customer Intent</span>
                  <strong>{summary.customer_intent}</strong>
                </div>

                <div className="summary-row">
                  <span>Order ID</span>
                  <strong>{summary.order_id || "None"}</strong>
                </div>

                <div className="summary-row">
                  <span>Resolution</span>
                  <strong>{summary.resolution_status}</strong>
                </div>

                <div className="summary-text">
                  <span>Summary</span>
                  <p>{summary.call_summary}</p>
                </div>

                <details className="json-view">
                  <summary>View JSON</summary>
                  <pre>{JSON.stringify(summary, null, 2)}</pre>
                </details>
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;

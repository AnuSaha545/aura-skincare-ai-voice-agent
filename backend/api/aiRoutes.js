const express = require("express");
const {
  askAria,
  summarizeCall,
} = require("../services/aiService");

const router = express.Router();

router.post("/chat", async (req, res) => {
  try {
    const { message, history = [] } = req.body || {};

    if (typeof message !== "string" || !message.trim()) {
      return res.status(400).json({
        error: "Message is required",
      });
    }

    if (!Array.isArray(history)) {
      return res.status(400).json({
        error: "History must be an array",
      });
    }

    const response = await askAria(message.trim(), history);

    res.json({
      response,
    });
  } catch (error) {
    console.error("AI chat error:", error);

    res.status(500).json({
      error: error.message || "AI service failed",
    });
  }
});

router.post("/summary", async (req, res) => {
  try {
    const { transcript } = req.body || {};

    if (
      !Array.isArray(transcript) ||
      transcript.length === 0 ||
      transcript.length > 200 ||
      transcript.some(
        (item) =>
          !item ||
          typeof item.speaker !== "string" ||
          typeof item.text !== "string"
      )
    ) {
      return res.status(400).json({
        error: "Transcript is required",
      });
    }

    const summary = await summarizeCall(
      transcript
    );

    res.json(summary);
  } catch (error) {
    console.error("Summary error:", error);

    res.status(500).json({
      error:
        error.message ||
        "Unable to generate a valid call summary",
    });
  }
});

module.exports = router;
const express = require("express");
const {
  askAria,
  summarizeCall,
} = require("../services/aiService");

const router = express.Router();

router.post("/chat", async (req, res) => {
  try {
    const {
      message,
      history = [],
    } = req.body;

    if (!message || typeof message !== "string") {
      return res.status(400).json({
        error: "Message is required",
      });
    }

    const response = await askAria(
      message,
      history
    );

    res.json({
      response,
    });
  } catch (error) {
    console.error("AI chat error:", error);

    res.status(500).json({
      error: "AI service failed",
    });
  }
});

router.post("/summary", async (req, res) => {
  try {
    const { transcript } = req.body;

    if (
      !Array.isArray(transcript) ||
      transcript.length === 0
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
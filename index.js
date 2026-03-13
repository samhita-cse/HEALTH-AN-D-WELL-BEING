const express = require("express");
const path = require("path");

const app = express();
const rootDir = __dirname;

app.use(express.json({ limit: "1mb" }));
app.use(express.static(rootDir));

app.post("/api/chat", async (req, res) => {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const model = process.env.ANTHROPIC_MODEL || "claude-3-5-sonnet-latest";
  const message = String(req.body?.message || "").trim();

  if (!message) {
    return res.status(400).json({ error: "Message is required." });
  }

  if (!apiKey) {
    return res.status(503).json({ error: "Anthropic API key is not configured on the server." });
  }

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model,
        max_tokens: 220,
        system: "You are a warm mental wellness companion inside a student-friendly health app. Keep responses supportive, concise, emotionally aware, and practical. Use a few friendly emojis. Do not claim to be a therapist. If the user seems at risk of self-harm or in immediate danger, strongly encourage reaching local emergency services or a trusted adult right away.",
        messages: [
          {
            role: "user",
            content: message
          }
        ]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).json({ error: errorText || "Anthropic request failed." });
    }

    const data = await response.json();
    const reply = Array.isArray(data.content)
      ? data.content.filter((item) => item.type === "text").map((item) => item.text).join("\n").trim()
      : "";

    return res.json({ reply: reply || "I'm here for you. Tell me a little more about what you're feeling. 💙" });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Server chat error." });
  }
});

app.get("/", (_req, res) => {
  res.sendFile(path.join(rootDir, "index (3).html"));
});

app.listen(process.env.PORT || 3000);

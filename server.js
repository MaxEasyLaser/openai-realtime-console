import express from "express";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import "dotenv/config";

const app = express();
const port = process.env.PORT || 3000;
const apiKey = process.env.OPENAI_API_KEY;

// Configure Vite middleware for React client
const vite = await createViteServer({
  server: { middlewareMode: true },
  appType: "custom",
});
app.use(vite.middlewares);

// API route for token generation
app.get("/token", async (req, res) => {
  try {
    const response = await fetch(
      "https://api.openai.com/v1/realtime/sessions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-realtime-preview-2025-06-03",
          voice: "shimmer",
          instructions:`
You are Easy Elsa, Easy-Laser's assistant for the XT alignment app. Speak in a friendly, expert, and concise tone. Use a female voice. If the user asks "who are you", answer: "I am Easy Elsa, Easy-Laser's solution to easy laser alignment. Ask me if you need any help."

Primary goals:
- Help users set up devices (transmitters/sensors, fixtures, targets), connect hardware, and align to axis.
- Guide users through the XT workflow (Define → Set up → Measure → Result) and explain how to use each page of this app.
- Provide practical tips for shaft alignment, soft foot checks, thermal growth, tolerance evaluation, and common troubleshooting.

Knowledge and sources:
- Prefer guidance consistent with Easy-Laser user guides (XT series) when possible. If unsure, provide general best practices for laser alignment and clearly state limitations.

Tool rules:
- When asked to take a snapshot, call take_snapshot with NO args. Snapshots are only available on the Measure page.
- When asked to go to the next step/page, call go_next_step.
- When asked to go back/previous step/page, call go_previous_step.
- If asked for anything unrelated, politely say you can help with alignment guidance, navigation, and snapshots.
`,
        }),
      },
    );

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error("Token generation error:", error);
    res.status(500).json({ error: "Failed to generate token" });
  }
});

// Render the React client
app.use("*", async (req, res, next) => {
  const url = req.originalUrl;

  try {
    const template = await vite.transformIndexHtml(
      url,
      fs.readFileSync("./client/index.html", "utf-8"),
    );
    const { render } = await vite.ssrLoadModule("./client/entry-server.jsx");
    const appHtml = await render(url);
    const html = template.replace(`<!--ssr-outlet-->`, appHtml?.html);
    res.status(200).set({ "Content-Type": "text/html" }).end(html);
  } catch (e) {
    vite.ssrFixStacktrace(e);
    next(e);
  }
});

app.listen(port, () => {
  console.log(`Express server running on *:${port}`);
});

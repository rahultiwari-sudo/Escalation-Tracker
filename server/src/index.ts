import "dotenv/config";
import express from "express";
import cors from "cors";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import db from "./db/connection.js";
import { ticketsRouter } from "./routes/tickets.js";
import { startSlaCron } from "./services/cron.js";
import { startGmailPolling } from "./services/gmail.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Ensure DB schema exists on boot (idempotent)
const schema = fs.readFileSync(path.join(__dirname, "db/schema.sql"), "utf-8");
db.exec(schema);

const app = express();
app.use(cors());
app.use(express.json());

app.use("/api/tickets", ticketsRouter);

app.get("/api/health", (_req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Escalation Tracker API running on http://localhost:${PORT}`);
  startSlaCron();
  startGmailPolling(Number(process.env.GMAIL_POLL_MINUTES) || 5);
});

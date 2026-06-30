import cron from "node-cron";
import { checkSlaBreaches } from "./sla.js";

/**
 * Runs every 15 minutes. Adjust schedule as needed once in production.
 * Replace the console.log with a Slack/email notifier when ready.
 */
export function startSlaCron() {
  cron.schedule("*/15 * * * *", () => {
    const breached = checkSlaBreaches();
    if (breached.length > 0) {
      console.log(`[SLA] ${breached.length} ticket(s) newly breached:`, breached.join(", "));
      // TODO: hook into Slack webhook / email notifier here
    }
  });
  console.log("[SLA] Cron scheduler started (every 15 min).");
}

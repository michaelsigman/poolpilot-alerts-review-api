import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { BigQuery } from "@google-cloud/bigquery";

dotenv.config();

// -----------------------------
// App setup
// -----------------------------
const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;
const PROJECT_ID = "poolpilot-analytics";

// -----------------------------
// BigQuery client
// -----------------------------
const bigquery = new BigQuery({
  projectId: PROJECT_ID,
});

// -----------------------------
// Helpers
// -----------------------------
function escapeString(value) {
  if (typeof value !== "string") return value;
  return value.replace(/'/g, "\\'");
}

// -----------------------------
// Health check
// -----------------------------
app.get("/health", async (req, res) => {
  try {
    const query = `
      SELECT COUNT(*) AS case_count
      FROM \`poolpilot-analytics.pool_analytics.alert_cases\`
    `;

    const [rows] = await bigquery.query({ query });

    res.json({
      ok: true,
      case_count: rows[0].case_count,
    });
  } catch (err) {
    console.error("❌ Health check failed:", err);
    res.status(500).json({
      ok: false,
      error: err.message,
    });
  }
});

// -----------------------------
// GET /cases
// Open + observing cases
// -----------------------------
app.get("/cases", async (req, res) => {
  try {
    const query = `
      SELECT
        case_id,
        agency_name,
        system_name,
        body_type,
        issue_type,
        status,
        opened_at,
        alert_count,

        start_pool_temp,
        last_pool_temp,
        start_spa_temp,
        last_spa_temp,

        expected_behavior,
        suppress_until,
        human_verdict,

        TIMESTAMP_DIFF(CURRENT_TIMESTAMP(), opened_at, MINUTE) AS minutes_open
      FROM \`poolpilot-analytics.pool_analytics.alert_cases\`
      WHERE status IN ('open', 'observing')
      ORDER BY opened_at ASC
    `;

    const [rows] = await bigquery.query({ query });
    res.json(rows);
  } catch (err) {
    console.error("❌ GET /cases failed:", err);
    res.status(500).json({ error: err.message });
  }
});

// -----------------------------
// GET /cases/:case_id
// Case detail
// -----------------------------
app.get("/cases/:case_id", async (req, res) => {
  const { case_id } = req.params;

  try {
    const query = `
      SELECT *
      FROM \`poolpilot-analytics.pool_analytics.alert_cases\`
      WHERE case_id = @case_id
      LIMIT 1
    `;

    const [rows] = await bigquery.query({
      query,
      params: { case_id },
    });

    if (!rows.length) {
      return res.status(404).json({ error: "Case not found" });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error("❌ GET /cases/:case_id failed:", err);
    res.status(500).json({ error: err.message });
  }
});

// -----------------------------
// ✅ GET /cases/:case_id/snapshots
// FIXED VERSION (NO COALESCE BUG)
// -----------------------------
app.get("/cases/:case_id/snapshots", async (req, res) => {
  const { case_id } = req.params;

  try {
    // 1️⃣ Load case metadata
    const caseQuery = `
      SELECT
        system_id,
        opened_at,
        first_alert_snapshot_ts
      FROM \`poolpilot-analytics.pool_analytics.alert_cases\`
      WHERE case_id = @case_id
      LIMIT 1
    `;

    const [caseRows] = await bigquery.query({
      query: caseQuery,
      params: { case_id },
    });

    if (!caseRows.length) {
      return res.status(404).json({ error: "Case not found" });
    }

    const {
      system_id,
      opened_at,
      first_alert_snapshot_ts,
    } = caseRows[0];

    // 2️⃣ Decide snapshot start time in JS (important)
    const startTs = first_alert_snapshot_ts || opened_at;

    // 3️⃣ Query snapshots
    const snapshotQuery = `
      SELECT
        snapshot_ts,
        pool_temp,
        spa_temp,
        set_point_pool,
        set_point_spa,
        pool_heater,
        spa_heater,
        filter_pump,
        spa_pump,
        service_mode
      FROM \`poolpilot-analytics.pool_analytics.pool_snapshots\`
      WHERE system_id = @system_id
        AND snapshot_ts >= @start_ts
      ORDER BY snapshot_ts ASC
      LIMIT 300
    `;

    const [snapshots] = await bigquery.query({
      query: snapshotQuery,
      params: {
        system_id,
        start_ts: startTs,
      },
    });

    res.json({
      case_id,
      system_id,
      start_ts,
      snapshot_count: snapshots.length,
      snapshots,
    });
  } catch (err) {
    console.error("❌ GET /cases/:case_id/snapshots failed:", err);
    res.status(500).json({ error: err.message });
  }
});

// -----------------------------
// POST /cases/:case_id/feedback
// Human-in-the-loop updates
// -----------------------------
app.post("/cases/:case_id/feedback", async (req, res) => {
  const { case_id } = req.params;
  const {
    human_verdict,
    expected_behavior,
    suppression_reason,
    suppress_hours,
    resolution_reason,
  } = req.body;

  const updates = [];

  if (human_verdict) {
    updates.push(`human_verdict = '${escapeString(human_verdict)}'`);
  }

  if (expected_behavior !== undefined) {
    updates.push(`expected_behavior = ${expected_behavior}`);
  }

  if (suppression_reason) {
    updates.push(
      `suppression_reason = '${escapeString(suppression_reason)}'`
    );
  }

  if (suppress_hours) {
    updates.push(
      `suppress_until = TIMESTAMP_ADD(CURRENT_TIMESTAMP(), INTERVAL ${Number(
        suppress_hours
      )} HOUR)`
    );
  }

  if (resolution_reason) {
    updates.push(
      `resolution_reason = '${escapeString(resolution_reason)}'`
    );
  }

  updates.push(`last_updated = CURRENT_TIMESTAMP()`);
  updates.push(`updated_at = CURRENT_TIMESTAMP()`);

  if (!updates.length) {
    return res.status(400).json({
      error: "No valid fields provided",
    });
  }

  const query = `
    UPDATE \`poolpilot-analytics.pool_analytics.alert_cases\`
    SET ${updates.join(", ")}
    WHERE case_id = @case_id
  `;

  try {
    await bigquery.query({
      query,
      params: { case_id },
    });

    res.json({ success: true });
  } catch (err) {
    console.error("❌ POST /cases/:case_id/feedback failed:", err);
    res.status(500).json({ error: err.message });
  }
});

// -----------------------------
// Start server
// -----------------------------
app.listen(PORT, () => {
  console.log(`🚀 Alerts Review API running on port ${PORT}`);
});

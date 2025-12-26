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
    res.status(500).json({ ok: false, error: err.message });
  }
});

// -----------------------------
// GET /cases (open + observing)
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
        human_verdict,
        expected_behavior,
        suppress_until,
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
// GET /cases/:case_id (detail)
// -----------------------------
app.get("/cases/:case_id", async (req, res) => {
  const { case_id } = req.params;

  try {
    const query = `
      SELECT
        *
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
// -----------------------------
app.get("/cases/:case_id/snapshots", async (req, res) => {
  const { case_id } = req.params;

  try {
    // 1️⃣ Get case metadata
    const caseQuery = `
      SELECT
        system_id,
        body_type,
        opened_at
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

    const { system_id, body_type, opened_at } = caseRows[0];

    // 2️⃣ Pull snapshots
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
        AND snapshot_ts >= @opened_at
      ORDER BY snapshot_ts ASC
      LIMIT 200
    `;

    const [snapshots] = await bigquery.query({
      query: snapshotQuery,
      params: { system_id, opened_at },
    });

    res.json({
      case_id,
      body_type,
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
    updates.push(`suppression_reason = '${escapeString(suppression_reason)}'`);
  }

  if (suppress_hours) {
    updates.push(
      `suppress_until = TIMESTAMP_ADD(CURRENT_TIMESTAMP(), INTERVAL ${Number(
        suppress_hours
      )} HOUR)`
    );
  }

  if (resolution_reason) {
    updates.push(`resolution_reason = '${escapeString(resolution_reason)}'`);
  }

  updates.push(`last_updated = CURRENT_TIMESTAMP()`);
  updates.push(`updated_at = CURRENT_TIMESTAMP()`);

  const query = `
    UPDATE \`poolpilot-analytics.pool_analytics.alert_cases\`
    SET ${updates.join(", ")}
    WHERE case_id = @case_id
  `;

  await bigquery.query({ query, params: { case_id } });
  res.json({ success: true });
});

// -----------------------------
// Start server
// -----------------------------
app.listen(PORT, () => {
  console.log(`🚀 Alerts Review API running on port ${PORT}`);
});

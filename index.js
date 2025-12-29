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
    res.json({ ok: true, case_count: rows[0].case_count });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// -----------------------------
// GET /cases
// Returns ALL cases (frontend segments)
// -----------------------------
app.get("/cases", async (req, res) => {
  try {
    const query = `
      SELECT
        case_id,
        system_id,
        agency_name,
        system_name,
        body_type,
        issue_type,

        status,
        classification,
        human_verdict,

        opened_at,
        resolved_at,

        alert_count,

        TIMESTAMP_DIFF(
          COALESCE(resolved_at, CURRENT_TIMESTAMP()),
          opened_at,
          MINUTE
        ) AS minutes_open,

        start_pool_temp,
        start_spa_temp,
        start_air_temp,
        last_pool_temp,
        last_spa_temp,
        last_air_temp,

        start_set_point_pool,
        start_set_point_spa,
        last_set_point_pool,
        last_set_point_spa,

        start_filter_pump,
        start_spa_pump,
        start_pool_heater,
        start_spa_heater,
        last_filter_pump,
        last_spa_pump,
        last_pool_heater,
        last_spa_heater,

        expected_behavior,
        suppress_until,

        created_at,
        updated_at,
        last_updated

      FROM \`poolpilot-analytics.pool_analytics.alert_cases\`
      ORDER BY
        status != 'open',
        opened_at DESC
    `;

    const [rows] = await bigquery.query({ query });
    res.json(rows);
  } catch (err) {
    console.error("❌ GET /cases failed:", err);
    res.status(500).json({ error: err.message });
  }
});

// -----------------------------
// GET /cases/:case_id/snapshots
// Returns snapshots ONLY for this case window
// -----------------------------
app.get("/cases/:case_id/snapshots", async (req, res) => {
  const { case_id } = req.params;

  try {
    const query = `
      WITH c AS (
        SELECT
          system_id,
          opened_at,
          COALESCE(resolved_at, CURRENT_TIMESTAMP()) AS end_ts,
          body_type
        FROM \`poolpilot-analytics.pool_analytics.alert_cases\`
        WHERE case_id = @case_id
      )
      SELECT
        s.snapshot_ts,
        s.air_temp,
        s.pool_temp,
        s.spa_temp,
        CASE
          WHEN c.body_type = 'pool' THEN s.set_point_pool
          ELSE s.set_point_spa
        END AS set_point,
        s.pool_heater,
        s.spa_heater,
        s.filter_pump,
        s.spa_pump,
        s.service_mode
      FROM \`poolpilot-analytics.pool_analytics.pool_snapshots\` s
      JOIN c ON s.system_id = c.system_id
      WHERE s.snapshot_ts BETWEEN c.opened_at AND c.end_ts
      ORDER BY s.snapshot_ts ASC
    `;

    const [rows] = await bigquery.query({
      query,
      params: { case_id },
    });

    res.json(rows);
  } catch (err) {
    console.error("❌ GET /snapshots failed:", err);
    res.status(500).json({ error: err.message });
  }
});

// -----------------------------
// Start server
// -----------------------------
app.listen(PORT, () => {
  console.log(`🚀 Alerts Review API running on port ${PORT}`);
});

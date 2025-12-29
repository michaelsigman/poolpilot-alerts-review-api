import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { BigQuery } from "@google-cloud/bigquery";

dotenv.config();

/* =====================================================
   App setup
===================================================== */
const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;
const PROJECT_ID = "poolpilot-analytics";

/* =====================================================
   BigQuery client
===================================================== */
const bigquery = new BigQuery({
  projectId: PROJECT_ID,
});

const QUERY_OPTIONS = {
  useQueryCache: false,
};

/* =====================================================
   Health check
===================================================== */
app.get("/health", async (req, res) => {
  try {
    const query = `
      SELECT COUNT(*) AS case_count
      FROM \`poolpilot-analytics.pool_analytics.alert_cases\`
    `;

    const [rows] = await bigquery.query({ query, ...QUERY_OPTIONS });

    res.json({
      ok: true,
      case_count: rows[0].case_count,
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

/* =====================================================
   ALL cases (single source of truth)
===================================================== */
app.get("/cases", async (req, res) => {
  try {
    const query = `
      SELECT
        case_id,
        system_id,
        system_name,
        agency_name,
        body_type,
        issue_type,
        status,

        opened_at,
        DATETIME(opened_at, "America/Los_Angeles") AS opened_at_pst,

        resolved_at,
        DATETIME(resolved_at, "America/Los_Angeles") AS resolved_at_pst,

        TIMESTAMP_DIFF(
          IFNULL(resolved_at, CURRENT_TIMESTAMP()),
          opened_at,
          MINUTE
        ) AS minutes_open

      FROM \`poolpilot-analytics.pool_analytics.alert_cases\`
      ORDER BY opened_at DESC
      LIMIT 500
    `;

    const [rows] = await bigquery.query({ query, ...QUERY_OPTIONS });
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* =====================================================
   Single case detail
===================================================== */
app.get("/cases/:case_id", async (req, res) => {
  const { case_id } = req.params;

  try {
    const query = `
      SELECT
        case_id,
        system_id,
        system_name,
        agency_name,
        body_type,
        issue_type,
        status,

        opened_at,
        DATETIME(opened_at, "America/Los_Angeles") AS opened_at_pst,

        resolved_at,
        DATETIME(resolved_at, "America/Los_Angeles") AS resolved_at_pst,

        TIMESTAMP_DIFF(
          IFNULL(resolved_at, CURRENT_TIMESTAMP()),
          opened_at,
          MINUTE
        ) AS minutes_open

      FROM \`poolpilot-analytics.pool_analytics.alert_cases\`
      WHERE case_id = @case_id
      LIMIT 1
    `;

    const [rows] = await bigquery.query({
      query,
      params: { case_id },
      ...QUERY_OPTIONS,
    });

    if (!rows.length) {
      return res.status(404).json({ error: "Case not found" });
    }

    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* =====================================================
   Snapshots for a case (PST-safe)
===================================================== */
app.get("/cases/:case_id/snapshots", async (req, res) => {
  const { case_id } = req.params;

  try {
    const query = `
      WITH c AS (
        SELECT
          system_id,
          body_type,
          opened_at,
          IFNULL(resolved_at, CURRENT_TIMESTAMP()) AS end_ts
        FROM \`poolpilot-analytics.pool_analytics.alert_cases\`
        WHERE case_id = @case_id
        LIMIT 1
      )
      SELECT
        s.snapshot_ts,
        DATETIME(s.snapshot_ts, "America/Los_Angeles") AS snapshot_pst,

        s.air_temp,
        s.pool_temp,
        s.spa_temp,
        s.set_point_pool,
        s.set_point_spa,

        s.pool_heater,
        s.spa_heater,
        s.filter_pump,
        s.spa_pump,
        s.service_mode

      FROM \`poolpilot-analytics.pool_analytics.pool_snapshots\` s
      JOIN c ON c.system_id = s.system_id
      WHERE s.snapshot_ts BETWEEN c.opened_at AND c.end_ts
      ORDER BY s.snapshot_ts ASC
    `;

    const [rows] = await bigquery.query({
      query,
      params: { case_id },
      ...QUERY_OPTIONS,
    });

    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* =====================================================
   Start server
===================================================== */
app.listen(PORT, () => {
  console.log(`🚀 PoolPilot Alerts Review API running on port ${PORT}`);
});

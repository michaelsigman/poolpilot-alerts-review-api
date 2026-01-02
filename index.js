import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import crypto from "crypto";
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
   Helpers
===================================================== */
function makeNote({ text, type = "note", author = "internal" }) {
  return {
    id: crypto.randomUUID(),
    text: text.trim(),
    author,
    created_at: new Date().toISOString(),
    type, // "note" | "resolution"
  };
}

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
    res.json({ ok: true, case_count: rows[0].case_count });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

/* =====================================================
   ALL cases (dashboard)
===================================================== */
app.get("/cases", async (req, res) => {
  try {
    const query = `
      SELECT
        case_id,
        system_id,
        system_name,
        agency_id,
        agency_name,
        body_type,
        issue_type,
        status,
        IFNULL(JSON_QUERY_ARRAY(notes), []) AS notes,
        opened_at,
        resolved_at,
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
    console.error("GET /cases failed", err);
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
        agency_id,
        agency_name,
        body_type,
        issue_type,
        status,
        IFNULL(JSON_QUERY_ARRAY(notes), []) AS notes,
        resolved_reason,
        opened_at,
        resolved_at,
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
    console.error("GET /cases/:id failed", err);
    res.status(500).json({ error: err.message });
  }
});

/* =====================================================
   Snapshots for a case
===================================================== */
app.get("/cases/:case_id/snapshots", async (req, res) => {
  const { case_id } = req.params;

  try {
    const query = `
      WITH c AS (
        SELECT
          system_id,
          opened_at,
          IFNULL(resolved_at, CURRENT_TIMESTAMP()) AS end_ts
        FROM \`poolpilot-analytics.pool_analytics.alert_cases\`
        WHERE case_id = @case_id
        LIMIT 1
      )
      SELECT
        s.snapshot_ts,
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
      WHERE s.snapshot_ts BETWEEN
        TIMESTAMP_SUB(c.opened_at, INTERVAL 2 HOUR)
        AND
        TIMESTAMP_ADD(c.end_ts, INTERVAL 2 HOUR)
      ORDER BY s.snapshot_ts ASC
    `;

    const [rows] = await bigquery.query({
      query,
      params: { case_id },
      ...QUERY_OPTIONS,
    });

    res.json(rows);
  } catch (err) {
    console.error("Snapshots failed", err);
    res.status(500).json({ error: err.message });
  }
});

/* =====================================================
   Add a note (append-only)
===================================================== */
app.post("/cases/:case_id/notes", async (req, res) => {
  const { case_id } = req.params;
  const { text } = req.body;

  if (!text || text.trim().length < 2) {
    return res.status(400).json({ error: "Note text required" });
  }

  const note = makeNote({ text });

  try {
    const query = `
      UPDATE \`poolpilot-analytics.pool_analytics.alert_cases\`
      SET notes = IF(
        notes IS NULL,
        TO_JSON([@note]),
        JSON_ARRAY_APPEND(notes, '$', @note)
      )
      WHERE case_id = @case_id
        AND status = 'open'
    `;

    const [job] = await bigquery.createQueryJob({
      query,
      params: { case_id, note },
      ...QUERY_OPTIONS,
    });

    await job.getQueryResults();

    res.json({ ok: true, note });
  } catch (err) {
    console.error("Add note failed", err);
    res.status(500).json({ error: err.message });
  }
});

/* =====================================================
   Resolve case (with reason)
===================================================== */
app.post("/cases/:case_id/resolve", async (req, res) => {
  const { case_id } = req.params;
  const { resolved_reason } = req.body;

  if (!resolved_reason || resolved_reason.trim().length < 5) {
    return res.status(400).json({
      error: "Resolution reason required (min 5 characters)",
    });
  }

  const resolutionNote = makeNote({
    text: resolved_reason,
    type: "resolution",
  });

  try {
    const query = `
      UPDATE \`poolpilot-analytics.pool_analytics.alert_cases\`
      SET
        status = 'resolved',
        resolved_at = CURRENT_TIMESTAMP(),
        resolved_reason = @resolved_reason,
        notes = IF(
          notes IS NULL,
          TO_JSON([@resolutionNote]),
          JSON_ARRAY_APPEND(notes, '$', @resolutionNote)
        )
      WHERE case_id = @case_id
        AND status = 'open'
    `;

    const [job] = await bigquery.createQueryJob({
      query,
      params: {
        case_id,
        resolved_reason: resolved_reason.trim(),
        resolutionNote,
      },
      ...QUERY_OPTIONS,
    });

    await job.getQueryResults();

    res.json({ ok: true, case_id });
  } catch (err) {
    console.error("Resolve case failed", err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

/* =====================================================
   Start server
===================================================== */
app.listen(PORT, () => {
  console.log(`🚀 PoolPilot Alerts Review API running on port ${PORT}`);
});

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
const bigquery = new BigQuery({ projectId: PROJECT_ID });

const QUERY_OPTIONS = { useQueryCache: false };

/* =====================================================
   Helpers
===================================================== */
function makeNote({ text, type = "note", author = "internal" }) {
  return {
    id: crypto.randomUUID(),
    text: text.trim(),
    author,
    created_at: new Date().toISOString(),
    type,
  };
}

/* =====================================================
   Health
===================================================== */
app.get("/health", async (_, res) => {
  try {
    const [rows] = await bigquery.query(`
      SELECT COUNT(*) AS case_count
      FROM \`poolpilot-analytics.pool_analytics.alert_cases\`
    `);
    res.json({ ok: true, case_count: rows[0].case_count });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

/* =====================================================
   Shared notes projection (IMPORTANT)
===================================================== */
const NOTES_SQL = `
  ARRAY(
    SELECT AS STRUCT
      JSON_VALUE(n, '$.id') AS id,
      JSON_VALUE(n, '$.text') AS text,
      JSON_VALUE(n, '$.author') AS author,
      JSON_VALUE(n, '$.created_at') AS created_at,
      JSON_VALUE(n, '$.type') AS type
    FROM UNNEST(JSON_QUERY_ARRAY(notes)) AS n
  )
`;

/* =====================================================
   Dashboard cases
===================================================== */
app.get("/cases", async (_, res) => {
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
        IF(notes IS NULL, [], ${NOTES_SQL}) AS notes,
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
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

/* =====================================================
   Case detail
===================================================== */
app.get("/cases/:case_id", async (req, res) => {
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
        IF(notes IS NULL, [], ${NOTES_SQL}) AS notes,
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
      params: { case_id: req.params.case_id },
      ...QUERY_OPTIONS,
    });

    if (!rows.length) return res.status(404).json({ error: "Not found" });
    res.json(rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
});

/* =====================================================
   Snapshots (unchanged)
===================================================== */
app.get("/cases/:case_id/snapshots", async (req, res) => {
  const query = `
    WITH c AS (
      SELECT system_id, opened_at,
        IFNULL(resolved_at, CURRENT_TIMESTAMP()) AS end_ts
      FROM \`poolpilot-analytics.pool_analytics.alert_cases\`
      WHERE case_id = @case_id
      LIMIT 1
    )
    SELECT *
    FROM \`poolpilot-analytics.pool_analytics.pool_snapshots\` s
    JOIN c ON c.system_id = s.system_id
    WHERE s.snapshot_ts BETWEEN
      TIMESTAMP_SUB(c.opened_at, INTERVAL 2 HOUR)
      AND TIMESTAMP_ADD(c.end_ts, INTERVAL 2 HOUR)
    ORDER BY snapshot_ts ASC
  `;

  const [rows] = await bigquery.query({
    query,
    params: { case_id: req.params.case_id },
    ...QUERY_OPTIONS,
  });

  res.json(rows);
});

/* =====================================================
   Add note
===================================================== */
app.post("/cases/:case_id/notes", async (req, res) => {
  const { text } = req.body;
  if (!text?.trim()) return res.status(400).json({ error: "Note required" });

  const note = makeNote({ text });

  const query = `
    UPDATE \`poolpilot-analytics.pool_analytics.alert_cases\`
    SET notes = IF(
      notes IS NULL,
      TO_JSON([@note]),
      JSON_ARRAY_APPEND(notes, '$', @note)
    )
    WHERE case_id = @case_id AND status = 'open'
  `;

  await bigquery.query({
    query,
    params: { case_id: req.params.case_id, note },
    ...QUERY_OPTIONS,
  });

  res.json({ ok: true, note });
});

/* =====================================================
   Resolve case
===================================================== */
app.post("/cases/:case_id/resolve", async (req, res) => {
  const { resolved_reason } = req.body;
  if (!resolved_reason || resolved_reason.length < 5) {
    return res.status(400).json({ error: "Resolution reason required" });
  }

  const resolutionNote = makeNote({
    text: resolved_reason,
    type: "resolution",
  });

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
    WHERE case_id = @case_id AND status = 'open'
  `;

  await bigquery.query({
    query,
    params: {
      case_id: req.params.case_id,
      resolved_reason,
      resolutionNote,
    },
    ...QUERY_OPTIONS,
  });

  res.json({ ok: true });
});

/* =====================================================
   Start
===================================================== */
app.listen(PORT, () => {
  console.log(`🚀 PoolPilot Alerts Review API running on ${PORT}`);
});

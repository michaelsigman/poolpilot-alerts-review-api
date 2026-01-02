import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";

const API_BASE = "https://poolpilot-alerts-review-api.onrender.com";

/* ================================
   Helpers
================================ */
function normalizeTimestamp(ts) {
  if (!ts) return null;
  if (typeof ts === "string") return ts;
  if (typeof ts === "object" && ts.value) return ts.value;
  return null;
}

function formatPST(ts) {
  const n = normalizeTimestamp(ts);
  if (!n) return "—";
  const d = new Date(n);
  return isNaN(d)
    ? "—"
    : d.toLocaleString("en-US", {
        timeZone: "America/Los_Angeles",
        dateStyle: "short",
        timeStyle: "medium",
      });
}

const heaterLabel = v =>
  v === 1 ? "On" : v === 3 ? "On (Standby)" : "Off";

const pumpLabel = v => (v === 1 ? "On" : "Off");

export default function CaseDetail() {
  const { case_id } = useParams();
  const navigate = useNavigate();

  const [caseData, setCaseData] = useState(null);
  const [snapshots, setSnapshots] = useState([]);
  const [loading, setLoading] = useState(true);

  const [noteText, setNoteText] = useState("");
  const [submittingNote, setSubmittingNote] = useState(false);
  const [resolving, setResolving] = useState(false);

  /* ================================
     Fetch case
  ================================ */
  async function loadCase() {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/cases/${case_id}`);
      const data = await res.json();
      setCaseData(data);
    } catch (e) {
      console.error("Failed to load case", e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCase();
  }, [case_id]);

  /* ================================
     Fetch snapshots
  ================================ */
  useEffect(() => {
    if (!caseData?.case_id) return;

    async function loadSnapshots() {
      try {
        const res = await fetch(
          `${API_BASE}/cases/${caseData.case_id}/snapshots`
        );
        const data = await res.json();
        setSnapshots(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error("Failed to load snapshots", e);
        setSnapshots([]);
      }
    }

    loadSnapshots();
  }, [caseData]);

  /* ================================
     Slow heating detection (UI-only)
  ================================ */
  const slowHeatingDetected = useMemo(() => {
    if (!caseData || caseData.body_type !== "pool") return false;
    if (snapshots.length < 6) return false; // ~3 hours minimum

    const sorted = [...snapshots].sort(
      (a, b) => new Date(a.snapshot_ts) - new Date(b.snapshot_ts)
    );

    const first = sorted[0];
    const last = sorted[sorted.length - 1];

    if (
      !first ||
      !last ||
      first.pool_temp == null ||
      last.pool_temp == null
    ) {
      return false;
    }

    const hours =
      (new Date(last.snapshot_ts) - new Date(first.snapshot_ts)) /
      (1000 * 60 * 60);

    if (hours < 3) return false;

    const deltaTemp = last.pool_temp - first.pool_temp;
    const rate = deltaTemp / hours;

    const avgAir =
      sorted.reduce((sum, s) => sum + (s.air_temp ?? 0), 0) /
      sorted.length;

    const heaterOn = sorted.every(
      s => s.pool_heater === 1 || s.pool_heater === 3
    );
    const pumpOn = sorted.every(s => s.filter_pump === 1);

    const gap = (last.set_point_pool ?? 0) - last.pool_temp;

    return (
      heaterOn &&
      pumpOn &&
      gap >= 10 &&
      rate < 0.5 &&
      avgAir <= 55
    );
  }, [snapshots, caseData]);

  /* ================================
     Add note
  ================================ */
  async function addNote() {
    if (!noteText.trim()) return;

    setSubmittingNote(true);
    try {
      const res = await fetch(
        `${API_BASE}/cases/${caseData.case_id}/notes`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: noteText }),
        }
      );
      const data = await res.json();

      if (data.ok) {
        setNoteText("");
        await loadCase();
      }
    } finally {
      setSubmittingNote(false);
    }
  }

  /* ================================
     Resolve case
  ================================ */
  async function resolveCase() {
    const reason = window.prompt(
      "Why are you resolving this case?\n\n(This will be visible to your team.)"
    );

    if (!reason || reason.trim().length < 5) {
      alert("Resolution reason required (min 5 characters)");
      return;
    }

    setResolving(true);
    try {
      const res = await fetch(
        `${API_BASE}/cases/${caseData.case_id}/resolve`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ resolved_reason: reason }),
        }
      );
      const data = await res.json();
      if (data.ok) navigate(-1);
    } finally {
      setResolving(false);
    }
  }

  if (loading) return <div style={{ padding: 20 }}>Loading case…</div>;
  if (!caseData) return <div style={{ padding: 20 }}>Case not found</div>;

  const notes = Array.isArray(caseData.notes) ? caseData.notes : [];

  return (
    <div style={{ padding: 20 }}>
      <button onClick={() => navigate(-1)}>← Back</button>

      <h2>{caseData.system_name}</h2>

      <p><strong>Agency:</strong> {caseData.agency_name}</p>
      <p><strong>Issue:</strong> {caseData.issue_type}</p>
      <p><strong>Status:</strong> {caseData.status}</p>

      {slowHeatingDetected && (
        <div
          style={{
            marginTop: 16,
            padding: 12,
            borderRadius: 6,
            background: "#fef3c7",
            border: "1px solid #fde68a",
            color: "#92400e",
          }}
        >
          🟡 <strong>Heater is running but heating slowly.</strong><br />
          Cold ambient conditions are likely reducing heating efficiency.
          Monitoring is recommended — no immediate action required.
        </div>
      )}

      {caseData.status === "open" && (
        <button
          onClick={resolveCase}
          disabled={resolving}
          style={{
            marginTop: 12,
            padding: "8px 14px",
            background: "#c0392b",
            color: "#fff",
            border: "none",
            borderRadius: 6,
            cursor: "pointer",
          }}
        >
          {resolving ? "Resolving…" : "Resolve Case"}
        </button>
      )}

      {/* Notes + snapshots unchanged below */}
    </div>
  );
}

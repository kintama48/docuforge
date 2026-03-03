import http from "k6/http";
import { check } from "k6";
import exec from "k6/execution";
import { Rate, Trend } from "k6/metrics";
import { buildK6Options, resolveLoadTestConfig } from "../lib/config.mjs";
import { createPublicPreviewPayload } from "../fixtures/public-preview-payload.mjs";

const config = resolveLoadTestConfig(__ENV);
const payload = createPublicPreviewPayload();

const previewDurationMs = new Trend("docuforge_public_preview_duration_ms", true);
const coldStartDurationMs = new Trend("docuforge_cold_start_probe_duration_ms", true);
const previewPdfBytes = new Trend("docuforge_public_preview_pdf_bytes", true);
const previewErrors = new Rate("docuforge_public_preview_errors");

export const options = buildK6Options(config);

function jsonHeaders(includeSession, sessionId) {
  const headers = {
    "Content-Type": "application/json",
    Origin: config.originHeader,
  };

  if (includeSession && sessionId) {
    headers["X-Preview-Session"] = sessionId;
  }

  return headers;
}

function createSession() {
  const response = http.post(
    `${config.apiBaseUrl}/v1/render/public/session`,
    "{}",
    {
      headers: jsonHeaders(false),
      timeout: config.requestTimeout,
      tags: {
        endpoint: "public_session",
      },
    }
  );

  const ok = check(response, {
    "session status is 201": (r) => r.status === 201,
    "session has id": (r) => {
      try {
        const parsed = r.json();
        return Boolean(parsed && parsed.session_id);
      } catch {
        return false;
      }
    },
  });

  previewErrors.add(!ok);

  if (!ok) {
    return null;
  }

  try {
    const parsed = response.json();
    return parsed.session_id;
  } catch {
    previewErrors.add(true);
    return null;
  }
}

function executePublicPreview(recordColdStartMetric) {
  const sessionId = createSession();
  if (!sessionId) {
    return;
  }

  const response = http.post(
    `${config.apiBaseUrl}/v1/render/public/preview`,
    JSON.stringify(payload),
    {
      headers: jsonHeaders(true, sessionId),
      timeout: config.requestTimeout,
      tags: {
        endpoint: "public_preview",
        scenario: exec.scenario.name,
      },
    }
  );

  const ok = check(response, {
    "preview status is 200": (r) => r.status === 200,
    "preview is pdf": (r) => String(r.headers["Content-Type"] || "").includes("application/pdf"),
    "preview body is non-empty": (r) => (r.body || "").length > 250,
  });

  previewErrors.add(!ok);

  if (!ok) {
    return;
  }

  previewDurationMs.add(response.timings.duration);
  if (recordColdStartMetric) {
    coldStartDurationMs.add(response.timings.duration);
  }

  previewPdfBytes.add((response.body || "").length);
}

export function publicPreviewSteady() {
  executePublicPreview(false);
}

export function publicPreviewSpike() {
  executePublicPreview(false);
}

export function coldStartProbe() {
  executePublicPreview(true);
}

export function handleSummary(data) {
  return {
    [`${config.resultsDir}/k6-summary.json`]: JSON.stringify(data, null, 2),
    stdout:
      `k6 load test profile: ${config.profile}\n` +
      `api base url: ${config.apiBaseUrl}\n` +
      `results: ${config.resultsDir}/k6-summary.json\n`,
  };
}

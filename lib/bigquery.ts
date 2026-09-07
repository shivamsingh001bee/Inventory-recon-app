import { BigQuery } from "@google-cloud/bigquery";

let client: BigQuery | null = null;

/**
 * Server-side only. Never import this from a "use client" component.
 * Reads credentials from GCP_SERVICE_ACCOUNT_KEY (full JSON, as a string).
 */
export function getBigQuery(): BigQuery {
  if (client) return client;

  const rawKey = process.env.GCP_SERVICE_ACCOUNT_KEY;
  if (!rawKey) {
    throw new Error("GCP_SERVICE_ACCOUNT_KEY is not set");
  }

  const credentials = JSON.parse(rawKey);

  client = new BigQuery({
    projectId: process.env.GCP_PROJECT_ID,
    credentials
  });

  return client;
}

export function dataset(): string {
  const ds = process.env.BIGQUERY_DATASET;
  if (!ds) throw new Error("BIGQUERY_DATASET is not set");
  return ds;
}

export function table(name: string): string {
  return `\`${process.env.GCP_PROJECT_ID}.${dataset()}.${name}\``;
}

/**
 * Your existing BOM table lives in a different dataset (IMS_New_Version),
 * not the one this app owns. Fully qualified, set via env var so it's not
 * hardcoded across environments.
 */
export function bomTable(): string {
  const id = process.env.BOM_TABLE_ID;
  if (!id) throw new Error("BOM_TABLE_ID is not set");
  return `\`${id}\``;
}

/** First-of-month DATE string for the current recon period, e.g. "2026-09-01". */
export function currentReconMonth(): string {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}-01`;
}

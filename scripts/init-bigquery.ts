/**
 * One-time setup: creates the dataset + tables in BigQuery using the
 * project/dataset names from your .env, so you don't have to hand-edit
 * sql/schema.sql. Run with: npm run db:init
 */
import "dotenv/config";
import { BigQuery } from "@google-cloud/bigquery";

async function main() {
  const projectId = process.env.GCP_PROJECT_ID;
  const datasetId = process.env.BIGQUERY_DATASET;
  const rawKey = process.env.GCP_SERVICE_ACCOUNT_KEY;

  if (!projectId || !datasetId || !rawKey) {
    throw new Error("GCP_PROJECT_ID, BIGQUERY_DATASET and GCP_SERVICE_ACCOUNT_KEY must be set");
  }

  const bq = new BigQuery({ projectId, credentials: JSON.parse(rawKey) });

  const [dataset] = await bq.dataset(datasetId).get({ autoCreate: true });
  console.log(`Dataset ready: ${dataset.id}`);

  const tables: Record<string, any> = {
    users: {
      schema: [
        { name: "user_id", type: "STRING", mode: "REQUIRED" },
        { name: "name", type: "STRING", mode: "REQUIRED" },
        { name: "role", type: "STRING", mode: "REQUIRED" },
        { name: "active", type: "BOOL", mode: "REQUIRED" },
        { name: "created_at", type: "TIMESTAMP", mode: "REQUIRED" }
      ]
    },
    criteria: {
      schema: [
        { name: "packet_no", type: "STRING", mode: "NULLABLE" },
        { name: "gemstone", type: "STRING", mode: "REQUIRED" },
        { name: "location", type: "STRING", mode: "NULLABLE" },
        { name: "category", type: "STRING", mode: "NULLABLE" },
        { name: "is_active", type: "BOOL", mode: "REQUIRED" }
      ]
    },
    normal_entries: {
      schema: [
        { name: "entry_id", type: "STRING", mode: "REQUIRED" },
        { name: "entry_number", type: "STRING", mode: "REQUIRED" },
        { name: "packet_no", type: "STRING", mode: "REQUIRED" },
        { name: "gemstone", type: "STRING", mode: "REQUIRED" },
        { name: "submitted_by", type: "STRING", mode: "REQUIRED" },
        { name: "submitted_at", type: "TIMESTAMP", mode: "REQUIRED" },
        { name: "recon_month", type: "DATE", mode: "REQUIRED" }
      ],
      timePartitioning: { type: "MONTH", field: "recon_month" }
    },
    lot_entries: {
      schema: [
        { name: "entry_id", type: "STRING", mode: "REQUIRED" },
        { name: "lot_no", type: "STRING", mode: "REQUIRED" },
        { name: "no_of_pcs", type: "INTEGER", mode: "REQUIRED" },
        { name: "carat_wt", type: "NUMERIC", mode: "REQUIRED" },
        { name: "entry_date", type: "DATE", mode: "REQUIRED" },
        { name: "comments", type: "STRING", mode: "NULLABLE" },
        { name: "location", type: "STRING", mode: "REQUIRED" },
        { name: "gemstone", type: "STRING", mode: "REQUIRED" },
        { name: "submitted_by", type: "STRING", mode: "REQUIRED" },
        { name: "submitted_at", type: "TIMESTAMP", mode: "REQUIRED" },
        { name: "recon_month", type: "DATE", mode: "REQUIRED" }
      ],
      timePartitioning: { type: "MONTH", field: "recon_month" }
    },
    no_pkt_entries: {
      schema: [
        { name: "entry_id", type: "STRING", mode: "REQUIRED" },
        { name: "entry_number", type: "STRING", mode: "REQUIRED" },
        { name: "location", type: "STRING", mode: "REQUIRED" },
        { name: "gemstone", type: "STRING", mode: "REQUIRED" },
        { name: "submitted_by", type: "STRING", mode: "REQUIRED" },
        { name: "submitted_at", type: "TIMESTAMP", mode: "REQUIRED" },
        { name: "recon_month", type: "DATE", mode: "REQUIRED" }
      ],
      timePartitioning: { type: "MONTH", field: "recon_month" }
    },
    bom: {
      schema: [
        { name: "inv_id", type: "STRING", mode: "REQUIRED" },
        { name: "status", type: "STRING", mode: "NULLABLE" }
      ]
    }
  };

  for (const [name, def] of Object.entries(tables)) {
    const [exists] = await dataset.table(name).exists();
    if (exists) {
      console.log(`Table already exists, skipping: ${name}`);
      continue;
    }
    await dataset.createTable(name, def);
    console.log(`Created table: ${name}`);
  }

  console.log("Done. Next: insert your 13 team members into `users` and load `criteria`.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

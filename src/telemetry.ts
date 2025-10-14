import sqlite3 from "sqlite3"
import { open } from "sqlite"
import path from "path"
import url from "url"

const __dirname = path.dirname(url.fileURLToPath(import.meta.url))

const db = await open({
  filename: path.resolve(__dirname, "..", "data", "telemetry.db"),
  driver: sqlite3.Database,
})

await db.run(`
  CREATE TABLE IF NOT EXISTS requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    request TEXT,
    ip TEXT,
    http_status INTEGER,
    from_cache BOOLEAN,
    spent_ms INTEGER,
    created_at TEXT
  );
`)

try {
  await db.run(`
    ALTER TABLE requests ADD COLUMN is_from_admin BOOLEAN
  `)
} catch (error) {
  if (!error.message.includes("duplicate column name")) {
    console.error("Error adding is_from_admin column to requests table", error)
  }
}

try {
  await db.run(`
    ALTER TABLE requests ADD COLUMN matches_count INTEGER
  `)
} catch (error) {
  if (!error.message.includes("duplicate column name")) {
    console.error("Error adding matches_count column to requests table", error)
  }
}

interface TelemetryRecord {
  request: string
  ip: string
  http_status?: number
  from_cache?: boolean
  spent_ms?: number
  is_from_admin?: boolean
  matches_count?: number
}

export const insertTelemetry = async (
  data: TelemetryRecord
): Promise<number> => {
  try {
    const result = await db.run(
      "INSERT INTO requests (request, ip, http_status, from_cache, spent_ms, created_at, is_from_admin, matches_count) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [
        data.request,
        data.ip,
        data.http_status,
        data.from_cache,
        data.spent_ms,
        new Date().toISOString(),
        data.is_from_admin,
        data.matches_count,
      ]
    )
    return result.lastID
  } catch (error) {
    console.error("Error inserting telemetry", error)
    return -1
  }
}

export const updateTelemetry = async (
  id: number,
  data: Partial<TelemetryRecord>
): Promise<void> => {
  try {
    if (id === -1) {
      console.warn("Skipping telemetry update for invalid ID", id)
      return
    }

    const existingRecord = await db.get("SELECT * FROM requests WHERE id = ?", [
      id,
    ])
    if (!existingRecord) {
      throw new Error("Record not found")
    }

    const updatedData = {
      ...existingRecord,
      ...data,
    }

    await db.run(
      "UPDATE requests SET http_status = ?, from_cache = ?, spent_ms = ?, is_from_admin = ?, matches_count = ? WHERE id = ?",
      [
        updatedData.http_status,
        updatedData.from_cache,
        updatedData.spent_ms,
        updatedData.is_from_admin,
        updatedData.matches_count,
        id,
      ]
    )
  } catch (error) {
    console.error("Error updating telemetry", error)
  }
}

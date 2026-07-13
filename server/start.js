import { fileURLToPath } from "url";
import path from "path";
import http from "http";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load the production env file uploaded alongside the app (see
// scripts/deploy-hostinger-shared.{sh,cmd}). dotenv never overrides a var
// already set in process.env, so Passenger's own PORT still wins over
// whatever this file says.
const envPath = path.resolve(__dirname, "..", ".env.hostinger");
const { error: envError } = dotenv.config({ path: envPath });
if (envError) {
  console.warn(`[Startup] No .env.hostinger found at ${envPath} (${envError.code}) — relying on cPanel env vars.`);
} else {
  console.log(`[Startup] Loaded environment from ${envPath}`);
}

// Hostinger shared hosting: do NOT spawn any sub-processes (Prisma engines, tsc, etc.)
// on startup — the process/thread limit causes EAGAIN immediately.
// Schema sync (prisma migrate deploy) and admin seeding are done manually via cron jobs.
console.log("[Startup] Starting server directly (no db push, no seeding)...");

import("./dist/index.js").catch((err) => {
  console.error("[Startup] Failed to start server:", err);

  const port = process.env.PORT || 5000;
  let dbUrl = process.env.DATABASE_URL || "NOT SET";
  if (dbUrl !== "NOT SET") {
    dbUrl = dbUrl.replace(/:([^:@]+)@/, ":******@");
  }

  const html = `<!DOCTYPE html>
<html>
  <head>
    <title>Application Startup Failed</title>
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 40px; background: #f8f9fa; color: #333; }
      .container { max-width: 800px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); border-top: 5px solid #dc3545; }
      h1 { color: #dc3545; margin-top: 0; }
      pre { background: #f1f3f5; padding: 15px; border-radius: 4px; overflow-x: auto; white-space: pre-wrap; font-family: monospace; font-size: 14px; }
      .meta { margin-top: 20px; font-size: 14px; color: #666; border-top: 1px solid #eee; padding-top: 15px; }
    </style>
  </head>
  <body>
    <div class="container">
      <h1>Application Startup Failed</h1>
      <p>The application failed to import dist/index.js.</p>
      <h2>Error Details:</h2>
      <pre>${err.message}\n${err.stack}</pre>
      <div class="meta">
        <strong>DATABASE_URL (masked):</strong> <code>${dbUrl}</code><br>
        <strong>Node version:</strong> <code>${process.version}</code><br>
        <strong>Port:</strong> <code>${port}</code><br>
        <strong>Time:</strong> <code>${new Date().toISOString()}</code>
      </div>
    </div>
  </body>
</html>`;

  try {
    const server = http.createServer((req, res) => {
      res.writeHead(500, { "Content-Type": "text/html" });
      res.end(html);
    });
    server.listen(port, () => {
      console.log(`[Diagnostic] Listening on port ${port}`);
    });
  } catch (listenErr) {
    console.error("[Diagnostic] Failed to start HTTP server:", listenErr);
    process.exit(1);
  }
});

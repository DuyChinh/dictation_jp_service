import { config, assertConfig } from "./config.js";
import { createApp } from "./app.js";
import { connectMongo } from "./database/mongo.js";
import { seedAdmin } from "./modules/admin/adminAuth.js";
import { loadHiddenLessons } from "./modules/admin/routes/contentRoutes.js";
import { startLeaderboardJobs } from "./modules/leaderboard/leaderboardService.js";
import { startPushJobs } from "./modules/push/pushService.js";
import { flushTraffic } from "./modules/traffic/trafficRoutes.js";

assertConfig();

const { app, contentRepo } = createApp();

async function main() {
  try {
    await connectMongo();
    await seedAdmin();
    await loadHiddenLessons(contentRepo);
    await startLeaderboardJobs();
    startPushJobs();
  } catch (e) {
    console.error("[mongo] connection failed:", e);
    if (config.nodeEnv === "production") process.exit(1);
  }

  const server = app.listen(config.port, () => {
    console.log(`[backend] http://localhost:${config.port}`);
  });

  // Render stops a service with SIGTERM on every deploy: save the buffered page-view counts first.
  let stopping = false;
  const shutdown = (signal: string) => {
    if (stopping) return;
    stopping = true;
    console.log(`[backend] ${signal} received, shutting down`);
    const force = setTimeout(() => process.exit(0), 8000);
    force.unref();
    server.close();
    flushTraffic()
      .catch((e) => console.error("[traffic] final flush failed:", e))
      .finally(() => process.exit(0));
  };
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

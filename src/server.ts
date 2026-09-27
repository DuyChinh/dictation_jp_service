import { config, assertConfig } from "./config.js";
import { createApp } from "./app.js";
import { connectMongo } from "./database/mongo.js";
import { seedAdmin } from "./modules/admin/adminAuth.js";
import { loadHiddenLessons } from "./modules/admin/routes/contentRoutes.js";

assertConfig();

const { app, contentRepo } = createApp();

async function main() {
  try {
    await connectMongo();
    await seedAdmin();
    await loadHiddenLessons(contentRepo);
  } catch (e) {
    console.error("[mongo] connection failed:", e);
    if (config.nodeEnv === "production") process.exit(1);
  }

  app.listen(config.port, () => {
    console.log(`[backend] http://localhost:${config.port}`);
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

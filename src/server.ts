import { config, assertConfig } from "./config.js";
import { createApp } from "./app.js";
import { connectMongo } from "./database/mongo.js";

assertConfig();

const { app } = createApp();

async function main() {
  try {
    await connectMongo();
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

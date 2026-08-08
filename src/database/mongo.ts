import mongoose from "mongoose";
import { config } from "../config.js";

export type MongoStatus = {
  configured: boolean;
  connected: boolean;
  readyState: number;
};

export function getMongoStatus(): MongoStatus {
  return {
    configured: Boolean(config.mongodbUri),
    connected: mongoose.connection.readyState === 1,
    readyState: mongoose.connection.readyState,
  };
}

/**
 * Connect MongoDB if MONGODB_URI is set.
 * Content APIs work without Mongo (guest/local progress MVP).
 */
export async function connectMongo(): Promise<void> {
  if (!config.mongodbUri) {
    console.warn("[mongo] MONGODB_URI not set — skipping connection");
    return;
  }
  if (mongoose.connection.readyState === 1) return;

  mongoose.set("strictQuery", true);
  await mongoose.connect(config.mongodbUri);
  console.log("[mongo] connected");
}

export async function disconnectMongo(): Promise<void> {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
}

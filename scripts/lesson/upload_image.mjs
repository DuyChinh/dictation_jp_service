#!/usr/bin/env node
/**
 * Upload a lesson image to Cloudinary and print its URL (paste it into source.json).
 *
 *   node scripts/lesson/upload_image.mjs <file> <public id>
 *   node scripts/lesson/upload_image.mjs .work/jlpt/n2/2024-12/images/m1-q2-figure.png jlpt/n2/2024-12/m1-q2-figure
 *
 * Reads CLOUDINARY_CLOUD_NAME / CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET from backend/.env.
 * Re-running with the same public id replaces the image.
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { v2 as cloudinary } from "cloudinary";

const backend = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
dotenv.config({ path: path.join(backend, ".env") });

const [file, publicId] = process.argv.slice(2);
if (!file || !publicId) {
  console.error("usage: node scripts/lesson/upload_image.mjs <file> <public id>");
  process.exit(1);
}
for (const k of ["CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET"]) {
  if (!process.env[k]) {
    console.error(`missing ${k} in backend/.env`);
    process.exit(1);
  }
}

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const res = await cloudinary.uploader.upload(path.resolve(file), {
  public_id: publicId,
  overwrite: true,
  resource_type: "image",
});
console.log(res.secure_url);

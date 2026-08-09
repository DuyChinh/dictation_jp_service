import fs from "node:fs";
import path from "node:path";
import { adaptV4ToPackage } from "@jd/content-schema/src/adaptV4.js";

const inputPath = process.argv[2];
const outPath = path.join(path.dirname(inputPath), "listening.json");

const raw = JSON.parse(fs.readFileSync(inputPath, "utf8"));
const pkg = adaptV4ToPackage(raw, {
  status: "published"
});

// Since the audio file is "ChoukaiJLPTN272025(2).mp3" in the source but "ChoukaiJLPTN272025.mp3" on disk
// Let's just fix it if needed
if (pkg.audio && pkg.audio.file === "ChoukaiJLPTN272025(2).mp3") {
  pkg.audio.file = "ChoukaiJLPTN272025.mp3";
}

fs.writeFileSync(outPath, JSON.stringify(pkg, null, 2), "utf8");
console.log(`Converted and saved to ${outPath}`);

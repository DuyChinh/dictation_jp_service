import fs from "fs";
import path from "path";

const inPath = "./content/jlpt/n2/2025-07/jlpt_n2_2025_07_complete_v3_m1_q1_timing_corrected.json";
const outPath = "./content/jlpt/n2/2025-07/jlpt_n2_2025_07_complete_v4_timing_corrected.json";
const listeningPath = "./content/jlpt/n2/2025-07/listening.json";

const data = JSON.parse(fs.readFileSync(inPath, 'utf-8'));
const offset = -13000;

function traverse(obj) {
  if (Array.isArray(obj)) {
    obj.forEach(traverse);
  } else if (obj !== null && typeof obj === 'object') {
    for (const key in obj) {
      if ((key === 'start_ms' || key === 'end_ms' || key === 'start_time_ms' || key === 'end_time_ms') && typeof obj[key] === 'number') {
         // apply offset, don't let it go below 0
         obj[key] = Math.max(0, obj[key] + offset);
      }
      traverse(obj[key]);
    }
  }
}

// Add a note about this modification
if (!data.metadata) data.metadata = {};
if (!data.metadata.notes) data.metadata.notes = [];
data.metadata.notes.push(`v4: Shifted all timestamps by ${offset}ms to align with audio (107000 -> 94000).`);

traverse(data);

fs.writeFileSync(outPath, JSON.stringify(data, null, 2), "utf8");
console.log(`Saved shifted file to ${outPath}`);

// We also directly shift listening.json just in case there are subtle structural differences when using adaptV4ToPackage
const listeningData = JSON.parse(fs.readFileSync(listeningPath, 'utf-8'));
traverse(listeningData);
fs.writeFileSync(listeningPath, JSON.stringify(listeningData, null, 2), "utf8");
console.log(`Saved shifted listening.json to ${listeningPath}`);

import fs from "fs";

const inPath = "./content/jlpt/n2/2025-07/jlpt_n2_2025_07_complete_v4_timing_corrected.json";
const outPath = "./content/jlpt/n2/2025-07/jlpt_n2_2025_07_complete_v5_timing_corrected.json";
const listeningPath = "./content/jlpt/n2/2025-07/listening.json";

const data = JSON.parse(fs.readFileSync(inPath, 'utf-8'));
const offset = 11926; // Q2 was shifted to 169074, we want 181000 (181000 - 169074 = 11926)

function traverse(obj) {
  if (Array.isArray(obj)) {
    obj.forEach(traverse);
  } else if (obj !== null && typeof obj === 'object') {
    for (const key in obj) {
      if ((key === 'start_ms' || key === 'end_ms' || key === 'start_time_ms' || key === 'end_time_ms') && typeof obj[key] === 'number') {
         // apply offset only to Q2 and beyond (>= 165000 ms)
         if (obj[key] >= 165000) {
            obj[key] = obj[key] + offset;
         }
      }
      traverse(obj[key]);
    }
  }
}

// Add a note about this modification
if (!data.metadata) data.metadata = {};
if (!data.metadata.notes) data.metadata.notes = [];
data.metadata.notes.push(`v5: Shifted all timestamps >= 165000 by +${offset}ms to align Q2 at exactly 3:01 (181000ms).`);

traverse(data);

fs.writeFileSync(outPath, JSON.stringify(data, null, 2), "utf8");
console.log(`Saved shifted file to ${outPath}`);

// We also directly shift listening.json
const listeningData = JSON.parse(fs.readFileSync(listeningPath, 'utf-8'));
traverse(listeningData);
fs.writeFileSync(listeningPath, JSON.stringify(listeningData, null, 2), "utf8");
console.log(`Saved shifted listening.json to ${listeningPath}`);

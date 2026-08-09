import fs from "fs";

const paths = [
  "./content/jlpt/n2/2025-07/listening.json",
  "./content/jlpt/n2/2025-07/jlpt_n2_2025_07_complete_v3_m1_q1_timing_corrected.json"
];

paths.forEach(p => {
  const data = JSON.parse(fs.readFileSync(p, 'utf-8'));
  let count = 0;
  
  function traverse(obj) {
    if (Array.isArray(obj)) {
      obj.forEach(traverse);
    } else if (obj !== null && typeof obj === 'object') {
      for (const key in obj) {
        if ((key === 'start_ms' || key === 'end_ms' || key === 'start_time_ms' || key === 'end_time_ms') && typeof obj[key] === 'number') {
           if (obj[key] < 107000) {
              console.log(`Found timestamp < 107000 in ${p}: ${key} = ${obj[key]}`);
           }
           if (obj[key] >= 107000) count++;
        }
        traverse(obj[key]);
      }
    }
  }

  traverse(data);
  console.log(`Total timestamps >= 107000 in ${p}: ${count}`);
});

#!/usr/bin/env node
import path from "node:path";
import process from "node:process";
import { formatIssue, validateContentRoot } from "./validate.js";

function main(): void {
  const args = process.argv.slice(2);
  const strictWarnings = args.includes("--strict-warnings");
  const rootArg = args.find((a) => !a.startsWith("--"));
  const contentRoot = path.resolve(
    rootArg ?? path.join(process.cwd(), "content"),
  );

  console.log(`Validating content at: ${contentRoot}`);
  const result = validateContentRoot(contentRoot);

  for (const issue of result.issues) {
    console.log("\n" + formatIssue(issue));
  }

  const errors = result.issues.filter((i) => i.severity === "ERROR");
  const warnings = result.issues.filter((i) => i.severity === "WARNING");

  console.log(
    `\nSummary: ${result.packages.length} package(s), ${errors.length} error(s), ${warnings.length} warning(s)`,
  );

  if (!result.ok || (strictWarnings && warnings.length > 0)) {
    process.exitCode = 1;
  } else {
    console.log("OK");
  }
}

main();

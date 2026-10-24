import { register } from "node:module";
import { pathToFileURL } from "node:url";

// Execute tests
async function main() {
  const { runAllTests } = await import("../tests/run-all-tests.ts");
  const res = await runAllTests();
  if (res.failed > 0) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

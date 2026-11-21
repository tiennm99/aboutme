// Fails when the minified bundle grows past its budget, so size changes are deliberate.
import { statSync } from 'node:fs';

// About 250 bytes above the v1.6.0 build (22,390 bytes). Raised by 2,950 bytes
// from 19,700 for the orbit layout (its CSS, ring placement, label chips and
// arrow keys); gzipped, the bundle grew from 8.3 KB to about 9.3 KB.
const BUDGET = 22_650;
const file = new URL('../dist/aboutme.js', import.meta.url);
const size = statSync(file).size;

if (size > BUDGET) {
  console.error(`dist/aboutme.js is ${size} bytes, over the ${BUDGET}-byte budget.`);
  process.exit(1);
}
console.log(`dist/aboutme.js is ${size} bytes (budget ${BUDGET}).`);

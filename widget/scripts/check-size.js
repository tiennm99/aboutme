// Fails when the minified bundle grows past its budget, so size changes are deliberate.
import { statSync } from 'node:fs';

// About 250 bytes above the v1.5.0 build (19,449 bytes). Raised by 500 bytes
// from 19,200 for the profile accent colour (hex parsing and contrast choice).
const BUDGET = 19_700;
const file = new URL('../dist/aboutme.js', import.meta.url);
const size = statSync(file).size;

if (size > BUDGET) {
  console.error(`dist/aboutme.js is ${size} bytes, over the ${BUDGET}-byte budget.`);
  process.exit(1);
}
console.log(`dist/aboutme.js is ${size} bytes (budget ${BUDGET}).`);

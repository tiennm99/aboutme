// Fails when the minified bundle grows past its budget, so size changes are deliberate.
import { statSync } from 'node:fs';

// About 300 bytes above the v1.3.0 build; the brand icon paths are most of it.
const BUDGET = 17_500;
const file = new URL('../dist/aboutme.js', import.meta.url);
const size = statSync(file).size;

if (size > BUDGET) {
  console.error(`dist/aboutme.js is ${size} bytes, over the ${BUDGET}-byte budget.`);
  process.exit(1);
}
console.log(`dist/aboutme.js is ${size} bytes (budget ${BUDGET}).`);

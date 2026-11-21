// Fails when the minified bundle grows past its budget, so size changes are deliberate.
import { statSync } from 'node:fs';

// About 300 bytes above the v1.4.0 build (18,939 bytes). Raised by 1,700 bytes
// from 17,500: corner placement, position memory, English and Vietnamese UI
// strings and current-site link hiding added about 1.75 KB to the v1.3.0 build.
const BUDGET = 19_200;
const file = new URL('../dist/aboutme.js', import.meta.url);
const size = statSync(file).size;

if (size > BUDGET) {
  console.error(`dist/aboutme.js is ${size} bytes, over the ${BUDGET}-byte budget.`);
  process.exit(1);
}
console.log(`dist/aboutme.js is ${size} bytes (budget ${BUDGET}).`);

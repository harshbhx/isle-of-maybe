// Runs a Python script with whichever interpreter this machine has (python3, python or py),
// so `npm run qa` works the same on Linux, macOS and Windows.
import { spawnSync } from 'node:child_process';

const args = process.argv.slice(2);
for (const cmd of ['python3', 'python', 'py']) {
  const run = spawnSync(cmd, args, { stdio: 'inherit' });
  // ENOENT means this interpreter isn't installed; try the next one.
  if (run.error && 'code' in run.error && run.error.code === 'ENOENT') continue;
  process.exit(run.status ?? 1);
}
process.stderr.write('Python 3 not found. Install it, or put python3/python on PATH.\n');
process.exit(1);

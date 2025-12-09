const { spawn } = require('child_process');

function run(name, cwd) {
  const proc = spawn('npm run dev', {
    cwd,
    stdio: 'inherit',
    shell: true,
    env: process.env,
  });
  proc.on('exit', (code) => {
    if (code !== 0) {
      console.error(`[${name}] exited with code ${code}`);
      process.exit(code || 1);
    }
  });
  return proc;
}

const root = process.cwd();
const backCwd = require('path').join(root, 'backend');
const frontCwd = require('path').join(root, 'frontend');

console.log('Starting backend and frontend dev servers...');
const back = run('backend', backCwd);
const front = run('frontend', frontCwd);

process.on('SIGINT', () => {
  back.kill('SIGINT');
  front.kill('SIGINT');
  process.exit(0);
});

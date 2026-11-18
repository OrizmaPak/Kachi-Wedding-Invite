import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

const { values } = parseArgs({
  options: {
    port: { type: 'string', default: process.env.PORT || '3000' },
    host: { type: 'string', default: '0.0.0.0' },
    strictPort: { type: 'boolean' },
  },
});

const publicDirectory = fileURLToPath(new URL('../public/', import.meta.url));
const server = spawn('python3', [
  '-m', 'http.server', values.port, '--bind', values.host, '--directory', publicDirectory,
], { stdio: 'inherit' });

server.once('error', (error) => {
  console.error(error.message);
  process.exitCode = 1;
});
server.once('exit', (code) => {
  process.exitCode = code ?? 0;
});
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.once(signal, () => server.kill(signal));
}

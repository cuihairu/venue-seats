const userAgent = process.env.npm_config_user_agent ?? '';
const manager = userAgent.split('/')[0]?.split(' ')[0];

if (manager !== 'pnpm') {
  console.error(`This project requires pnpm (found ${manager || 'unknown'}).`);
  console.error('Install dependencies with: pnpm install --frozen-lockfile');
  process.exit(1);
}

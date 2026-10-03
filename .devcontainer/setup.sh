#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT/server"

if [ -f package-lock.json ]; then
  npm ci
else
  npm install
fi

# Les secrets du Codespace sont injectes comme variables d'environnement.
# Toute variable presente dans l'environnement surcharge le .env local,
# ce qui evite de jamais committer de secret.
node <<'NODE'
const fs = require('fs');

const keys = ['MONGODB_URI', 'PORT', 'DOMAIN_NAME', 'SHKEEPER_URL', 'SHKEEPER_API_KEY'];
const source = fs.existsSync('.env') ? '.env' : '.env.example';
const lines = fs.readFileSync(source, 'utf8').split(/\r?\n/);

const seen = new Set();
const merged = lines.filter((line) => {
  const match = line.match(/^([A-Za-z0-9_]+)=/);
  if (!match || !keys.includes(match[1])) return true;
  if (seen.has(match[1])) return false;
  seen.add(match[1]);
  const fromEnv = process.env[match[1]];
  return fromEnv ? `${match[1]}=${fromEnv}` : line;
});

for (const key of keys) {
  if (!seen.has(key) && process.env[key]) merged.push(`${key}=${process.env[key]}`);
}

fs.writeFileSync('.env', merged.join('\n').replace(/\n*$/, '\n'));
console.log('server/.env synchronise');
NODE
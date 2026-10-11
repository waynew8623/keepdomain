// 一键初始化 D1 数据库：
//   1. 若 wrangler.toml 中 database_id 还是占位符，自动运行 `wrangler d1 create` 并写回
//   2. 执行 schema.sql 建表（幂等，可重复运行）
// 用法：npm run setup
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const tomlPath = join(root, 'wrangler.toml');
const PLACEHOLDER = 'REPLACE_WITH_YOUR_DATABASE_ID';

function run(cmd) {
  console.log('> ' + cmd);
  execSync(cmd, { cwd: root, stdio: 'inherit' });
}

function runCapture(cmd) {
  return execSync(cmd, { cwd: root, encoding: 'utf8' });
}

let toml = readFileSync(tomlPath, 'utf8');
const idMatch = /database_id\s*=\s*"([^"]*)"/.exec(toml);
let dbId = idMatch ? idMatch[1].trim() : '';

if (!dbId || dbId === PLACEHOLDER) {
  console.log('> 未检测到 database_id，正在创建 D1 数据库 keepdomain ...');
  const out = runCapture('npx wrangler d1 create keepdomain');
  const m = /database_id\s*=\s*"([^"]+)"/.exec(out);
  if (!m) {
    console.error('无法从 `wrangler d1 create` 输出中解析 database_id，请手动执行后填入 wrangler.toml。');
    console.error(out);
    process.exit(1);
  }
  dbId = m[1];
  if (idMatch) {
    toml = toml.replace(/database_id\s*=\s*"[^"]*"/, 'database_id = "' + dbId + '"');
  } else {
    toml = toml.replace(/(database_name\s*=\s*"[^"]*")/, '$1\n  database_id = "' + dbId + '"');
  }
  writeFileSync(tomlPath, toml, 'utf8');
  console.log('> 已写入 database_id: ' + dbId);
} else {
  console.log('> 已存在 database_id: ' + dbId + '，跳过创建');
}

console.log('> 正在建表（schema.sql）...');
run('npx wrangler d1 execute keepdomain --file=./schema.sql --remote');
console.log('> 数据库就绪。接下来运行 `npx wrangler deploy` 部署即可。');

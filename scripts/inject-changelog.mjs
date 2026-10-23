#!/usr/bin/env node
// Chèn lịch sử thay đổi contract vào description của bundle Apidog; không sửa YAML nguồn.
// Chạy sau `redocly bundle` trong `npm run bundle`, nên bundle local và bundle do CI sinh luôn trùng nhau.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { cell, LEVEL_ICON, sourceLink, vietnameseText } from './lib/contract-format.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const BUNDLE = resolve(ROOT, process.argv[2] ?? 'reference/rentify.json');
const CHANGELOG = resolve(ROOT, process.argv[3] ?? 'reports/api-changelog.json');
const MARKER = '<!-- contract-changelog -->';
const PER_OPERATION = 5;
const GLOBAL = 10;
const METHODS = new Set(['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace']);

const store = existsSync(CHANGELOG) ? JSON.parse(readFileSync(CHANGELOG, 'utf8')) : { entries: [] };
if (!store.entries?.length) process.exit(0);
const spec = JSON.parse(readFileSync(BUNDLE, 'utf8'));

// Gom từng change theo operation; entry mới nhất trước, mỗi operation tối đa PER_OPERATION entry.
const byOperation = new Map();
const global = [];
for (const entry of [...store.entries].reverse()) {
  for (const change of entry.changes) {
    // Nhắc version là việc nội bộ của BE, không cần hiện cho FE/Mobile trên Apidog.
    if (change.id === 'api-version-not-bumped') continue;
    const row = `| ${entry.detectedAt.slice(0, 10)} | ${LEVEL_ICON[change.classification] ?? ''} ${change.classification} | ${cell(vietnameseText(change))} | ${sourceLink(entry)} |`;
    const method = change.operation?.toLowerCase();
    const operation = METHODS.has(method) ? spec.paths?.[change.path]?.[method] : undefined;
    if (!operation) {
      global.push({ entry: entry.id, row: row.replace(/^\| /, `| ${cell([change.operation, change.path].filter(Boolean).join(' ') || change.section)} | `) });
      continue;
    }
    if (!byOperation.has(operation)) byOperation.set(operation, []);
    byOperation.get(operation).push({ entry: entry.id, row });
  }
}

const limit = (rows, count) => {
  const kept = [...new Set(rows.map(item => item.entry))].slice(0, count);
  return rows.filter(item => kept.includes(item.entry)).map(item => item.row);
};
const append = (description, title, header, rows) => {
  const base = (description ?? '').split(MARKER)[0].trimEnd();
  const table = [MARKER, `**${title}**`, '', header, header.replace(/[^|]+/g, '---'), ...rows].join('\n');
  return base ? `${base}\n\n${table}\n` : `${table}\n`;
};

for (const [operation, rows] of byOperation) {
  operation.description = append(operation.description, 'Lịch sử thay đổi contract', '| Ngày | Mức | Thay đổi | PR |', limit(rows, PER_OPERATION));
}
if (global.length) {
  spec.info.description = append(spec.info.description, 'Thay đổi contract gần đây (không gắn endpoint)', '| Vị trí | Ngày | Mức | Thay đổi | PR |', limit(global, GLOBAL));
}
writeFileSync(BUNDLE, JSON.stringify(spec, null, 2));
console.log(`Đã chèn lịch sử contract cho ${byOperation.size} endpoint${global.length ? ' và info.description' : ''}.`);

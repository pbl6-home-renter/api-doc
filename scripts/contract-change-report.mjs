#!/usr/bin/env node
// POC theo dõi contract; không đọc bundle Apidog và không sửa OpenAPI nguồn.
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, isAbsolute, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const REDOCLY = '2.64.1';
const OASDIFF = '1.34.1';
const HELP = `POC báo cáo thay đổi API contract (Node.js >= 22.12, Git, tar, npm).
  node scripts/contract-change-report.mjs --demo
  node scripts/contract-change-report.mjs --base BASE.yaml --head HEAD.yaml
  node scripts/contract-change-report.mjs --base-ref BASE_SHA --head-ref HEAD_SHA
Tùy chọn:
  --out FILE.md          Markdown và JSON cùng tên (mặc định reports/contract-change-report.md)
  --entrypoint PATH      Nguồn trong Git (mặc định src/openapi.yaml)
  --contract-id ID       Định danh contract (mặc định rentify-public)
  --repo URL            URL repository; mặc định suy ra từ origin
  --pr URL              PR giới thiệu thay đổi; mặc định đọc GITHUB_EVENT_PATH
  --reason TEXT         Lý do nghiệp vụ; thiếu thì ghi rõ cần tác giả bổ sung
  --timestamp ISO        Thời điểm phát hiện; mặc định thời gian UTC hiện tại
  --fail-on-breaking    Exit 1 nếu BREAKING hoặc NEEDS_REVIEW; vẫn ghi báo cáo
  --help                In hướng dẫn
Biến môi trường: OASDIFF_BIN trỏ tới oasdiff ${OASDIFF}; mặc định tìm trong PATH.
Không tự tải oasdiff. Redocly chạy bằng npx --yes @redocly/cli@${REDOCLY}.
File report là kho entry cục bộ, cần tải report cũ trước khi dùng làm lịch sử CI.`;

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 128 * 1024 * 1024, ...options });
  if (result.error || result.status !== 0) {
    throw new Error(`${command} thất bại (${result.status ?? 'không khởi chạy'}): ${result.error?.message || result.stderr || result.stdout}`);
  }
  return result.stdout;
}

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]));
  return value;
}
const serialize = value => JSON.stringify(canonical(value));
const hash = value => createHash('sha256').update(serialize(value)).digest('hex');
const cell = value => String(value ?? '—').replaceAll('|', '\\|').replaceAll('\n', ' ').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
const pointerKey = key => key.replaceAll('~', '~0').replaceAll('/', '~1');

// Vị trí trước/sau bổ sung tên schema/field mà changelog của engine có thể rút gọn.
function locations(before, after, path = '', output = []) {
  if (serialize(before) === serialize(after)) return output;
  const objects = [before, after].every(value => value && typeof value === 'object' && !Array.isArray(value));
  if (objects) {
    for (const key of [...new Set([...Object.keys(before), ...Object.keys(after)])].sort()) {
      locations(before[key], after[key], `${path}/${pointerKey(key)}`, output);
    }
  } else output.push({ pointer: path || '/', before: before ?? null, after: after ?? null });
  return output;
}

function clientAction(change) {
  const field = change.text.match(/`([^`]+)`/)?.[1] ?? '';
  if (change.id === 'request-property-became-required' || /request.*required.*added/.test(change.id)) {
    return `FE: thêm ${field || 'field bắt buộc'} vào payload, form và validation. Mobile: cập nhật DTO/payload, kiểm thử cả phiên bản app đang phát hành. BE phải có phương án tương thích hoặc version mới trước khi bật yêu cầu này.`;
  }
  if (/response.*property.*added/.test(change.id)) {
    return `FE: có thể bỏ qua field mới ${field}; chỉ thêm UI khi cần. Mobile: giữ decoder chấp nhận field lạ; khi thêm DTO, field optional phải có giá trị mặc định/null. Không bắt buộc nâng cấp đồng loạt; kiểm thử parser hiện tại.`;
  }
  if (/security|oauth|scope/.test(change.id)) return 'FE và Mobile: kiểm tra token, header, scope và luồng đăng nhập; BE xác nhận quyền truy cập thực tế, thời điểm áp dụng và tương thích app cũ.';
  if (/enum/.test(change.id)) return 'FE và Mobile: đối chiếu enum trong DTO/validation và nhánh switch/when; xử lý giá trị chưa biết, kiểm thử dữ liệu cũ và mới; phối hợp BE trước khi phát hành.';
  if (/deleted|removed/.test(change.id)) return 'FE và Mobile: tìm các lời gọi/DTO đang dùng vị trí bị xóa, chuyển sang contract thay thế và kiểm thử màn hình liên quan; BE xác nhận thời gian duy trì phiên bản cũ.';
  if (change.id === 'api-version-not-bumped') return 'BE: xem lại quy ước version trước khi chấp nhận breaking change. FE/Mobile: theo kế hoạch chuyển đổi của entry này; version trong OpenAPI chưa chứng minh backend đã triển khai.';
  if (change.level >= 2) return 'FE và Mobile: đối chiếu vị trí và thay đổi trước/sau trong entry này với API adapter, DTO, parser và validation; cùng BE xác nhận phương án tương thích trước merge/phát hành.';
  return 'FE và Mobile: kiểm tra vị trí thay đổi với DTO/parser hiện tại; chưa thấy yêu cầu sửa bắt buộc theo engine. BE xác nhận không có thay đổi hành vi ngoài OpenAPI.';
}

function vietnameseText(change) {
  const quoted = [...change.text.matchAll(/`([^`]+)`/g)].map(match => match[1]);
  if (change.id === 'request-property-became-required') return `Field request \`${quoted[0]}\` chuyển từ tùy chọn sang bắt buộc.`;
  if (change.id === 'response-optional-property-added') return `Thêm field response tùy chọn \`${quoted[0]}\` ở HTTP ${quoted[1]}.`;
  if (change.id === 'api-version-not-bumped') return `Đã phát hiện breaking change nhưng info.version vẫn là \`${quoted[0]}\`.`;
  return change.text;
}

function checkInput(path) {
  if (basename(path) === 'rentify.json' || path.split(sep).includes('reference')) throw new Error('Chỉ nhận nguồn YAML; reference/rentify.json là artifact được sinh, không phải nguồn contract.');
  if (!/\.ya?ml$/i.test(path)) throw new Error(`Cần entrypoint YAML: ${path}`);
}

function bundle(input, output) {
  checkInput(input);
  run('npx', ['--yes', `@redocly/cli@${REDOCLY}`, 'bundle', input, '-o', output, '--ext', 'json', '--component-names-strategy', 'title']);
  return JSON.parse(readFileSync(output, 'utf8'));
}

function git(...args) { return run('git', args).trim(); }
function gitCommit(ref) { return git('rev-parse', '--verify', `${ref}^{commit}`); }
function extract(ref, directory) {
  mkdirSync(directory, { recursive: true });
  const archive = run('git', ['archive', '--format=tar', ref], { encoding: null });
  run('tar', ['-xf', '-', '-C', directory], { input: archive });
}

function repositoryUrl(explicit) {
  if (explicit) return explicit.replace(/\/$/, '');
  let origin;
  try { origin = git('remote', 'get-url', 'origin'); } catch { return null; }
  return origin.replace(/^git@([^:]+):/, 'https://$1/').replace(/\.git$/, '').replace(/\/$/, '');
}

function render(store) {
  const lines = ['# Báo cáo thay đổi API contract — POC', '',
    '> Báo cáo tự sinh từ nguồn YAML đã bundle. Không phản ánh việc backend đã triển khai.',
    '> Với fixture, commit chỉ ghi nhận bối cảnh chạy POC, không phải commit đã thay đổi API thật; PR example.invalid là metadata giả lập.', '',
    'Báo cáo lưu lịch sử các entry đã phát hiện. `NO_CHANGE` không xóa entry cũ; exit code chỉ phản ánh lần chạy hiện tại.', '',
    `Công cụ: Redocly ${REDOCLY}; oasdiff ${OASDIFF}. Số entry: **${store.entries.length}**.`, '',
    'Phân loại: **BREAKING** = client cũ có thể hỏng; **NON_BREAKING** = tương thích theo contract; **NEEDS_REVIEW** = chưa đủ bằng chứng.', '',
    'Các vị trí dùng JSON Pointer trên bundle tạm (`~1` là `/`). JSON đi kèm giữ toàn bộ semantic diff, fingerprint và hash phục vụ truy vết.', ''];
  if (!store.entries.length) lines.push('Không có thay đổi contract; không tạo entry cho artifact được sinh.', '');
  for (const entry of store.entries) {
    lines.push(`## ${entry.label} — ${entry.classification}`, '',
      `- ID: \`${entry.id}\``,
      `- Contract: ${cell(entry.contractId)}; repository: ${cell(entry.repository)}`,
      `- Nguồn: \`${cell(entry.baseSource)}\` → \`${cell(entry.headSource)}\``,
      `- Phát hiện (UTC): ${entry.detectedAt}; commit time: ${entry.committedAt}`,
      `- Commit nền: ${entry.baseCommit ?? 'không áp dụng (fixture/file)'}`,
      `- Commit đích/bối cảnh: ${entry.commitUrl ? `[${entry.headCommit}](${entry.commitUrl})` : entry.headCommit}`,
      `- PR: ${entry.prUrl ? `[${cell(entry.prUrl)}](${entry.prUrl})` : 'chưa cung cấp; chạy local không suy đoán PR'}`,
      `- Loại metadata: ${entry.metadataKind}`,
      `- Lý do: ${cell(entry.reason)}`, '',
      '| Mức ảnh hưởng | Endpoint / vùng | Thay đổi | Hành động FE / Mobile |',
      '|---|---|---|---|');
    for (const change of entry.changes) lines.push(`| ${change.classification} | ${cell([change.operation, change.path].filter(Boolean).join(' ') || change.section)} | ${cell(vietnameseText(change))} (\`${cell(change.id)}\`) | ${cell(change.clientImpact)} |`);
    lines.push('', '### Vị trí và giá trị trước/sau', '', '| Path / schema / field (JSON Pointer) | Trước | Sau |', '|---|---|---|');
    for (const item of entry.locations) lines.push(`| \`${cell(item.pointer)}\` | ${cell(JSON.stringify(item.before))} | ${cell(JSON.stringify(item.after))} |`);
    lines.push('', '**Kiểm tra thủ công:** BE xác nhận lý do, endpoint dùng schema chung, thay đổi role/ownership mô tả bằng văn bản và thời điểm triển khai. FE/Mobile xác nhận tác động với parser và phiên bản client đang hỗ trợ.', '');
  }
  return lines.join('\n');
}

async function main() {
  const { values: args } = parseArgs({ options: {
    demo: { type: 'boolean' }, help: { type: 'boolean' }, 'fail-on-breaking': { type: 'boolean' },
    ...Object.fromEntries(['base', 'head', 'base-ref', 'head-ref', 'entrypoint', 'contract-id', 'out', 'repo', 'pr', 'reason', 'timestamp'].map(name => [name, { type: 'string' }])),
  } });
  if (args.help) { console.log(HELP); return; }
  const files = Boolean(args.base || args.head);
  const refs = Boolean(args['base-ref'] || args['head-ref']);
  if (Number(Boolean(args.demo)) + Number(files) + Number(refs) !== 1 || (files && !(args.base && args.head)) || (refs && !(args['base-ref'] && args['head-ref']))) throw new Error('Chọn đúng một chế độ --demo, --base/--head hoặc --base-ref/--head-ref. Dùng --help để xem hướng dẫn.');
  const detectedAt = args.timestamp ?? new Date().toISOString();
  if (!Number.isFinite(Date.parse(detectedAt))) throw new Error('--timestamp phải là thời gian ISO hợp lệ.');
  const binary = process.env.OASDIFF_BIN || 'oasdiff';
  const version = run(binary, ['--version']).trim();
  if (!version.endsWith(` ${OASDIFF}`)) throw new Error(`Cần oasdiff ${OASDIFF}; nhận được ${version}.`);
  let event = {};
  if (process.env.GITHUB_EVENT_PATH) event = JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8'));
  const repository = repositoryUrl(args.repo);
  const prUrl = args.pr ?? event.pull_request?.html_url ?? null;
  for (const url of [repository, prUrl].filter(Boolean)) {
    if (!/^https?:\/\/[^\s<>()[\]]+$/.test(url)) throw new Error(`URL metadata không hợp lệ: ${url}`);
  }
  const out = resolve(ROOT, args.out ?? 'reports/contract-change-report.md');
  if (!out.endsWith('.md')) throw new Error('--out phải có đuôi .md.');
  const jsonOut = out.replace(/\.md$/, '.json');
  const store = existsSync(jsonOut) ? JSON.parse(readFileSync(jsonOut, 'utf8')) : { formatVersion: 1, entries: [] };
  if (store.formatVersion !== 1 || !Array.isArray(store.entries)) throw new Error('JSON report cũ không đúng định dạng.');
  const temporary = mkdtempSync(resolve(tmpdir(), 'rentify-contract-'));
  try {
    const headCommit = gitCommit(refs ? args['head-ref'] : 'HEAD');
    const baseCommit = refs ? gitCommit(args['base-ref']) : null;
    const committedAt = git('show', '-s', '--format=%cI', headCommit);
    let pairs;
    if (args.demo) {
      const fixture = resolve(ROOT, 'scripts/fixtures/contract-change');
      pairs = [
        { base: resolve(fixture, 'base/openapi.yaml'), head: resolve(fixture, 'breaking/openapi.yaml'), label: 'Fixture breaking: buildingId trở thành bắt buộc', expected: 'BREAKING' },
        { base: resolve(fixture, 'base/openapi.yaml'), head: resolve(fixture, 'non-breaking/openapi.yaml'), label: 'Fixture non-breaking: thêm displayName tùy chọn', expected: 'NON_BREAKING' },
      ];
    } else if (refs) {
      const entrypoint = args.entrypoint ?? 'src/openapi.yaml';
      if (isAbsolute(entrypoint) || entrypoint.split(/[\\/]/).includes('..')) throw new Error('--entrypoint phải là đường dẫn tương đối trong repo.');
      checkInput(entrypoint);
      for (const [name, ref] of [['base', baseCommit], ['head', headCommit]]) extract(ref, resolve(temporary, name));
      pairs = [{ base: resolve(temporary, 'base', entrypoint), head: resolve(temporary, 'head', entrypoint), label: 'Thay đổi contract từ Git', source: entrypoint }];
    } else pairs = [{ base: resolve(ROOT, args.base), head: resolve(ROOT, args.head), label: 'So sánh nguồn YAML' }];
    let blocked = false;
    for (const [index, pair] of pairs.entries()) {
      const baseFile = resolve(temporary, `base-${index}.json`);
      const headFile = resolve(temporary, `head-${index}.json`);
      const before = bundle(pair.base, baseFile);
      const after = bundle(pair.head, headFile);
      const common = [baseFile, headFile, '--format', 'json', '--flatten-allof', '--flatten-params', '--allow-external-refs=false'];
      const raw = run(binary, ['changelog', ...common]);
      const changes = JSON.parse(raw || '[]') ?? [];
      const semanticDiff = JSON.parse(run(binary, ['diff', ...common]) || '{}') ?? {};
      if (!Array.isArray(changes)) throw new Error('oasdiff changelog không trả về mảng JSON.');
      if (!changes.length && !Object.keys(semanticDiff).length) {
        if (pair.expected) throw new Error(`Fixture sai: mong đợi ${pair.expected}, thực tế NO_CHANGE`);
        console.log(`${pair.label}: NO_CHANGE — không tạo entry (kể cả chỉ thay đổi reference/rentify.json).`);
        continue;
      }
      if (!changes.length) changes.push({ id: 'unclassified-diff', level: 2, section: 'specification', text: 'Có khác biệt cấu trúc/metadata nhưng engine không phân loại tác động; xem bảng trước/sau.' });
      for (const change of changes) {
        if (![1, 2, 3].includes(change.level)) throw new Error(`Severity chưa hỗ trợ: ${change.level}`);
        change.classification = change.level === 3 ? 'BREAKING' : change.level === 2 ? 'NEEDS_REVIEW' : 'NON_BREAKING';
        change.clientImpact = clientAction(change);
      }
      const classification = changes.some(change => change.level === 3) ? 'BREAKING' : changes.some(change => change.level === 2) ? 'NEEDS_REVIEW' : 'NON_BREAKING';
      if (pair.expected && classification !== pair.expected) throw new Error(`Fixture sai: mong đợi ${pair.expected}, thực tế ${classification}`);
      blocked ||= classification !== 'NON_BREAKING';
      const baseHash = hash(before);
      const headHash = hash(after);
      const contractId = args['contract-id'] ?? 'rentify-public';
      // Giữ entry ổn định khi PR dùng cùng baseline nhưng head mới chỉ đổi artifact.
      // Baseline commit khác vẫn phân biệt các lần revert rồi áp lại sau merge.
      const revision = refs ? { baseCommit } : { headCommit };
      const id = hash({ repository, contractId, ...revision, baseHash, headHash });
      if (store.entries.some(entry => entry.id === id)) {
        console.log(`${pair.label}: ${classification} — entry đã tồn tại, không ghi trùng.`);
        continue;
      }
      store.entries.push({
        id, label: pair.label, classification, contractId, repository, baseHash, headHash,
        baseSource: pair.source ?? relative(ROOT, pair.base), headSource: pair.source ?? relative(ROOT, pair.head),
        detectedAt, committedAt, baseCommit, headCommit, prUrl,
        commitUrl: repository ? `${repository}/commit/${headCommit}` : null,
        metadataKind: refs ? 'Git revision thực tế' : args.demo ? 'Fixture minh họa; SHA là bối cảnh chạy, không phải thay đổi API thật' : 'File trên đĩa; SHA là bối cảnh chạy, có thể có thay đổi chưa commit',
        reason: args.reason ?? (args.demo ? 'Minh họa kiểm chứng phân loại contract theo yêu cầu nghiên cứu; không áp dụng vào API hiện tại.' : 'CHƯA CUNG CẤP — tác giả PR phải bổ sung lý do nghiệp vụ; không thể suy ra từ OpenAPI diff.'),
        tools: { redocly: REDOCLY, oasdiff: OASDIFF }, changes, locations: locations(before, after), semanticDiff,
      });
      console.log(`${pair.label}: ${classification} — đã tạo entry ${id.slice(0, 12)}.`);
    }
    mkdirSync(dirname(out), { recursive: true });
    // Ghi lại toàn bộ kho entry, không append theo file Git bị thay đổi.
    for (const [path, content] of [[jsonOut, JSON.stringify(store, null, 2) + '\n'], [out, render(store)]]) {
      writeFileSync(`${path}.tmp`, content);
      renameSync(`${path}.tmp`, path);
    }
    console.log(`Báo cáo: ${out}; ${jsonOut}`);
    if (args['fail-on-breaking'] && blocked) process.exitCode = 1;
  } finally { rmSync(temporary, { recursive: true, force: true }); }
}

main().catch(error => { console.error(`Lỗi POC: ${error.message}`); process.exitCode = 2; });

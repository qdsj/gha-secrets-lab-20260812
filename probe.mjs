import { createHash } from 'node:crypto';
import { appendFile } from 'node:fs/promises';
import { parseArgs } from 'node:util';
import { pathToFileURL } from 'node:url';

export const SECRET_NAMES = [
  'STORAGE_ACCESS_KEY',
  'STORAGE_SECRET_KEY',
  'STORAGE_BUCKET',
  'STORAGE_ENDPOINT',
  'STORAGE_REGION',
  'SPECIAL_CHARS_SECRET',
  'APOSTROPHE_SECRET',
  'DOES_NOT_EXIST'
];

const CLI_OPTIONS = Object.fromEntries(
  SECRET_NAMES.map(name => [name.toLowerCase().replaceAll('_', '-'), { type: 'string' }])
);

export function sha256(value) {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

export function metadata(name, value, expectedHash) {
  const normalized = value ?? '';
  return {
    name,
    present: normalized.length > 0,
    length: normalized.length,
    sha256: sha256(normalized),
    expectedHashPresent: Boolean(expectedHash),
    sha256Match: expectedHash ? sha256(normalized) === expectedHash : null
  };
}

export function parseCliValues(args) {
  const { values } = parseArgs({
    args,
    allowPositionals: false,
    strict: true,
    options: CLI_OPTIONS
  });
  return Object.fromEntries(
    SECRET_NAMES.map(name => [name, values[name.toLowerCase().replaceAll('_', '-')] ?? ''])
  );
}

function valuesFromEnvironment(env) {
  return Object.fromEntries(SECRET_NAMES.map(name => [name, env[name] ?? '']));
}

export function inspect(mode, args, env) {
  const values = mode === 'env' ? valuesFromEnvironment(env) : parseCliValues(args);
  return SECRET_NAMES.map(name => metadata(name, values[name], env[`EXPECTED_${name}_SHA256`]));
}

function markdownTable(records) {
  const rows = records.map(record =>
    `| ${record.name} | ${record.present} | ${record.length} | ${record.expectedHashPresent} | ${record.sha256Match ?? 'n/a'} |`
  );
  return [
    '| Name | Present | Length | Expected hash | SHA-256 match |',
    '| --- | ---: | ---: | ---: | ---: |',
    ...rows
  ].join('\n');
}

async function appendSummary(text, env) {
  if (env.GITHUB_STEP_SUMMARY) await appendFile(env.GITHUB_STEP_SUMMARY, `${text}\n`, 'utf8');
}

export async function run(args = process.argv.slice(2), env = process.env) {
  const mode = args[0];
  if (mode === 'outcome') {
    const label = args[1] ?? 'unnamed-step';
    const outcome = args[2] ?? 'unknown';
    const text = `### ${label}\n\nStep outcome: \`${outcome}\``;
    console.log(JSON.stringify({ type: 'outcome', label, outcome }));
    await appendSummary(text, env);
    return;
  }
  if (mode !== 'env' && mode !== 'cli') throw new Error('Usage: node probe.mjs <env|cli|outcome>');

  const records = inspect(mode, args.slice(1), env);
  const context = {
    event: env.GITHUB_EVENT_NAME ?? 'local',
    repository: env.GITHUB_REPOSITORY ?? 'local',
    scope: env.PROBE_SCOPE ?? 'local',
    runner: env.RUNNER_OS ?? process.platform,
    isFork: env.IS_FORK ?? 'false',
    mode
  };
  console.log(JSON.stringify({ context, records }));
  await appendSummary(
    [
      `### ${mode} / ${context.scope} / ${context.runner}`,
      '',
      `- Event: \`${context.event}\``,
      `- Repository: \`${context.repository}\``,
      `- Fork PR: \`${context.isFork}\``,
      '',
      markdownTable(records),
      ''
    ].join('\n'),
    env
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  run().catch(error => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}


/**
 * Bump version files, CHANGELOG, and public releases.md for a staging → main release.
 * Gathers commit subjects since the last release tag (or origin/main) automatically.
 *
 * Usage:
 *   node scripts/cut-release.mjs --bump patch|minor|major [--notes "summary"] [--phase alpha|beta|ga] [--date YYYY-MM-DD] [--dry-run] [--skip-gather]
 */

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function parseArgs(argv) {
  let bump;
  let notes = '';
  let phase;
  let date = new Date().toISOString().slice(0, 10);
  let dryRun = false;
  let skipGather = false;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--bump') bump = argv[++i];
    else if (arg.startsWith('--bump=')) bump = arg.slice('--bump='.length);
    else if (arg === '--notes') notes = argv[++i] ?? notes;
    else if (arg.startsWith('--notes=')) notes = arg.slice('--notes='.length);
    else if (arg === '--phase') phase = argv[++i];
    else if (arg.startsWith('--phase=')) phase = arg.slice('--phase='.length);
    else if (arg === '--date') date = argv[++i] ?? date;
    else if (arg.startsWith('--date=')) date = arg.slice('--date='.length);
    else if (arg === '--dry-run') dryRun = true;
    else if (arg === '--skip-gather') skipGather = true;
    else if (arg === '--help' || arg === '-h') {
      console.log(`Usage: node scripts/cut-release.mjs --bump patch|minor|major [options]

Options:
  --notes "..."     Optional public summary above the gathered commit list
  --phase alpha|beta|ga
  --date YYYY-MM-DD
  --dry-run         Print the release entry without writing files
  --skip-gather     Do not auto-collect commits (requires --notes)

On Windows, prefer calling the script directly (npm may drop flags):
  node scripts/cut-release.mjs --bump=patch --dry-run

Always bump when promoting staging → main. Commit subjects are gathered from
git since v{current} (if tagged) or origin/main, including Beauty-Backend-API
when that sibling repo is present.`);
      process.exit(0);
    } else if (!arg.startsWith('-') && ['patch', 'minor', 'major'].includes(arg) && !bump) {
      bump = arg;
    }
  }

  if (!bump || !['patch', 'minor', 'major'].includes(bump)) {
    console.error('Error: --bump patch|minor|major is required.');
    process.exit(1);
  }

  if (skipGather && !notes.trim()) {
    console.error('Error: --skip-gather requires --notes.');
    process.exit(1);
  }

  return { bump, notes, phase, date, dryRun, skipGather };
}

function readVersion(root) {
  const fromFile = fs.readFileSync(path.join(root, 'VERSION'), 'utf8').trim();
  if (!/^\d+\.\d+\.\d+$/.test(fromFile)) {
    throw new Error(`Invalid VERSION file: ${fromFile}`);
  }
  return fromFile;
}

function bumpSemver(version, bump) {
  const [x, y, z] = version.split('.').map(Number);
  if (bump === 'major') return `${x + 1}.0.0`;
  if (bump === 'minor') return `${x}.${y + 1}.0`;
  return `${x}.${y}.${z + 1}`;
}

function inferPhase(version, explicit) {
  if (explicit) return explicit;
  const [x] = version.split('.').map(Number);
  if (x >= 1) return 'ga';
  return 'alpha';
}

function phaseLabel(phase) {
  if (phase === 'ga') return 'GA';
  return phase;
}

function updatePackageJson(root, version) {
  const pkgPath = path.join(root, 'package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  pkg.version = version;
  fs.writeFileSync(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`, 'utf8');
}

function git(cwd, args) {
  return execFileSync('git', args, {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
}

function refExists(cwd, ref) {
  try {
    git(cwd, ['rev-parse', '--verify', ref]);
    return true;
  } catch {
    return false;
  }
}

/** Prefer last release tag; otherwise commits not yet on production main. */
function resolveSinceRef(cwd, currentVersion) {
  const tag = `v${currentVersion}`;
  if (refExists(cwd, tag)) return tag;
  if (refExists(cwd, 'origin/main')) return 'origin/main';
  if (refExists(cwd, 'main')) return 'main';
  return null;
}

function shouldOmitSubject(subject) {
  const s = subject.trim();
  if (!s) return true;
  if (/^Merge (branch|pull request|remote-tracking)/i.test(s)) return true;
  if (/^chore:\s*cut[- ]?release/i.test(s)) return true;
  if (/^Bump (version|VERSION)/i.test(s)) return true;
  if (/^cut release/i.test(s)) return true;
  return false;
}

function collectCommitSubjects(cwd, sinceRef) {
  const range = sinceRef ? `${sinceRef}..HEAD` : 'HEAD';
  let out = '';
  try {
    out = git(cwd, ['log', range, '--pretty=format:%s', '--no-merges']);
  } catch {
    return [];
  }
  if (!out) return [];
  const seen = new Set();
  const subjects = [];
  for (const line of out.split('\n')) {
    const subject = line.trim();
    if (shouldOmitSubject(subject)) continue;
    const key = subject.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    subjects.push(subject);
  }
  return subjects;
}

function bulletList(subjects) {
  return subjects.map((s) => `- ${s}`).join('\n');
}

function buildReleaseBody({ summary, frontendCommits, apiCommits, skipGather }) {
  const parts = [];
  if (summary.trim()) parts.push(summary.trim());

  if (!skipGather) {
    if (frontendCommits.length > 0) {
      parts.push(`### Frontend\n\n${bulletList(frontendCommits)}`);
    }
    if (apiCommits.length > 0) {
      parts.push(`### API\n\n${bulletList(apiCommits)}`);
    }
    if (frontendCommits.length === 0 && apiCommits.length === 0) {
      parts.push('### Changes\n\n- (No commits found since last release — add notes with --notes or check git range.)');
    }
  }

  return parts.join('\n\n');
}

function prependSection(filePath, version, date, phase, body) {
  const existing = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : '# Changelog\n';
  const header = `## [${version}] — ${date} (${phaseLabel(phase)})`;
  const entry = `${header}\n\n${body.trim()}\n\n`;

  if (existing.includes(`## [${version}]`)) {
    console.error(`${path.basename(filePath)} already has an entry for ${version}. Aborting.`);
    process.exit(1);
  }

  const marker = existing.indexOf('\n## [');
  if (marker === -1) {
    fs.writeFileSync(filePath, `${existing.trimEnd()}\n\n${entry}`, 'utf8');
    return;
  }

  fs.writeFileSync(filePath, `${existing.slice(0, marker + 1)}${entry}${existing.slice(marker + 1)}`, 'utf8');
}

function findSiblingApiRoot(frontendRoot) {
  const sibling = path.resolve(frontendRoot, '..', 'Beauty-Backend-API');
  if (fs.existsSync(path.join(sibling, 'VERSION')) && fs.existsSync(path.join(sibling, '.git'))) {
    return sibling;
  }
  return null;
}

const root = path.resolve(__dirname, '..');
const { bump, notes, phase: phaseArg, date, dryRun, skipGather } = parseArgs(process.argv.slice(2));
const current = readVersion(root);
const next = bumpSemver(current, bump);
const phase = inferPhase(next, phaseArg);

const sinceRef = resolveSinceRef(root, current);
const frontendCommits = skipGather ? [] : collectCommitSubjects(root, sinceRef);

const apiRoot = findSiblingApiRoot(root);
let apiCommits = [];
let apiSince = null;
if (!skipGather && apiRoot) {
  apiSince = resolveSinceRef(apiRoot, current);
  apiCommits = collectCommitSubjects(apiRoot, apiSince);
}

if (!skipGather && frontendCommits.length === 0 && apiCommits.length === 0 && !notes.trim()) {
  console.error(
    `No commits found since ${sinceRef ?? 'HEAD'} and no --notes provided. Nothing to release.`,
  );
  process.exit(1);
}

const body = buildReleaseBody({
  summary: notes,
  frontendCommits,
  apiCommits,
  skipGather,
});

console.log(`Release ${current} → ${next} (${phaseLabel(phase)}, ${bump})`);
console.log(`Frontend range: ${sinceRef ? `${sinceRef}..HEAD` : 'HEAD'} (${frontendCommits.length} commits)`);
if (apiRoot) {
  console.log(`API range:      ${apiSince ? `${apiSince}..HEAD` : 'HEAD'} (${apiCommits.length} commits)`);
} else {
  console.log('API sibling Beauty-Backend-API not found — frontend commits only.');
}
console.log('');
console.log('--- release notes preview ---');
console.log(`## [${next}] — ${date} (${phaseLabel(phase)})\n`);
console.log(body);
console.log('--- end preview ---');
console.log('');

if (dryRun) {
  console.log('Dry run — no files written.');
  process.exit(0);
}

fs.writeFileSync(path.join(root, 'VERSION'), `${next}\n`, 'utf8');
updatePackageJson(root, next);
prependSection(path.join(root, 'CHANGELOG.md'), next, date, phase, body);
prependSection(path.join(root, 'src', 'content', 'releases.md'), next, date, phase, body);

console.log('Wrote VERSION, package.json, CHANGELOG.md, src/content/releases.md');
console.log('');
console.log('Next steps:');
console.log('  1. Run the same --bump (and optional --notes) in Beauty-Backend-API: npm run cut-release');
console.log('  2. Review / edit release notes if needed, then commit on staging in both repos.');
console.log('  3. Merge staging → main (no force-push).');
console.log(`  4. git tag v${next} && git push origin v${next}  (both repos)`);
console.log('  5. Confirm production deploy from main; public notes at /releases');
console.log('');
console.log('See docs/staging-and-releases.md');

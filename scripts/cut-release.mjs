/**
 * Bump version files, CHANGELOG, and public releases.md for a staging → main release.
 *
 * Usage:
 *   node scripts/cut-release.mjs --bump patch|minor|major [--notes "summary"] [--phase alpha|beta|ga] [--date YYYY-MM-DD]
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function parseArgs(argv) {
  let bump;
  let notes = 'Staging promoted to production.';
  let phase;
  let date = new Date().toISOString().slice(0, 10);

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--bump') bump = argv[++i];
    else if (arg === '--notes') notes = argv[++i] ?? notes;
    else if (arg === '--phase') phase = argv[++i];
    else if (arg === '--date') date = argv[++i] ?? date;
    else if (arg === '--help' || arg === '-h') {
      console.log(
        'Usage: node scripts/cut-release.mjs --bump patch|minor|major [--notes "..."] [--phase alpha|beta|ga]',
      );
      process.exit(0);
    }
  }

  if (!bump || !['patch', 'minor', 'major'].includes(bump)) {
    console.error('Error: --bump patch|minor|major is required.');
    process.exit(1);
  }

  return { bump, notes, phase, date };
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

function prependSection(filePath, version, date, phase, notes) {
  const existing = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : '# Changelog\n';
  const header = `## [${version}] — ${date} (${phaseLabel(phase)})`;
  const entry = `${header}\n\n${notes.trim()}\n\n`;

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

const root = path.resolve(__dirname, '..');
const { bump, notes, phase: phaseArg, date } = parseArgs(process.argv.slice(2));
const current = readVersion(root);
const next = bumpSemver(current, bump);
const phase = inferPhase(next, phaseArg);

fs.writeFileSync(path.join(root, 'VERSION'), `${next}\n`, 'utf8');
updatePackageJson(root, next);
prependSection(path.join(root, 'CHANGELOG.md'), next, date, phase, notes);
prependSection(path.join(root, 'src', 'content', 'releases.md'), next, date, phase, notes);

console.log(`Bumped ${current} → ${next} (${phaseLabel(phase)}, ${bump})`);
console.log('');
console.log('Next steps:');
console.log('  1. Mirror the same bump in Beauty-Backend-API (npm run cut-release).');
console.log('  2. Commit on staging in both repos.');
console.log('  3. Merge staging → main (no force-push).');
console.log(`  4. git tag v${next} && git push origin v${next}`);
console.log('  5. Confirm Vercel production deploys from main; staging branch uses staging API + separate DB.');
console.log('');
console.log('See docs/staging-and-releases.md');

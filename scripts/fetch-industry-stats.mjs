/**
 * Pull the latest published BLS QCEW salon counts and write a snapshot for the
 * launch page. Never invent numbers: if a quarter cannot be parsed, try an
 * older published quarter, then keep the existing snapshot / fallback.
 *
 * Usage:
 *   node scripts/fetch-industry-stats.mjs
 *   SKIP_INDUSTRY_STATS_FETCH=1 node scripts/fetch-industry-stats.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const snapshotPath = path.join(root, 'src/generated/industry-stats.snapshot.ts');
const llmsPath = path.join(root, 'public/llms.txt');

const USER_AGENT = 'ViselleIndustryStats/1.0 (+https://viselle.net/; hello@viselle.net)';
const TIMEOUT_MS = 12_000;
const AREA_US = 'US000';
const OWN_PRIVATE = '5';
const FRED_URL = 'https://fred.stlouisfed.org/graph/fredgraph.csv?id=IPUUN81211W200000000';

const LABELS = {
  81211: 'Hair, nail, and skin care',
  812112: 'Beauty salons',
  812113: 'Nail salons',
  812111: 'Barber shops',
  81219: 'Other personal care services',
};

const QUARTERS = [
  [2026, 2],
  [2026, 1],
  [2025, 4],
  [2025, 3],
  [2025, 2],
  [2025, 1],
];

function parseCsvLine(line) {
  const out = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === ',' && !inQuotes) {
      out.push(cur);
      cur = '';
    } else {
      cur += c;
    }
  }
  out.push(cur);
  return out;
}

function parseCsv(text) {
  if (!text || text.includes('<html') || !text.includes('qtrly_estabs')) return [];
  const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length < 2) return [];
  const headers = parseCsvLine(lines[0]).map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const cells = parseCsvLine(line);
    const row = {};
    headers.forEach((header, i) => {
      row[header] = cells[i] ?? '';
    });
    return row;
  });
}

function toInt(value) {
  const n = Number.parseInt(String(value).replace(/,/g, ''), 10);
  return Number.isFinite(n) ? n : NaN;
}

function findRow(rows, { areaFips, ownCode, industry }) {
  return rows.find(
    (row) =>
      String(row.area_fips).trim() === areaFips &&
      String(row.own_code).trim() === ownCode &&
      String(row.industry_code).trim() === industry,
  );
}

function sliceFromRow(row, naics) {
  if (!row) return null;
  const disclosure = String(row.disclosure_code ?? '').trim();
  if (disclosure === 'N') return null;
  const establishments = toInt(row.qtrly_estabs);
  const month3Employment = toInt(row.month3_emplvl);
  const avgWeeklyWage = toInt(row.avg_wkly_wage);
  if (!(establishments > 0) || !Number.isFinite(month3Employment) || month3Employment < 0) {
    return null;
  }
  return {
    naics,
    label: LABELS[naics],
    establishments,
    month3Employment,
    avgWeeklyWage: Number.isFinite(avgWeeklyWage) && avgWeeklyWage >= 0 ? avgWeeklyWage : 0,
  };
}

async function fetchText(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': USER_AGENT, Accept: 'text/csv,text/plain,*/*' },
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function industryUrl(year, quarter, naics) {
  return `https://data.bls.gov/cew/data/api/${year}/${quarter}/industry/${naics}.csv`;
}

function areaUrl(year, quarter, fips) {
  return `https://data.bls.gov/cew/data/api/${year}/${quarter}/area/${fips}.csv`;
}

async function loadIndustrySlice(year, quarter, naics) {
  const text = await fetchText(industryUrl(year, quarter, naics));
  if (!text) return null;
  const row = findRow(parseCsv(text), { areaFips: AREA_US, ownCode: OWN_PRIVATE, industry: naics });
  return sliceFromRow(row, naics);
}

function areaSlice(rows, naics) {
  const match = rows.find(
    (row) => String(row.own_code).trim() === OWN_PRIVATE && String(row.industry_code).trim() === naics,
  );
  return sliceFromRow(match, naics);
}

async function fetchFredJobs(year) {
  const text = await fetchText(FRED_URL);
  if (!text || text.includes('<html')) return null;
  const lines = text.split(/\r?\n/).filter(Boolean);
  for (let i = lines.length - 1; i >= 1; i--) {
    const [date, raw] = lines[i].split(',');
    if (!date || !raw || raw === '.') continue;
    const value = Number.parseFloat(raw);
    const rowYear = Number.parseInt(date.slice(0, 4), 10);
    if (rowYear === year && Number.isFinite(value) && value > 0) {
      return { year: rowYear, value };
    }
  }
  return null;
}

function writeSnapshot(stats) {
  const body = `/** Generated by scripts/fetch-industry-stats.mjs — do not edit by hand. */\nexport const industryStatsSnapshot = ${JSON.stringify(stats, null, 2)};\n`;
  fs.mkdirSync(path.dirname(snapshotPath), { recursive: true });
  fs.writeFileSync(snapshotPath, body);
}

function updateLlmsTxt(stats) {
  if (!fs.existsSync(llmsPath)) return;
  const line = `- There are ${stats.hairNailSkin.establishments.toLocaleString('en-US')} hair, nail, and skin care shops in the US (BLS QCEW, ${stats.periodLabel}, NAICS 81211, private payroll establishments). Most have fewer than five people on payroll. https://www.bls.gov/cew/`;
  let text = fs.readFileSync(llmsPath, 'utf8');
  const nextLine = `${line}\n`;
  if (text.includes('NAICS 81211')) {
    text = text.replace(/- There are [\s\S]*?https:\/\/www\.bls\.gov\/cew\/\n/, nextLine);
  } else {
    const marker = '## Who it is for\n';
    if (text.includes(marker)) {
      text = text.replace(marker, `${marker}\n${nextLine}`);
    } else {
      text = `${text.trimEnd()}\n\n## Industry context\n\n${nextLine}`;
    }
  }
  fs.writeFileSync(llmsPath, text);
}

async function fetchQuarter(year, quarter) {
  const hairNailSkin = await loadIndustrySlice(year, quarter, '81211');
  if (!hairNailSkin) return null;

  const [beautySalons, nailSalons, barberShops, otherPersonalCare, greeneText, missouriText] =
    await Promise.all([
      loadIndustrySlice(year, quarter, '812112'),
      loadIndustrySlice(year, quarter, '812113'),
      loadIndustrySlice(year, quarter, '812111'),
      loadIndustrySlice(year, quarter, '81219'),
      fetchText(areaUrl(year, quarter, '29077')),
      fetchText(areaUrl(year, quarter, '29000')),
    ]);

  if (!beautySalons || !nailSalons || !barberShops) return null;

  const greeneRows = parseCsv(greeneText ?? '');
  const greeneHair = areaSlice(greeneRows, '81211');
  const greeneBeauty = areaSlice(greeneRows, '812112');
  const greeneNail = areaSlice(greeneRows, '812113');
  const greeneBarber = areaSlice(greeneRows, '812111');
  if (!greeneHair || !greeneBeauty || !greeneNail || !greeneBarber) return null;

  const missouriRows = parseCsv(missouriText ?? '');
  const missouriHair = areaSlice(missouriRows, '81211');
  if (!missouriHair) return null;

  const fredJobsThousands = (await fetchFredJobs(year)) ?? undefined;

  return {
    fetchedAt: new Date().toISOString().slice(0, 10),
    live: true,
    period: { year, quarter },
    periodLabel: `${year} Q${quarter}`,
    hairNailSkin,
    beautySalons,
    nailSalons,
    barberShops,
    ...(otherPersonalCare ? { otherPersonalCare } : {}),
    greeneCounty: {
      areaFips: '29077',
      hairNailSkin: greeneHair,
      beautySalons: greeneBeauty,
      nailSalons: greeneNail,
      barberShops: greeneBarber,
    },
    missouri: {
      areaFips: '29000',
      hairNailSkin: missouriHair,
    },
    ...(fredJobsThousands ? { fredJobsThousands } : {}),
  };
}

async function main() {
  if (process.env.SKIP_INDUSTRY_STATS_FETCH === '1') {
    console.log('Skipping BLS QCEW fetch (SKIP_INDUSTRY_STATS_FETCH=1).');
    return;
  }

  for (const [year, quarter] of QUARTERS) {
    process.stdout.write(`Trying BLS QCEW ${year} Q${quarter}… `);
    const stats = await fetchQuarter(year, quarter);
    if (!stats) {
      console.log('not published or incomplete.');
      continue;
    }
    writeSnapshot(stats);
    updateLlmsTxt(stats);
    console.log(
      `ok — ${stats.hairNailSkin.establishments.toLocaleString('en-US')} US shops (NAICS 81211).`,
    );
    return;
  }

  console.warn('BLS QCEW fetch did not yield a parseable quarter. Keeping existing snapshot / fallback.');
}

main().catch((err) => {
  console.warn('BLS QCEW fetch failed; keeping existing snapshot / fallback.', err);
  process.exitCode = 0;
});

/**
 * BLS QCEW salon-industry counts for the launch page (GEO/AEO).
 *
 * Do not use CEU8081200001 (personal and laundry services — includes dry cleaning).
 * Do not invent no-show rates or third-party estimates. Numbers come from QCEW
 * (payroll establishments, private ownership) or the verified fallback below.
 */
import { marketingFaqEntities } from '../content/marketing-faq-items';
import { industryStatsSnapshot } from '../generated/industry-stats.snapshot';

export const BLS_QCEW_HOME = 'https://www.bls.gov/cew/';
export const BLS_AREA_US = 'US000';
export const BLS_OWN_PRIVATE = '5';

export interface QcewSlice {
  naics: string;
  label: string;
  establishments: number;
  month3Employment: number;
  avgWeeklyWage: number;
}

export interface IndustryStats {
  fetchedAt: string;
  live: boolean;
  period: { year: number; quarter: number };
  periodLabel: string;
  hairNailSkin: QcewSlice;
  beautySalons: QcewSlice;
  nailSalons: QcewSlice;
  barberShops: QcewSlice;
  otherPersonalCare?: QcewSlice;
  greeneCounty: {
    areaFips: string;
    hairNailSkin: QcewSlice;
    beautySalons: QcewSlice;
    nailSalons: QcewSlice;
    barberShops: QcewSlice;
  };
  missouri: {
    areaFips: string;
    hairNailSkin: QcewSlice;
  };
  /** FRED IPUUN81211W200000000, thousands of jobs including self-employed. */
  fredJobsThousands?: { year: number; value: number };
}

/** Verified 2026-08-29 from BLS QCEW 2025 Q1, area US000, own_code 5. */
export const FALLBACK_STATS: IndustryStats = {
  fetchedAt: '2026-08-29',
  live: false,
  period: { year: 2025, quarter: 1 },
  periodLabel: '2025 Q1',
  hairNailSkin: {
    naics: '81211',
    label: 'Hair, nail, and skin care',
    establishments: 120_014,
    month3Employment: 547_906,
    avgWeeklyWage: 608,
  },
  beautySalons: {
    naics: '812112',
    label: 'Beauty salons',
    establishments: 77_524,
    month3Employment: 361_203,
    avgWeeklyWage: 648,
  },
  nailSalons: {
    naics: '812113',
    label: 'Nail salons',
    establishments: 34_042,
    month3Employment: 151_417,
    avgWeeklyWage: 483,
  },
  barberShops: {
    naics: '812111',
    label: 'Barber shops',
    establishments: 8_448,
    month3Employment: 35_286,
    avgWeeklyWage: 723,
  },
  otherPersonalCare: {
    naics: '81219',
    label: 'Other personal care services',
    establishments: 35_420,
    month3Employment: 197_086,
    avgWeeklyWage: 674,
  },
  greeneCounty: {
    areaFips: '29077',
    hairNailSkin: {
      naics: '81211',
      label: 'Hair, nail, and skin care',
      establishments: 124,
      month3Employment: 0,
      avgWeeklyWage: 0,
    },
    beautySalons: {
      naics: '812112',
      label: 'Beauty salons',
      establishments: 75,
      month3Employment: 0,
      avgWeeklyWage: 0,
    },
    nailSalons: {
      naics: '812113',
      label: 'Nail salons',
      establishments: 30,
      month3Employment: 0,
      avgWeeklyWage: 0,
    },
    barberShops: {
      naics: '812111',
      label: 'Barber shops',
      establishments: 19,
      month3Employment: 0,
      avgWeeklyWage: 0,
    },
  },
  missouri: {
    areaFips: '29000',
    hairNailSkin: {
      naics: '81211',
      label: 'Hair, nail, and skin care',
      establishments: 1_686,
      month3Employment: 0,
      avgWeeklyWage: 0,
    },
  },
  fredJobsThousands: { year: 2025, value: 1104.2 },
};

function isPositiveInt(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

function isSlice(value: unknown, naics: string): value is QcewSlice {
  if (!value || typeof value !== 'object') return false;
  const slice = value as QcewSlice;
  return (
    slice.naics === naics &&
    typeof slice.label === 'string' &&
    slice.label.length > 0 &&
    isPositiveInt(slice.establishments) &&
    typeof slice.month3Employment === 'number' &&
    Number.isFinite(slice.month3Employment) &&
    slice.month3Employment >= 0 &&
    typeof slice.avgWeeklyWage === 'number' &&
    Number.isFinite(slice.avgWeeklyWage) &&
    slice.avgWeeklyWage >= 0
  );
}

export function isIndustryStats(value: unknown): value is IndustryStats {
  if (!value || typeof value !== 'object') return false;
  const stats = value as IndustryStats;
  return (
    typeof stats.fetchedAt === 'string' &&
    typeof stats.live === 'boolean' &&
    typeof stats.periodLabel === 'string' &&
    !!stats.period &&
    isPositiveInt(stats.period.year) &&
    stats.period.quarter >= 1 &&
    stats.period.quarter <= 4 &&
    isSlice(stats.hairNailSkin, '81211') &&
    isSlice(stats.beautySalons, '812112') &&
    isSlice(stats.nailSalons, '812113') &&
    isSlice(stats.barberShops, '812111') &&
    !!stats.greeneCounty &&
    isSlice(stats.greeneCounty.hairNailSkin, '81211') &&
    isSlice(stats.greeneCounty.beautySalons, '812112') &&
    isSlice(stats.greeneCounty.nailSalons, '812113') &&
    isSlice(stats.greeneCounty.barberShops, '812111') &&
    !!stats.missouri &&
    isSlice(stats.missouri.hairNailSkin, '81211')
  );
}

export function resolveIndustryStats(snapshot: unknown = industryStatsSnapshot): IndustryStats {
  return isIndustryStats(snapshot) ? snapshot : FALLBACK_STATS;
}

/** Resolved counts for the landing page and JSON-LD. Live snapshot when valid, else fallback. */
export const industryStats: IndustryStats = resolveIndustryStats();

export function formatCount(n: number): string {
  return n.toLocaleString('en-US');
}

export function payrollEmployeesPerShop(stats: IndustryStats = industryStats): number {
  const shops = stats.hairNailSkin.establishments;
  if (shops <= 0) return 0;
  return stats.hairNailSkin.month3Employment / shops;
}

export function formatEmployeesPerShop(stats: IndustryStats = industryStats): string {
  return `~${payrollEmployeesPerShop(stats).toFixed(1)}`;
}

export function shopCountQuote(stats: IndustryStats = industryStats): string {
  return `There are ${formatCount(stats.hairNailSkin.establishments)} hair, nail, and skin care shops in the US. Most have fewer than five people on payroll.`;
}

export function greeneCountyLine(stats: IndustryStats = industryStats): string {
  return `${formatCount(stats.greeneCounty.hairNailSkin.establishments)} of those shops are in Greene County, Missouri.`;
}

export function sourceCitation(stats: IndustryStats = industryStats): string {
  return `Source: BLS QCEW, ${stats.periodLabel}. Payroll shops only; booth renters are undercounted.`;
}

export function formatFredJobs(stats: IndustryStats = industryStats): string | null {
  const fred = stats.fredJobsThousands;
  if (!fred || !isPositiveInt(fred.year) || !Number.isFinite(fred.value) || fred.value <= 0) {
    return null;
  }
  const millions = fred.value / 1000;
  return `Including self-employed, about ${millions.toFixed(2)} million people work in this industry (FRED, ${fred.year}).`;
}

export function buildIndustryFaqPage(stats: IndustryStats = industryStats): Record<string, unknown> {
  const period = stats.periodLabel;
  return {
    '@type': 'FAQPage',
    url: 'https://viselle.net/',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'How many hair, nail, and skin care shops are in the US?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: `${shopCountQuote(stats)} About ${payrollEmployeesPerShop(stats).toFixed(1)} payroll employees per shop. Source: BLS Quarterly Census of Employment and Wages (QCEW), ${period}, NAICS 81211, private ownership. Payroll shops only; booth renters are undercounted. ${BLS_QCEW_HOME}`,
        },
      },
      {
        '@type': 'Question',
        name: 'How many beauty salons, nail salons, and barber shops are in the US?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: `Beauty salons (NAICS 812112): ${formatCount(stats.beautySalons.establishments)}. Nail salons (NAICS 812113): ${formatCount(stats.nailSalons.establishments)}. Barber shops (NAICS 812111): ${formatCount(stats.barberShops.establishments)}. Source: BLS QCEW, ${period}, private ownership.`,
        },
      },
      {
        '@type': 'Question',
        name: 'How many hair, nail, and skin care shops are in Greene County, Missouri?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: `${greeneCountyLine(stats)} ${formatCount(stats.greeneCounty.beautySalons.establishments)} beauty, ${formatCount(stats.greeneCounty.nailSalons.establishments)} nail, ${formatCount(stats.greeneCounty.barberShops.establishments)} barber. Missouri has ${formatCount(stats.missouri.hairNailSkin.establishments)} shops. Source: BLS QCEW, ${period}.`,
        },
      },
      ...marketingFaqEntities(),
    ],
  };
}

export function softwareApplicationIndustryProperties(
  stats: IndustryStats = industryStats,
): Record<string, unknown> {
  return {
    additionalProperty: [
      {
        '@type': 'PropertyValue',
        name: 'US hair, nail, and skin care shops (NAICS 81211)',
        value: String(stats.hairNailSkin.establishments),
        unitText: 'establishments',
        description: `BLS QCEW ${stats.periodLabel}, private ownership. Payroll shops only.`,
      },
    ],
  };
}

export function llmsIndustryLine(stats: IndustryStats = industryStats): string {
  return `- There are ${formatCount(stats.hairNailSkin.establishments)} hair, nail, and skin care shops in the US (BLS QCEW, ${stats.periodLabel}, NAICS 81211, private payroll establishments). Most have fewer than five people on payroll. ${BLS_QCEW_HOME}`;
}

/** Merge FAQPage + shop-count properties into the existing Organization / SoftwareApplication @graph. */
export function mergeIndustryStatsJsonLd(
  data: Record<string, unknown>,
  stats: IndustryStats = industryStats,
): Record<string, unknown> {
  const graph = Array.isArray(data['@graph']) ? [...(data['@graph'] as Record<string, unknown>[])] : [];
  const nextGraph = graph.filter((node) => node['@type'] !== 'FAQPage');
  const software = nextGraph.find((node) => node['@type'] === 'SoftwareApplication');
  if (software) {
    Object.assign(software, softwareApplicationIndustryProperties(stats));
  }
  nextGraph.push(buildIndustryFaqPage(stats));
  return { ...data, '@graph': nextGraph };
}

export function injectIndustryStatsJsonLd(html: string, stats: IndustryStats = industryStats): string {
  const marker = '<script type="application/ld+json">';
  const start = html.indexOf(marker);
  if (start === -1) return html;
  const contentStart = start + marker.length;
  const end = html.indexOf('</script>', contentStart);
  if (end === -1) return html;
  try {
    const parsed = JSON.parse(html.slice(contentStart, end)) as Record<string, unknown>;
    const merged = mergeIndustryStatsJsonLd(parsed, stats);
    const pretty = JSON.stringify(merged, null, 2)
      .split('\n')
      .map((line, i) => (i === 0 ? line : `      ${line}`))
      .join('\n');
    return `${html.slice(0, contentStart)}\n      ${pretty}\n    ${html.slice(end)}`;
  } catch {
    return html;
  }
}

/**
 * Generate Entity IDs Usage Report
 * 
 * This script generates a usage report for entity_ids access across the application.
 * It can be used to monitor the deprecation process and identify areas that need attention.
 * 
 * Usage:
 *   npx tsx scripts/generate-entity-ids-usage-report.ts [days]
 * 
 * Arguments:
 *   days - Number of days to include in the report (default: 7)
 */

import { generateUsageReport } from '../shared/deprecation-monitor';

// Get number of days from command line arguments or use default
const args = process.argv.slice(2);
const days = args.length > 0 ? parseInt(args[0], 10) : 7;

if (isNaN(days) || days <= 0) {
  console.error('Error: Days must be a positive number');
  process.exit(1);
}

// Calculate date range
const endDate = new Date();
const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);

console.log(`Generating entity_ids usage report for the last ${days} days (${startDate.toISOString()} to ${endDate.toISOString()})...\n`);

// Generate the report
const report = generateUsageReport(startDate, endDate);

// Print summary
console.log('=== ENTITY_IDS USAGE REPORT ===');
console.log(`Period: ${report.startDate.toISOString()} to ${report.endDate.toISOString()}`);
console.log(`Total usage: ${report.total} occurrences`);
console.log(`Direct access: ${report.directAccessCount} occurrences`);
console.log(`Fallback usage: ${report.fallbackUsageCount} occurrences`);
console.log(`Compatibility updates: ${report.updateUsageCount} occurrences`);

// Print method breakdown
console.log('\n=== USAGE BY METHOD ===');
Object.entries(report.byMethod).forEach(([method, counts]) => {
  console.log(`\n${method}:`);
  console.log(`  Direct access: ${counts.directAccessCount} occurrences`);
  console.log(`  Fallback usage: ${counts.fallbackUsageCount} occurrences`);
  console.log(`  Compatibility updates: ${counts.updateUsageCount} occurrences`);
  console.log(`  Total: ${counts.directAccessCount + counts.fallbackUsageCount + counts.updateUsageCount} occurrences`);
});

// Provide actionable insights
console.log('\n=== INSIGHTS AND RECOMMENDATIONS ===');

if (report.directAccessCount > 0) {
  console.log('❗ Direct entity_ids access detected. These should be eliminated first:');
  
  Object.entries(report.byMethod)
    .filter(([_, counts]) => counts.directAccessCount > 0)
    .sort((a, b) => b[1].directAccessCount - a[1].directAccessCount)
    .forEach(([method, counts]) => {
      console.log(`  - ${method}: ${counts.directAccessCount} occurrences`);
    });
} else {
  console.log('✅ No direct entity_ids access detected.');
}

if (report.fallbackUsageCount > 0) {
  console.log('\n⚠️ Fallback to entity_ids detected. These indicate missing junction table data:');
  
  Object.entries(report.byMethod)
    .filter(([_, counts]) => counts.fallbackUsageCount > 0)
    .sort((a, b) => b[1].fallbackUsageCount - a[1].fallbackUsageCount)
    .forEach(([method, counts]) => {
      console.log(`  - ${method}: ${counts.fallbackUsageCount} occurrences`);
    });
} else {
  console.log('✅ No fallbacks to entity_ids detected.');
}

// Print deprecation timeline status
const now = new Date();
const phase1End = new Date('2025-06-30'); // End of Q2 2025
const phase2End = new Date('2025-09-30'); // End of Q3 2025
const phase3End = new Date('2025-12-31'); // End of Q4 2025
const phase4Start = new Date('2026-01-01'); // Start of Q1 2026

console.log('\n=== DEPRECATION TIMELINE STATUS ===');

if (now < phase1End) {
  const daysToPhase2 = Math.ceil((phase1End.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  console.log(`Current Phase: 1 - Dual Storage (Q1-Q2 2025)`);
  console.log(`Days until Phase 2: ${daysToPhase2}`);
} else if (now < phase2End) {
  const daysToPhase3 = Math.ceil((phase2End.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  console.log(`Current Phase: 2 - Junction Table Primary with Deprecation Notice (Q3 2025)`);
  console.log(`Days until Phase 3: ${daysToPhase3}`);
} else if (now < phase3End) {
  const daysToPhase4 = Math.ceil((phase3End.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  console.log(`Current Phase: 3 - Junction Table Only with entity_ids Hidden (Q4 2025)`);
  console.log(`Days until Phase 4: ${daysToPhase4}`);
} else if (now >= phase4Start) {
  console.log(`Current Phase: 4 - Complete Removal (Q1 2026)`);
  console.log(`entity_ids should be fully removed by now.`);
}

console.log('\nReport generated at:', new Date().toISOString());
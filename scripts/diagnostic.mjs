#!/usr/bin/env node
/**
 * DIAGNOSTIC REPORT: DATABASE DATA LOSS INVESTIGATION
 */

import fs from 'fs';
import path from 'path';

console.log('🔍 DIAGNOSTIC REPORT: DATABASE STATE ANALYSIS');
console.log('=' .repeat(70) + '\n');

// Check what seed scripts are available in the main checkout
const mainCheckoutScripts = [
  'seed-curriculum.ts',
  'seed-quiz.ts',
  'seed-ospe-keys.ts',
  'seed-ospe-mcq.ts',
  'seed-admin.ts',
  'seed-plans.ts',
  'seed-testusers.ts',
];

console.log('📋 AVAILABLE SEED SCRIPTS IN MAIN CHECKOUT:\n');
const scriptsDir = 'C:\\Users\\anasr\\dyad-apps\\horus-lms\\scripts';
mainCheckoutScripts.forEach(s => {
  const exists = fs.existsSync(path.join(scriptsDir, s));
  console.log(`  ${exists ? '✅' : '❌'} ${s}`);
});

console.log('\n📋 TEST SCRIPTS IN CURRENT WORKTREE:\n');
const worktreeScripts = [
  'reset-curriculum.ts',
  'populate-test-content.ts',
  'extract-pdf-content.ts',
  'audit-database.ts',
];
const worktreeScriptsDir = 'C:\\Users\\anasr\\dyad-apps\\copilot-worktrees\\horus-lms\\anasreda9758-debug-friendly-goggles\\scripts';
worktreeScripts.forEach(s => {
  const exists = fs.existsSync(path.join(worktreeScriptsDir, s));
  console.log(`  ${exists ? '✅' : '❌'} ${s}`);
});

// Check git history to see when database-modifying scripts were run
console.log('\n📝 CRITICAL TIMELINE:\n');
console.log('  08/25/2026 16:51 - Original migrations created (0000-0011)');
console.log('  09/01/2026 01:37 - Migration 0012 applied (pdfPageStart/pdfPageEnd)');
console.log('  09/01/2026 01:40-01:44 - Current session work (TypeScript, AI Tutor, PDF mappings)');
console.log('  09/01/2026 01:44:51 - Commit 8d2e84c created');
console.log('');
console.log('  ⚠️  CRITICAL: reset-curriculum.ts and populate-test-content.ts were');
console.log('     CREATED and EXECUTED AFTER commit 8d2e84c was made');

console.log('\n🔓 RECOVERY OPTIONS:\n');
console.log('  1. Database Backup:');
console.log('     - Check if npm run db:backup exists');
console.log('     - Check if .pgdata directory in main checkout has original data');
console.log('');
console.log('  2. Seed with Original Data:');
console.log('     - Run npm run db:seed:curriculum from main checkout');
console.log('     - This should restore 7 modules and 248 lectures');
console.log('');
console.log('  3. Git Checkout:');
console.log('     - Reset worktree database state');
console.log('     - Re-apply migrations cleanly');

console.log('\n⚠️  AFFECTED DATA:\n');
console.log('  LOST:');
console.log('    - 7 original modules');
console.log('    - 248 original lectures');
console.log('    - All PDF references from audit');
console.log('    - All lecture content');
console.log('');
console.log('  REPLACED WITH:');
console.log('    - 2 test modules');
console.log('    - 6 test lectures');
console.log('    - Sample Arabic content (التشريح العام)');

console.log('\n✅ NEXT STEPS:\n');
console.log('  1. STOP - Do NOT run any more seed scripts');
console.log('  2. Identify best recovery method with user');
console.log('  3. Use npm run db:backup to preserve current state if needed');
console.log('  4. Restore original data safely');

process.exit(0);

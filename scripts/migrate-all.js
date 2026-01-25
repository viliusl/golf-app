/**
 * Master Migration Script for Unified Player Model PR
 * 
 * This script runs all migrations required for the unified player model refactor.
 * It should be run on production AFTER deploying the new code.
 * 
 * Migrations performed (in order):
 * 1. migrate-team-members.js - Convert team members to player references
 * 2. migrate-events.js - Update events to use player references
 * 3. migrate-event-handicap-snapshots.js - Add handicap snapshots to event members
 * 
 * Usage:
 *   node scripts/migrate-all.js
 *   node scripts/migrate-all.js --dry-run    # Preview changes
 * 
 * IMPORTANT: 
 * - Back up your database before running!
 * - Run with --dry-run first to preview changes
 * - Each migration is idempotent (safe to run multiple times)
 * 
 * Environment:
 *   Requires MONGODB_URI to be set (via .env or .env.local)
 */

const { execSync } = require('child_process');
const path = require('path');

const DRY_RUN = process.argv.includes('--dry-run');

const migrations = [
  {
    name: 'Team Members to Player References',
    script: 'migrate-team-members.js',
    description: 'Converts embedded team member data to Player collection references'
  },
  {
    name: 'Events Player References',
    script: 'migrate-events.js',
    description: 'Updates event team members to use unified player references'
  },
  {
    name: 'Event Handicap Snapshots',
    script: 'migrate-event-handicap-snapshots.js',
    description: 'Adds handicap snapshots to existing event team members'
  }
];

async function runMigrations() {
  console.log('╔' + '═'.repeat(60) + '╗');
  console.log('║  Master Migration: Unified Player Model                    ║');
  console.log('╚' + '═'.repeat(60) + '╝');
  
  if (DRY_RUN) {
    console.log('\n⚠️  DRY RUN MODE - No changes will be made\n');
  } else {
    console.log('\n⚠️  WARNING: This will modify your database!');
    console.log('   Make sure you have a backup before proceeding.\n');
  }

  console.log('Migrations to run:');
  migrations.forEach((m, i) => {
    console.log(`  ${i + 1}. ${m.name}`);
    console.log(`     ${m.description}`);
  });
  console.log('');

  const scriptsDir = path.dirname(__filename);
  let success = 0;
  let failed = 0;

  for (let i = 0; i < migrations.length; i++) {
    const migration = migrations[i];
    
    console.log('\n' + '─'.repeat(60));
    console.log(`Running [${i + 1}/${migrations.length}]: ${migration.name}`);
    console.log('─'.repeat(60) + '\n');

    try {
      const scriptPath = path.join(scriptsDir, migration.script);
      const dryRunFlag = DRY_RUN ? ' --dry-run' : '';
      
      execSync(`node "${scriptPath}"${dryRunFlag}`, {
        stdio: 'inherit',
        env: process.env
      });
      
      success++;
      console.log(`\n✓ ${migration.name} completed`);
    } catch (error) {
      failed++;
      console.error(`\n✗ ${migration.name} failed`);
      console.error('  Stopping migration sequence.');
      break;
    }
  }

  console.log('\n' + '═'.repeat(60));
  console.log('Migration Summary');
  console.log('═'.repeat(60));
  console.log(`  Total migrations: ${migrations.length}`);
  console.log(`  Successful: ${success}`);
  console.log(`  Failed: ${failed}`);
  console.log(`  Skipped: ${migrations.length - success - failed}`);
  
  if (DRY_RUN) {
    console.log('\n⚠️  DRY RUN - No changes were made');
    console.log('   Run without --dry-run to apply changes');
  } else if (failed === 0) {
    console.log('\n✓ All migrations completed successfully!');
  } else {
    console.log('\n✗ Migration sequence stopped due to failure');
    process.exit(1);
  }
}

runMigrations();

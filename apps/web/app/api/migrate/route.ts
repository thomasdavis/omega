import { NextResponse } from 'next/server';
import { exportAllTables, importAllTables } from '@repo/database';

/**
 * Migration API Endpoint
 * Executes SQLite to PostgreSQL data migration (Phases 2-3)
 *
 * Usage: POST /api/migrate
 */
export async function POST() {
  try {
    console.log('🚀 Starting migration phases 2-3...');
    const startTime = Date.now();

    // Phase 2: Export from SQLite
    console.log('📤 Phase 2: Exporting data from SQLite...');
    await exportAllTables();
    console.log('✅ Phase 2 complete');

    // Phase 3: Import to PostgreSQL
    console.log('📥 Phase 3: Importing data to PostgreSQL...');
    await importAllTables();
    console.log('✅ Phase 3 complete');

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    return NextResponse.json({
      success: true,
      message: 'Migration phases 2-3 completed successfully!',
      duration: `${duration}s`,
      timestamp: new Date().toISOString(),
      nextSteps: [
        'Verify data integrity',
        'Enable shadow writing: railway variables --set USE_POSTGRES_SHADOW=true',
        'Monitor for 24-48 hours',
        'Switch to PostgreSQL primary: railway variables --set USE_POSTGRES_PRIMARY=true',
      ],
    });
  } catch (error) {
    console.error('❌ Migration failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

// Also support GET for easy testing
export async function GET() {
  return NextResponse.json({
    endpoint: '/api/migrate',
    method: 'POST',
    description: 'Executes SQLite to PostgreSQL migration phases 2-3',
    status: 'ready',
    phases: {
      phase1: 'PostgreSQL schema setup - COMPLETE ✅',
      phase2: 'Export SQLite data to JSON - Ready to execute',
      phase3: 'Import JSON data to PostgreSQL - Ready to execute',
    },
  });
}

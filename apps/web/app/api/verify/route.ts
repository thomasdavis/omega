import { NextResponse } from 'next/server';
import { getPostgresPool } from '@repo/database';

/**
 * Data Verification API Endpoint
 * Verifies that migration data matches expected counts (Phase 4)
 *
 * Usage: GET /api/verify
 */
export async function GET() {
  try {
    console.log('🔍 Starting data verification (Phase 4)...');

    const pool = await getPostgresPool();

    // Expected counts from migration
    const expectedCounts = {
      messages: 1659,
      queries: 3,
      documents: 8,
      document_collaborators: 8,
      user_profiles: 10,
      user_analysis_history: 22,
    };

    // Query all table row counts
    const result = await pool.query(`
      SELECT 'messages' as table_name, COUNT(*)::int as row_count FROM messages
      UNION ALL SELECT 'queries', COUNT(*)::int FROM queries
      UNION ALL SELECT 'documents', COUNT(*)::int FROM documents
      UNION ALL SELECT 'document_collaborators', COUNT(*)::int FROM document_collaborators
      UNION ALL SELECT 'user_profiles', COUNT(*)::int FROM user_profiles
      UNION ALL SELECT 'user_analysis_history', COUNT(*)::int FROM user_analysis_history
      ORDER BY table_name;
    `);

    // Build verification results
    const tables: Record<string, any> = {};
    let allMatch = true;

    for (const row of result.rows) {
      const tableName = row.table_name;
      const actualCount = parseInt(row.row_count);
      const expectedCount = expectedCounts[tableName as keyof typeof expectedCounts];
      const matches = actualCount === expectedCount;

      tables[tableName] = {
        expected: expectedCount,
        actual: actualCount,
        matches,
        status: matches ? '✅' : '❌',
      };

      if (!matches) {
        allMatch = false;
      }

      console.log(
        `${matches ? '✅' : '❌'} ${tableName}: expected ${expectedCount}, got ${actualCount}`
      );
    }

    const totalExpected = Object.values(expectedCounts).reduce((sum, count) => sum + count, 0);
    const totalActual = result.rows.reduce((sum, row) => sum + parseInt(row.row_count), 0);

    console.log(
      `\n${allMatch ? '✅' : '❌'} Verification ${allMatch ? 'PASSED' : 'FAILED'}`
    );
    console.log(`   Total rows: ${totalActual} / ${totalExpected}`);

    return NextResponse.json({
      success: allMatch,
      phase: 'Phase 4: Data Verification',
      timestamp: new Date().toISOString(),
      summary: {
        totalExpected,
        totalActual,
        allTablesMatch: allMatch,
      },
      tables,
      nextStep: allMatch
        ? 'Enable shadow writing: railway variables --set USE_POSTGRES_SHADOW=true'
        : 'Investigate mismatched row counts',
    });
  } catch (error) {
    console.error('❌ Verification failed:', error);
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

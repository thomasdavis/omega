/**
 * Repair User Profile Schema Tool
 * Fixes database schema issues in the user_profiles table by adding missing columns
 * and ensuring schema compatibility with current code expectations
 */

import { tool } from 'ai';
import { z } from 'zod';
import { getDatabase } from '@repo/database';

export const repairUserProfileSchemaTool = tool({
  description: `Repair and update the user_profiles database schema to ensure all required columns exist.

  **What this tool does:**
  - Inspects the current user_profiles table schema
  - Identifies missing columns (avatar_url, bio, preferences, etc.)
  - Adds missing columns with appropriate types and defaults
  - Creates necessary indexes for performance
  - Verifies schema integrity after repair

  **When to use:**
  - When user profile operations fail due to missing columns
  - After database migrations that may have incomplete schema
  - To ensure schema compatibility with code expectations
  - When debugging profile access issues

  **Safety:**
  - Only adds missing columns (never removes or modifies existing data)
  - Uses IF NOT EXISTS to make operations idempotent
  - Runs in a transaction to ensure atomicity
  - Returns detailed report of changes made

  **Example requests:**
  - "fix user profile database schema"
  - "repair missing columns in user_profiles"
  - "check and fix profile schema"
  - "ensure user_profiles table has all required fields"`,

  inputSchema: z.object({
    dryRun: z.boolean().optional().default(false).describe('If true, only checks what would be fixed without making changes'),
    verbose: z.boolean().optional().default(true).describe('If true, returns detailed schema information'),
  }),

  execute: async ({ dryRun, verbose }) => {
    console.log(`🔧 ${dryRun ? 'Checking' : 'Repairing'} user_profiles schema...`);

    try {
      const db = await getDatabase();

      // 1. Get current schema
      const schemaResult = await db.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_name = 'user_profiles'
        ORDER BY ordinal_position;
      `);

      const currentColumns = new Set(schemaResult.rows.map((row: any) => row.column_name));

      // 2. Define required columns with their specifications
      const requiredColumns = [
        {
          name: 'avatar_url',
          type: 'TEXT',
          nullable: true,
          description: 'User avatar/profile picture URL'
        },
        {
          name: 'bio',
          type: 'TEXT',
          nullable: true,
          description: 'User biography/description'
        },
        {
          name: 'preferences',
          type: 'JSONB',
          nullable: true,
          description: 'User preferences as key-value pairs'
        },
      ];

      // 3. Identify missing columns
      const missingColumns = requiredColumns.filter(col => !currentColumns.has(col.name));

      if (missingColumns.length === 0) {
        const message = '✅ Schema is up to date! All required columns exist.';
        console.log(message);

        return {
          success: true,
          message,
          missingColumns: [],
          currentSchema: verbose ? schemaResult.rows : undefined,
          repaired: false,
        };
      }

      // 4. Build SQL for missing columns
      const alterStatements: string[] = [];
      for (const col of missingColumns) {
        alterStatements.push(
          `ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS ${col.name} ${col.type};`
        );
      }

      // 5. Add GIN index for preferences if it doesn't exist
      const needsPreferencesIndex = missingColumns.some(col => col.name === 'preferences');
      if (needsPreferencesIndex) {
        alterStatements.push(
          `CREATE INDEX IF NOT EXISTS idx_user_profiles_preferences_gin ON user_profiles USING GIN (preferences);`
        );
      }

      if (dryRun) {
        const message = `🔍 Dry run: Found ${missingColumns.length} missing column(s). Would execute:\n\n${alterStatements.join('\n')}`;
        console.log(message);

        return {
          success: true,
          message,
          missingColumns: missingColumns.map(c => c.name),
          sqlStatements: alterStatements,
          repaired: false,
          dryRun: true,
        };
      }

      // 6. Execute repairs in a transaction
      console.log('   Executing schema repairs...');
      await db.query('BEGIN');

      try {
        for (const statement of alterStatements) {
          console.log(`   ${statement}`);
          await db.query(statement);
        }

        await db.query('COMMIT');
        console.log('   ✅ Transaction committed successfully');
      } catch (error) {
        await db.query('ROLLBACK');
        throw error;
      }

      // 7. Verify repairs
      const verifyResult = await db.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'user_profiles'
        AND column_name = ANY($1::text[])
        ORDER BY column_name;
      `, [missingColumns.map(c => c.name)]);

      const repairedColumns = verifyResult.rows.map((row: any) => row.column_name);
      const allRepaired = missingColumns.every(col => repairedColumns.includes(col.name));

      if (!allRepaired) {
        return {
          success: false,
          error: 'Some columns were not added successfully',
          message: 'Schema repair incomplete. Some columns may not have been added.',
          missingColumns: missingColumns.map(c => c.name),
          repairedColumns,
          repaired: false,
        };
      }

      const message = `✅ Schema repaired successfully! Added ${missingColumns.length} column(s): ${missingColumns.map(c => c.name).join(', ')}`;
      console.log(message);

      return {
        success: true,
        message,
        missingColumns: missingColumns.map(c => c.name),
        sqlStatements: alterStatements,
        repairedColumns,
        newSchema: verbose ? verifyResult.rows : undefined,
        repaired: true,
      };

    } catch (error) {
      console.error('Failed to repair user profile schema:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        message: `Failed to repair schema: ${error instanceof Error ? error.message : 'Unknown error'}`,
        repaired: false,
      };
    }
  },
});

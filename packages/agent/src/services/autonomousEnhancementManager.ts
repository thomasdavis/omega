/**
 * Autonomous Enhancement Manager
 * Monitors system performance, usage, and gaps to trigger dynamic improvements
 * Part of the Autonomous Enhancement Framework (Issue #822)
 */

import { getPostgresPool } from '@repo/database';
import { sendMessage } from './mcpCommunicationService.js';

export interface EnhancementEvent {
  id: number;
  event_type: string;
  event_category: string;
  entity_type: string | null;
  entity_id: string | null;
  description: string | null;
  metrics: Record<string, any>;
  action_taken: string | null;
  action_metadata: Record<string, any>;
  severity: string;
  occurred_at: Date;
}

export interface RecordEventInput {
  event_type: string;
  event_category: 'performance' | 'usage' | 'gap' | 'error' | 'improvement';
  entity_type?: string;
  entity_id?: string;
  description?: string;
  metrics?: Record<string, any>;
  severity?: 'info' | 'warning' | 'error' | 'critical';
}

export interface EnhancementRecommendation {
  type: 'create_tool' | 'create_skill' | 'create_agent' | 'optimize_workflow' | 'update_config';
  priority: 'low' | 'medium' | 'high' | 'critical';
  reason: string;
  evidence: EnhancementEvent[];
  suggested_action: Record<string, any>;
}

/**
 * Record an enhancement event
 */
export async function recordEvent(input: RecordEventInput): Promise<EnhancementEvent> {
  const pool = await getPostgresPool();

  const result = await pool.query(
    `INSERT INTO enhancement_events
     (event_type, event_category, entity_type, entity_id, description, metrics, severity)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [
      input.event_type,
      input.event_category,
      input.entity_type || null,
      input.entity_id || null,
      input.description || null,
      JSON.stringify(input.metrics || {}),
      input.severity || 'info',
    ]
  );

  return result.rows[0];
}

/**
 * Record an action taken in response to events
 */
export async function recordAction(
  eventIds: number[],
  action: string,
  metadata: Record<string, any>
): Promise<void> {
  const pool = await getPostgresPool();

  await pool.query(
    `UPDATE enhancement_events
     SET action_taken = $1, action_metadata = $2
     WHERE id = ANY($3)`,
    [action, JSON.stringify(metadata), eventIds]
  );
}

/**
 * Get recent events
 */
export async function getRecentEvents(options?: {
  event_category?: string;
  event_type?: string;
  severity?: string;
  limit?: number;
  offset?: number;
}): Promise<EnhancementEvent[]> {
  const pool = await getPostgresPool();

  let query = 'SELECT * FROM enhancement_events';
  const params: any[] = [];
  const conditions: string[] = [];

  if (options?.event_category) {
    conditions.push(`event_category = $${params.length + 1}`);
    params.push(options.event_category);
  }

  if (options?.event_type) {
    conditions.push(`event_type = $${params.length + 1}`);
    params.push(options.event_type);
  }

  if (options?.severity) {
    conditions.push(`severity = $${params.length + 1}`);
    params.push(options.severity);
  }

  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }

  query += ' ORDER BY occurred_at DESC';

  if (options?.limit) {
    query += ` LIMIT $${params.length + 1}`;
    params.push(options.limit);
  }

  if (options?.offset) {
    query += ` OFFSET $${params.length + 1}`;
    params.push(options.offset);
  }

  const result = await pool.query(query, params);
  return result.rows;
}

/**
 * Analyze tool usage patterns
 */
export async function analyzeToolUsage(): Promise<{
  total_tools: number;
  total_calls: number;
  most_used_tools: Array<{ tool_name: string; usage_count: number }>;
  least_used_tools: Array<{ tool_name: string; usage_count: number }>;
  average_calls_per_tool: number;
}> {
  const pool = await getPostgresPool();

  // Analyze tool calls from messages table
  const result = await pool.query(`
    SELECT
      tool_name,
      COUNT(*) as usage_count
    FROM messages
    WHERE tool_name IS NOT NULL
      AND timestamp > EXTRACT(epoch FROM NOW() - INTERVAL '7 days')::bigint
    GROUP BY tool_name
    ORDER BY usage_count DESC
  `);

  const toolUsage = result.rows;
  const totalCalls = toolUsage.reduce((sum, row) => sum + parseInt(row.usage_count), 0);
  const totalTools = toolUsage.length;

  return {
    total_tools: totalTools,
    total_calls: totalCalls,
    most_used_tools: toolUsage.slice(0, 10),
    least_used_tools: toolUsage.slice(-10).reverse(),
    average_calls_per_tool: totalTools > 0 ? totalCalls / totalTools : 0,
  };
}

/**
 * Detect capability gaps
 * Analyzes user requests that couldn't be fulfilled
 */
export async function detectCapabilityGaps(): Promise<Array<{
  pattern: string;
  frequency: number;
  examples: string[];
}>> {
  const pool = await getPostgresPool();

  // Look for messages where bot expressed inability or used reportMissingTool
  const result = await pool.query(`
    SELECT
      message_content,
      COUNT(*) as frequency
    FROM messages
    WHERE sender_type = 'bot'
      AND (
        message_content ILIKE '%cannot%'
        OR message_content ILIKE '%unable to%'
        OR message_content ILIKE '%don''t have%'
        OR tool_name = 'reportMissingTool'
      )
      AND timestamp > EXTRACT(epoch FROM NOW() - INTERVAL '7 days')::bigint
    GROUP BY message_content
    HAVING COUNT(*) > 2
    ORDER BY frequency DESC
    LIMIT 10
  `);

  return result.rows.map(row => ({
    pattern: row.message_content.substring(0, 200),
    frequency: parseInt(row.frequency),
    examples: [row.message_content],
  }));
}

/**
 * Analyze performance metrics
 */
export async function analyzePerformance(): Promise<{
  slow_tools: Array<{ tool_name: string; avg_execution_time_ms: number; call_count: number }>;
  error_prone_tools: Array<{ tool_name: string; error_rate: number; call_count: number }>;
  overall_success_rate: number;
}> {
  const pool = await getPostgresPool();

  // Note: This is a simplified analysis based on available data
  // In production, you'd want execution time tracking

  const errorResult = await pool.query(`
    SELECT
      tool_name,
      COUNT(*) as total_calls,
      COUNT(*) FILTER (WHERE tool_result LIKE '%error%' OR tool_result LIKE '%failed%') as error_calls
    FROM messages
    WHERE tool_name IS NOT NULL
      AND timestamp > EXTRACT(epoch FROM NOW() - INTERVAL '7 days')::bigint
    GROUP BY tool_name
    HAVING COUNT(*) > 10
  `);

  const errorProneTools = errorResult.rows
    .map(row => ({
      tool_name: row.tool_name,
      error_rate: parseInt(row.error_calls) / parseInt(row.total_calls),
      call_count: parseInt(row.total_calls),
    }))
    .filter(tool => tool.error_rate > 0.1)
    .sort((a, b) => b.error_rate - a.error_rate)
    .slice(0, 10);

  const totalCalls = errorResult.rows.reduce((sum, row) => sum + parseInt(row.total_calls), 0);
  const totalErrors = errorResult.rows.reduce((sum, row) => sum + parseInt(row.error_calls), 0);
  const successRate = totalCalls > 0 ? 1 - (totalErrors / totalCalls) : 1;

  return {
    slow_tools: [], // Would require execution time tracking
    error_prone_tools: errorProneTools,
    overall_success_rate: successRate,
  };
}

/**
 * Generate enhancement recommendations
 */
export async function generateRecommendations(): Promise<EnhancementRecommendation[]> {
  const recommendations: EnhancementRecommendation[] = [];

  // Analyze tool usage
  const toolUsage = await analyzeToolUsage();

  // Detect gaps
  const gaps = await detectCapabilityGaps();
  if (gaps.length > 0) {
    for (const gap of gaps.slice(0, 3)) {
      recommendations.push({
        type: 'create_tool',
        priority: gap.frequency > 10 ? 'high' : 'medium',
        reason: `Detected ${gap.frequency} requests for missing capability: ${gap.pattern.substring(0, 100)}`,
        evidence: [],
        suggested_action: {
          action: 'create_github_issue',
          title: 'Create tool for detected capability gap',
          description: gap.pattern,
          labels: ['enhancement', 'autonomous', 'tool-request'],
        },
      });
    }
  }

  // Analyze performance
  const performance = await analyzePerformance();
  if (performance.error_prone_tools.length > 0) {
    for (const tool of performance.error_prone_tools.slice(0, 2)) {
      recommendations.push({
        type: 'optimize_workflow',
        priority: tool.error_rate > 0.5 ? 'critical' : 'high',
        reason: `Tool "${tool.tool_name}" has ${(tool.error_rate * 100).toFixed(1)}% error rate`,
        evidence: [],
        suggested_action: {
          action: 'investigate_tool_errors',
          tool_name: tool.tool_name,
          error_rate: tool.error_rate,
        },
      });
    }
  }

  // Check for underutilized tools
  if (toolUsage.least_used_tools.length > 0) {
    const unused = toolUsage.least_used_tools.filter(t => t.usage_count < 2);
    if (unused.length > 5) {
      recommendations.push({
        type: 'update_config',
        priority: 'low',
        reason: `${unused.length} tools have been used less than 2 times in the past week`,
        evidence: [],
        suggested_action: {
          action: 'review_tool_relevance',
          tools: unused.map(t => t.tool_name),
        },
      });
    }
  }

  return recommendations;
}

/**
 * Run autonomous enhancement cycle
 * This should be called periodically (e.g., daily)
 */
export async function runEnhancementCycle(): Promise<{
  recommendations: EnhancementRecommendation[];
  actions_taken: number;
}> {
  console.log('🔄 Running autonomous enhancement cycle...');

  // Generate recommendations
  const recommendations = await generateRecommendations();

  console.log(`📊 Generated ${recommendations.length} recommendations`);

  let actionsTaken = 0;

  // Process high-priority recommendations
  for (const rec of recommendations) {
    if (rec.priority === 'critical' || rec.priority === 'high') {
      // Record event
      await recordEvent({
        event_type: rec.type,
        event_category: 'improvement',
        description: rec.reason,
        metrics: rec.suggested_action,
        severity: rec.priority === 'critical' ? 'critical' : 'warning',
      });

      // Send MCP message to notify interested components
      await sendMessage({
        sender_type: 'enhancement_manager',
        sender_id: 'system',
        message_type: 'enhancement_recommendation',
        payload: {
          recommendation: rec,
        },
        priority: rec.priority === 'critical' ? 9 : 7,
      });

      actionsTaken++;
    }
  }

  console.log(`✅ Enhancement cycle complete. ${actionsTaken} actions taken.`);

  return {
    recommendations,
    actions_taken: actionsTaken,
  };
}

/**
 * Get enhancement statistics
 */
export async function getEnhancementStats(): Promise<{
  total_events: number;
  events_by_category: Record<string, number>;
  events_by_severity: Record<string, number>;
  actions_taken: number;
  recent_improvements: EnhancementEvent[];
}> {
  const pool = await getPostgresPool();

  const statsResult = await pool.query(`
    SELECT
      COUNT(*) as total_events,
      COUNT(*) FILTER (WHERE action_taken IS NOT NULL) as actions_taken
    FROM enhancement_events
  `);

  const byCategoryResult = await pool.query(`
    SELECT event_category, COUNT(*) as count
    FROM enhancement_events
    GROUP BY event_category
    ORDER BY count DESC
  `);

  const bySeverityResult = await pool.query(`
    SELECT severity, COUNT(*) as count
    FROM enhancement_events
    GROUP BY severity
    ORDER BY count DESC
  `);

  const recentImprovementsResult = await pool.query(`
    SELECT * FROM enhancement_events
    WHERE event_category = 'improvement'
      AND action_taken IS NOT NULL
    ORDER BY occurred_at DESC
    LIMIT 10
  `);

  const eventsByCategory: Record<string, number> = {};
  for (const row of byCategoryResult.rows) {
    eventsByCategory[row.event_category] = parseInt(row.count);
  }

  const eventsBySeverity: Record<string, number> = {};
  for (const row of bySeverityResult.rows) {
    eventsBySeverity[row.severity] = parseInt(row.count);
  }

  return {
    total_events: parseInt(statsResult.rows[0].total_events),
    events_by_category: eventsByCategory,
    events_by_severity: eventsBySeverity,
    actions_taken: parseInt(statsResult.rows[0].actions_taken),
    recent_improvements: recentImprovementsResult.rows,
  };
}

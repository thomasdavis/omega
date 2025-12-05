import type { TechTranslationSpec } from './types.js';

/**
 * Format a TechTranslationSpec as markdown
 */
export function formatAsMarkdown(spec: TechTranslationSpec): string {
  const sections: string[] = [];

  // Summary
  sections.push('# Technical Specification\n');
  sections.push(`## Summary\n\n${spec.summary}\n`);

  // Assumptions
  if (spec.assumptions.length > 0) {
    sections.push('## Assumptions\n');
    spec.assumptions.forEach((assumption) => {
      sections.push(`- ${assumption}`);
    });
    sections.push('');
  }

  // Risks
  if (spec.risks.length > 0) {
    sections.push('## Risks\n');
    spec.risks.forEach((risk) => {
      sections.push(`- ${risk}`);
    });
    sections.push('');
  }

  // Non-goals
  if (spec.non_goals.length > 0) {
    sections.push('## Non-Goals\n');
    spec.non_goals.forEach((goal) => {
      sections.push(`- ${goal}`);
    });
    sections.push('');
  }

  // API Design
  sections.push('## API Design\n');
  sections.push('### Endpoints\n');
  spec.api_design.endpoints.forEach((endpoint) => {
    sections.push(`- **${endpoint.method}** \`${endpoint.path}\`: ${endpoint.description}`);
  });
  sections.push('');

  sections.push('### Models\n');
  spec.api_design.models.forEach((model) => {
    sections.push(`#### ${model.name}\n`);
    model.fields.forEach((field) => {
      const required = field.required ? '(required)' : '(optional)';
      sections.push(`- \`${field.name}\`: ${field.type} ${required}`);
    });
    sections.push('');
  });

  // Data Model
  if (spec.data_model.tables.length > 0) {
    sections.push('## Data Model\n');
    spec.data_model.tables.forEach((table) => {
      sections.push(`### ${table.name}\n`);
      table.columns.forEach((column) => {
        const nullable = column.nullable ? 'NULL' : 'NOT NULL';
        sections.push(`- \`${column.name}\`: ${column.type} ${nullable}`);
      });
      if (table.indexes && table.indexes.length > 0) {
        sections.push(`\n**Indexes:** ${table.indexes.join(', ')}`);
      }
      sections.push('');
    });
  }

  // Infrastructure
  if (spec.infra.services.length > 0) {
    sections.push('## Infrastructure\n');
    sections.push(`**Services:** ${spec.infra.services.join(', ')}\n`);
    if (spec.infra.dependencies.length > 0) {
      sections.push(`**Dependencies:** ${spec.infra.dependencies.join(', ')}\n`);
    }
    sections.push(`**Deployment:** ${spec.infra.deployment}\n`);
  }

  // Security
  if (spec.security.data_protection.length > 0 || spec.security.authentication !== 'TBD') {
    sections.push('## Security\n');
    sections.push(`**Authentication:** ${spec.security.authentication}\n`);
    sections.push(`**Authorization:** ${spec.security.authorization}\n`);
    if (spec.security.data_protection.length > 0) {
      sections.push('\n**Data Protection:**');
      spec.security.data_protection.forEach((item) => {
        sections.push(`- ${item}`);
      });
      sections.push('');
    }
  }

  // Testing
  if (
    spec.testing.unit_tests.length > 0 ||
    spec.testing.integration_tests.length > 0 ||
    spec.testing.e2e_tests.length > 0
  ) {
    sections.push('## Testing\n');
    if (spec.testing.unit_tests.length > 0) {
      sections.push('### Unit Tests\n');
      spec.testing.unit_tests.forEach((test) => {
        sections.push(`- ${test}`);
      });
      sections.push('');
    }
    if (spec.testing.integration_tests.length > 0) {
      sections.push('### Integration Tests\n');
      spec.testing.integration_tests.forEach((test) => {
        sections.push(`- ${test}`);
      });
      sections.push('');
    }
    if (spec.testing.e2e_tests.length > 0) {
      sections.push('### E2E Tests\n');
      spec.testing.e2e_tests.forEach((test) => {
        sections.push(`- ${test}`);
      });
      sections.push('');
    }
  }

  // Acceptance Criteria
  sections.push('## Acceptance Criteria\n');
  spec.acceptance_criteria.forEach((criteria) => {
    sections.push(`- [ ] ${criteria}`);
  });
  sections.push('');

  // Tasks
  sections.push('## Tasks\n');
  spec.tasks.forEach((task) => {
    sections.push(`### ${task.title} (${task.id})\n`);
    sections.push(`${task.description}\n`);
    if (task.dependencies && task.dependencies.length > 0) {
      sections.push(`**Dependencies:** ${task.dependencies.join(', ')}`);
    }
    if (task.estimate) {
      sections.push(`**Estimate:** ${task.estimate}`);
    }
    sections.push('');
  });

  return sections.join('\n');
}

/**
 * Format a TechTranslationSpec as JSON
 */
export function formatAsJson(spec: TechTranslationSpec): string {
  return JSON.stringify(spec, null, 2);
}

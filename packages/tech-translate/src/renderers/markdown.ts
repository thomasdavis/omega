import type { TechTranslateOutput } from '../schema.js';

/**
 * Renders TechTranslateOutput as formatted Markdown
 */
export function renderMarkdown(output: TechTranslateOutput): string {
  const sections: string[] = [];

  // Title and Summary
  sections.push(`# ${output.title}\n`);
  sections.push(`${output.summary}\n`);

  // Goals
  sections.push('## Goals\n');
  output.spec.goals.forEach((goal) => {
    sections.push(`- ${goal}`);
  });
  sections.push('');

  // Non-Goals
  if (output.spec.nonGoals && output.spec.nonGoals.length > 0) {
    sections.push('## Non-Goals\n');
    output.spec.nonGoals.forEach((nonGoal) => {
      sections.push(`- ${nonGoal}`);
    });
    sections.push('');
  }

  // Architecture
  sections.push('## Architecture\n');
  sections.push(output.spec.architecture);
  sections.push('');

  // API Design
  sections.push('## API Design\n');
  sections.push(output.spec.apiDesign);
  sections.push('');

  // Data Model
  sections.push('## Data Model\n');
  sections.push(output.spec.dataModel);
  sections.push('');

  // Security
  if (output.spec.security) {
    sections.push('## Security\n');
    sections.push(output.spec.security);
    sections.push('');
  }

  // DevOps
  sections.push('## DevOps\n');
  sections.push(output.spec.devOps);
  sections.push('');

  // Testing
  sections.push('## Testing\n');
  sections.push(output.spec.testing);
  sections.push('');

  // Observability
  if (output.spec.observability) {
    sections.push('## Observability\n');
    sections.push(output.spec.observability);
    sections.push('');
  }

  // Migration Plan
  if (output.spec.migrationPlan) {
    sections.push('## Migration Plan\n');
    sections.push(output.spec.migrationPlan);
    sections.push('');
  }

  // Acceptance Criteria
  sections.push('## Acceptance Criteria\n');
  output.spec.acceptanceCriteria.forEach((criterion) => {
    sections.push(`- [ ] ${criterion}`);
  });
  sections.push('');

  // Artifacts
  if (output.artifacts && output.artifacts.length > 0) {
    sections.push('## Artifacts\n');
    output.artifacts.forEach((artifact) => {
      sections.push(`### ${artifact.filename || `${artifact.type} artifact`}\n`);
      sections.push('```' + (artifact.type === 'code' ? '' : artifact.type));
      sections.push(artifact.content);
      sections.push('```\n');
    });
  }

  // Notes
  if (output.notes && output.notes.length > 0) {
    sections.push('## Notes\n');
    output.notes.forEach((note) => {
      sections.push(`> ${note}`);
    });
    sections.push('');
  }

  // Warnings
  if (output.warnings && output.warnings.length > 0) {
    sections.push('## Warnings\n');
    output.warnings.forEach((warning) => {
      sections.push(`⚠️ ${warning}`);
    });
    sections.push('');
  }

  return sections.join('\n');
}

/**
 * Markdown formatter for technical specifications
 * Converts structured spec to well-formatted markdown
 */

import type { TechnicalSpec } from '../types/index.js';

/**
 * Convert technical spec to markdown format
 */
export function specToMarkdown(spec: TechnicalSpec): string {
  const sections: string[] = [];

  // Title and Summary
  sections.push(`# ${spec.summary.title}\n`);
  sections.push(`## Summary\n`);
  sections.push(`${spec.summary.overview}\n`);
  sections.push(`### Objectives\n`);
  spec.summary.objectives.forEach(obj => {
    sections.push(`- ${obj}`);
  });
  sections.push(`\n### Scope\n`);
  sections.push(`${spec.summary.scope}\n`);

  // Assumptions & Constraints
  sections.push(`## Assumptions & Constraints\n`);

  sections.push(`### Assumptions\n`);
  spec.assumptions.assumptions.forEach(assumption => {
    sections.push(`- ${assumption}`);
  });

  sections.push(`\n### Constraints\n`);
  spec.assumptions.constraints.forEach(constraint => {
    sections.push(`- ${constraint}`);
  });

  sections.push(`\n### Dependencies\n`);
  spec.assumptions.dependencies.forEach(dep => {
    sections.push(`- ${dep}`);
  });

  // Requirements
  sections.push(`\n## Requirements\n`);

  sections.push(`### Functional Requirements\n`);
  spec.requirements.functional.forEach(req => {
    sections.push(`**${req.id}**: ${req.description} *(Priority: ${req.priority})*`);
  });

  sections.push(`\n### Non-Functional Requirements\n`);
  spec.requirements.nonFunctional.forEach(req => {
    const metric = req.metric ? ` - ${req.metric}` : '';
    sections.push(`- **${req.category}**: ${req.requirement}${metric}`);
  });

  // API & Interfaces (optional)
  if (spec.api?.endpoints && spec.api.endpoints.length > 0) {
    sections.push(`\n## API & Interfaces\n`);

    sections.push(`### Endpoints\n`);
    spec.api.endpoints.forEach(endpoint => {
      sections.push(`**\`${endpoint.method} ${endpoint.path}\`**`);
      sections.push(`- ${endpoint.description}`);
      if (endpoint.parameters) {
        sections.push(`- Parameters: \`${JSON.stringify(endpoint.parameters)}\``);
      }
      sections.push(`- Response: ${endpoint.response}\n`);
    });
  }

  if (spec.api?.interfaces && spec.api.interfaces.length > 0) {
    sections.push(`### Interfaces\n`);
    spec.api.interfaces.forEach(iface => {
      sections.push(`**${iface.name}** (${iface.type})`);
      sections.push(`- ${iface.description}`);
      if (iface.fields) {
        sections.push(`\`\`\`typescript`);
        Object.entries(iface.fields).forEach(([field, type]) => {
          sections.push(`${field}: ${type}`);
        });
        sections.push(`\`\`\`\n`);
      }
    });
  }

  // Data Model (optional)
  if (spec.dataModel?.entities && spec.dataModel.entities.length > 0) {
    sections.push(`\n## Data Model\n`);

    spec.dataModel.entities.forEach(entity => {
      sections.push(`### ${entity.name}\n`);
      sections.push(`${entity.description}\n`);

      sections.push(`| Field | Type | Required | Description |`);
      sections.push(`|-------|------|----------|-------------|`);
      entity.fields.forEach(field => {
        const desc = field.description || '';
        sections.push(`| ${field.name} | ${field.type} | ${field.required ? 'Yes' : 'No'} | ${desc} |`);
      });

      if (entity.relationships && entity.relationships.length > 0) {
        sections.push(`\n**Relationships**: ${entity.relationships.join(', ')}\n`);
      }
    });

    if (spec.dataModel.storage) {
      sections.push(`### Storage\n`);
      sections.push(`**Type**: ${spec.dataModel.storage.type}\n`);
      sections.push(`**Rationale**: ${spec.dataModel.storage.rationale}\n`);
    }
  }

  // DevOps & Infrastructure (optional)
  if (spec.devops) {
    sections.push(`## DevOps & Infrastructure\n`);

    if (spec.devops.deployment) {
      sections.push(`### Deployment\n`);
      sections.push(`- **Strategy**: ${spec.devops.deployment.strategy}`);
      if (spec.devops.deployment.platform) {
        sections.push(`- **Platform**: ${spec.devops.deployment.platform}`);
      }
      if (spec.devops.deployment.regions) {
        sections.push(`- **Regions**: ${spec.devops.deployment.regions.join(', ')}`);
      }
      sections.push('');
    }

    if (spec.devops.cicd) {
      sections.push(`### CI/CD\n`);
      sections.push(`- **Pipeline**: ${spec.devops.cicd.pipeline}`);
      sections.push(`- **Stages**: ${spec.devops.cicd.stages.join(' → ')}\n`);
    }

    if (spec.devops.monitoring) {
      sections.push(`### Monitoring\n`);
      sections.push(`- **Metrics**: ${spec.devops.monitoring.metrics.join(', ')}`);
      if (spec.devops.monitoring.alerts) {
        sections.push(`- **Alerts**: ${spec.devops.monitoring.alerts.join(', ')}`);
      }
      sections.push('');
    }

    if (spec.devops.infrastructure) {
      sections.push(`### Infrastructure\n`);
      sections.push(`**Components**: ${spec.devops.infrastructure.components.join(', ')}\n`);
    }
  }

  // Security & Privacy (optional)
  if (spec.security) {
    sections.push(`## Security & Privacy\n`);

    if (spec.security.authentication) {
      sections.push(`- **Authentication**: ${spec.security.authentication}`);
    }
    if (spec.security.authorization) {
      sections.push(`- **Authorization**: ${spec.security.authorization}`);
    }
    if (spec.security.dataProtection) {
      sections.push(`- **Data Protection**: ${spec.security.dataProtection.join(', ')}`);
    }
    if (spec.security.compliance) {
      sections.push(`- **Compliance**: ${spec.security.compliance.join(', ')}`);
    }

    if (spec.security.vulnerabilities && spec.security.vulnerabilities.length > 0) {
      sections.push(`\n### Threat Model\n`);
      spec.security.vulnerabilities.forEach(vuln => {
        sections.push(`- **${vuln.threat}**: ${vuln.mitigation}`);
      });
    }
    sections.push('');
  }

  // Testing & QA
  sections.push(`## Testing & QA\n`);
  sections.push(`**Strategy**: ${spec.testing.strategy}\n`);

  sections.push(`### Test Types\n`);
  spec.testing.testTypes.forEach(testType => {
    const coverage = testType.coverage ? ` (Coverage: ${testType.coverage})` : '';
    const tools = testType.tools ? ` - Tools: ${testType.tools.join(', ')}` : '';
    sections.push(`- **${testType.type}**${coverage}${tools}`);
  });

  sections.push(`\n### Acceptance Criteria\n`);
  spec.testing.acceptanceCriteria.forEach(criteria => {
    sections.push(`- ${criteria}`);
  });

  // Risks & Mitigation
  sections.push(`\n## Risks & Mitigation\n`);
  sections.push(`| Risk | Impact | Probability | Mitigation |`);
  sections.push(`|------|--------|-------------|------------|`);
  spec.risks.risks.forEach(risk => {
    sections.push(`| ${risk.risk} | ${risk.impact} | ${risk.probability} | ${risk.mitigation} |`);
  });

  // Milestones
  sections.push(`\n## Milestones\n`);
  spec.milestones.phases.forEach((phase, index) => {
    sections.push(`### Phase ${index + 1}: ${phase.name}\n`);
    sections.push(`**Deliverables**:`);
    phase.deliverables.forEach(deliverable => {
      sections.push(`- ${deliverable}`);
    });
    if (phase.dependencies && phase.dependencies.length > 0) {
      sections.push(`\n**Dependencies**: ${phase.dependencies.join(', ')}`);
    }
    sections.push('');
  });

  // Metadata
  sections.push(`---\n`);
  sections.push(`*Generated by Tech Translation Tool*`);
  sections.push(`- **Date**: ${spec.metadata.generatedAt}`);
  sections.push(`- **Depth**: ${spec.metadata.depth}`);
  sections.push(`- **Style**: ${spec.metadata.style}`);
  if (spec.metadata.domain) {
    sections.push(`- **Domain**: ${spec.metadata.domain}`);
  }

  return sections.join('\n');
}

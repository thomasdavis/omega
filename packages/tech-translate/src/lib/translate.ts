import type { TranslateOptions, TechTranslationSpec, LLMProvider } from '../types/index.js';
import { StubProvider } from './providers/index.js';

let defaultProvider: LLMProvider = new StubProvider();

export function setProvider(provider: LLMProvider): void {
  defaultProvider = provider;
}

export function getProvider(): LLMProvider {
  return defaultProvider;
}

export async function translateTech(
  request: string,
  options?: TranslateOptions
): Promise<string | TechTranslationSpec> {
  const format = options?.format || 'markdown';
  const spec = await defaultProvider.translate(request, options);

  if (format === 'json') {
    return spec;
  }

  return formatAsMarkdown(spec);
}

function formatAsMarkdown(spec: TechTranslationSpec): string {
  const lines: string[] = [];

  lines.push('# Tech Translation Specification\n');

  lines.push('## Summary\n');
  lines.push(`${spec.summary}\n`);

  if (spec.assumptions.length > 0) {
    lines.push('## Assumptions\n');
    spec.assumptions.forEach(a => lines.push(`- ${a}`));
    lines.push('');
  }

  if (spec.risks.length > 0) {
    lines.push('## Risks\n');
    spec.risks.forEach(r => lines.push(`- ${r}`));
    lines.push('');
  }

  if (spec.non_goals.length > 0) {
    lines.push('## Non-Goals\n');
    spec.non_goals.forEach(ng => lines.push(`- ${ng}`));
    lines.push('');
  }

  if (spec.api_design) {
    lines.push('## API Design\n');
    if (spec.api_design.endpoints && spec.api_design.endpoints.length > 0) {
      lines.push('### Endpoints\n');
      spec.api_design.endpoints.forEach(ep => {
        lines.push(`- **${ep.method}** \`${ep.path}\`: ${ep.description}`);
      });
      lines.push('');
    }
    if (spec.api_design.interfaces && spec.api_design.interfaces.length > 0) {
      lines.push('### Interfaces\n');
      spec.api_design.interfaces.forEach(iface => {
        lines.push(`- **${iface.name}**: ${iface.description}`);
      });
      lines.push('');
    }
  }

  if (spec.data_model?.entities && spec.data_model.entities.length > 0) {
    lines.push('## Data Model\n');
    spec.data_model.entities.forEach(entity => {
      lines.push(`### ${entity.name}\n`);
      entity.fields.forEach(field => {
        const required = field.required ? ' (required)' : '';
        lines.push(`- \`${field.name}\`: ${field.type}${required}`);
      });
      lines.push('');
    });
  }

  if (spec.infra) {
    lines.push('## Infrastructure\n');
    if (spec.infra.services && spec.infra.services.length > 0) {
      lines.push('### Services\n');
      spec.infra.services.forEach(s => lines.push(`- ${s}`));
      lines.push('');
    }
    if (spec.infra.dependencies && spec.infra.dependencies.length > 0) {
      lines.push('### Dependencies\n');
      spec.infra.dependencies.forEach(d => lines.push(`- ${d}`));
      lines.push('');
    }
  }

  if (spec.security) {
    lines.push('## Security\n');
    if (spec.security.authentication) {
      lines.push(`**Authentication:** ${spec.security.authentication}\n`);
    }
    if (spec.security.authorization) {
      lines.push(`**Authorization:** ${spec.security.authorization}\n`);
    }
    if (spec.security.considerations && spec.security.considerations.length > 0) {
      lines.push('### Considerations\n');
      spec.security.considerations.forEach(c => lines.push(`- ${c}`));
      lines.push('');
    }
  }

  if (spec.testing) {
    lines.push('## Testing\n');
    if (spec.testing.unit_tests && spec.testing.unit_tests.length > 0) {
      lines.push('### Unit Tests\n');
      spec.testing.unit_tests.forEach(t => lines.push(`- ${t}`));
      lines.push('');
    }
    if (spec.testing.integration_tests && spec.testing.integration_tests.length > 0) {
      lines.push('### Integration Tests\n');
      spec.testing.integration_tests.forEach(t => lines.push(`- ${t}`));
      lines.push('');
    }
    if (spec.testing.e2e_tests && spec.testing.e2e_tests.length > 0) {
      lines.push('### E2E Tests\n');
      spec.testing.e2e_tests.forEach(t => lines.push(`- ${t}`));
      lines.push('');
    }
  }

  if (spec.acceptance_criteria.length > 0) {
    lines.push('## Acceptance Criteria\n');
    spec.acceptance_criteria.forEach(ac => lines.push(`- ${ac}`));
    lines.push('');
  }

  if (spec.tasks.length > 0) {
    lines.push('## Tasks\n');
    spec.tasks.forEach((task, idx) => {
      const estimate = task.estimate ? ` (${task.estimate})` : '';
      lines.push(`${idx + 1}. **${task.title}**${estimate}`);
      lines.push(`   ${task.description}`);
    });
    lines.push('');
  }

  return lines.join('\n');
}

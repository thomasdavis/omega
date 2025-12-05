import { z } from 'zod';

export const TechTranslationSpecSchema = z.object({
  summary: z.string().describe('Brief overview of what needs to be built'),
  assumptions: z.array(z.string()).describe('Assumptions made about requirements or context'),
  risks: z.array(z.string()).describe('Potential risks and challenges'),
  non_goals: z.array(z.string()).describe('What is explicitly out of scope'),
  api_design: z.object({
    endpoints: z.array(z.object({
      method: z.string(),
      path: z.string(),
      description: z.string(),
    })).optional(),
    interfaces: z.array(z.object({
      name: z.string(),
      description: z.string(),
    })).optional(),
  }).optional().describe('API design and interfaces'),
  data_model: z.object({
    entities: z.array(z.object({
      name: z.string(),
      fields: z.array(z.object({
        name: z.string(),
        type: z.string(),
        required: z.boolean().optional(),
      })),
    })).optional(),
  }).optional().describe('Data model and schema'),
  infra: z.object({
    services: z.array(z.string()).optional(),
    dependencies: z.array(z.string()).optional(),
  }).optional().describe('Infrastructure requirements'),
  security: z.object({
    authentication: z.string().optional(),
    authorization: z.string().optional(),
    considerations: z.array(z.string()).optional(),
  }).optional().describe('Security considerations'),
  testing: z.object({
    unit_tests: z.array(z.string()).optional(),
    integration_tests: z.array(z.string()).optional(),
    e2e_tests: z.array(z.string()).optional(),
  }).optional().describe('Testing strategy'),
  acceptance_criteria: z.array(z.string()).describe('Acceptance criteria for completion'),
  tasks: z.array(z.object({
    title: z.string(),
    description: z.string(),
    estimate: z.string().optional(),
  })).describe('Breakdown of implementation tasks'),
});

export type TechTranslationSpec = z.infer<typeof TechTranslationSpecSchema>;

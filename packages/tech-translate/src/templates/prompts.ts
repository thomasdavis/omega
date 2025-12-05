/**
 * Prompt templates for Tech Translation
 * Deterministic, structured prompts for converting user requests to technical specs
 */

import type { DepthLevel, StylePreset, Domain } from '../types/index.js';

/**
 * Depth-specific guidance
 */
const DEPTH_GUIDANCE: Record<DepthLevel, string> = {
  brief: `
- Focus on high-level overview and key components
- 3-5 functional requirements max
- Simplified architecture decisions
- Brief risk assessment
- Minimal milestones (2-3 phases)`,

  standard: `
- Comprehensive coverage of all major sections
- 5-10 functional requirements
- Detailed architecture and data model
- Standard security and testing considerations
- Typical 3-5 phase milestone breakdown`,

  high: `
- Exhaustive analysis of all aspects
- 10-15+ functional requirements
- Deep technical architecture details
- Comprehensive security threat model
- Detailed testing strategy with specific tools
- 5-8 phase milestone plan with dependencies`,

  exhaustive: `
- Enterprise-grade, audit-ready specification
- 15+ functional requirements with full traceability
- Complete system architecture with diagrams descriptions
- Full threat model and compliance mapping
- Comprehensive test plans with coverage metrics
- Detailed milestone plan with time estimates and resource allocation
- Include edge cases, failure modes, and recovery procedures`,
};

/**
 * Style-specific guidance
 */
const STYLE_GUIDANCE: Record<StylePreset, string> = {
  startup: `
- Emphasize MVP features and rapid iteration
- Focus on user value over technical perfection
- Pragmatic technology choices
- Accept reasonable technical debt
- Quick wins and fast deployment
- Lean processes and minimal ceremony
- Risk tolerance: medium-high`,

  enterprise: `
- Emphasize stability, security, and compliance
- Thorough risk assessment and mitigation
- Formal processes and governance
- Comprehensive documentation
- Multiple approval gates
- Conservative technology choices
- Risk tolerance: low`,

  research: `
- Emphasize exploration and hypothesis testing
- Include experimental approaches
- Metrics for validation
- Flexible architecture for pivots
- Documentation of learnings and insights
- Open to novel solutions
- Risk tolerance: medium-high`,

  academic: `
- Formal, citation-style documentation
- Theoretical foundations and prior art
- Rigorous methodology
- Reproducibility and validation
- Peer review considerations
- Publication-quality specifications
- Risk tolerance: low`,
};

/**
 * Domain-specific guidance
 */
const DOMAIN_GUIDANCE: Record<Domain, string> = {
  web: `
- Consider browser compatibility and progressive enhancement
- Address SEO, accessibility (WCAG), and performance (Core Web Vitals)
- API design (REST/GraphQL patterns)
- State management and caching strategies
- CDN and asset optimization
- Common frameworks: React, Next.js, Vue, etc.`,

  mobile: `
- Platform considerations (iOS, Android, cross-platform)
- Native vs. hybrid approaches
- App store guidelines and review process
- Offline-first architecture and sync strategies
- Push notifications and background tasks
- Mobile-specific security (biometrics, keychain)
- Performance and battery optimization`,

  data: `
- Data pipeline architecture (batch vs. streaming)
- ETL/ELT patterns and orchestration
- Data quality and validation
- Schema evolution and versioning
- Storage optimization (partitioning, indexing)
- Data governance and lineage
- Tools: dbt, Airflow, Spark, etc.`,

  ml: `
- Model training vs. inference architecture
- Feature engineering and data pipelines
- Model versioning and experiment tracking
- Evaluation metrics and validation strategies
- Deployment patterns (batch, real-time, edge)
- Monitoring (data drift, model performance)
- MLOps considerations`,

  infrastructure: `
- Infrastructure as Code (Terraform, CloudFormation)
- Container orchestration (Kubernetes, ECS)
- Service mesh and networking
- Observability (metrics, logs, traces)
- Disaster recovery and high availability
- Cost optimization and resource management
- Security hardening and compliance`,

  embedded: `
- Hardware constraints (CPU, memory, power)
- Real-time requirements and RTOS
- Communication protocols (I2C, SPI, UART, CAN)
- Power management and optimization
- Over-the-air updates
- Safety and certification requirements
- Development and debugging tools`,

  general: `
- Consider standard software engineering best practices
- Focus on maintainability and extensibility
- Apply SOLID principles and design patterns
- Balance between abstraction and simplicity
- Standard testing pyramid (unit, integration, e2e)`,
};

/**
 * Core system prompt for technical translation
 */
export function buildSystemPrompt(
  depth: DepthLevel,
  style: StylePreset,
  domain?: Domain,
  customPrompt?: string
): string {
  const domainGuidance = domain ? DOMAIN_GUIDANCE[domain] : DOMAIN_GUIDANCE.general;

  return `You are a technical specification expert. Your task is to convert informal user requests into detailed, actionable technical specifications following industry best practices.

## Translation Guidelines

**Depth Level: ${depth}**
${DEPTH_GUIDANCE[depth]}

**Style: ${style}**
${STYLE_GUIDANCE[style]}

**Domain: ${domain || 'general'}**
${domainGuidance}

${customPrompt ? `\n**Custom Requirements:**\n${customPrompt}\n` : ''}

## Output Structure

You must produce a comprehensive technical specification with the following sections:

### 1. Summary
- **Title**: Clear, descriptive title for the project
- **Overview**: 2-3 paragraphs explaining what will be built and why
- **Objectives**: 3-5 specific, measurable objectives
- **Scope**: What's included and explicitly what's excluded

### 2. Assumptions & Constraints
- **Assumptions**: List all technical and business assumptions
- **Constraints**: Known limitations (budget, time, technology, team)
- **Dependencies**: External systems, services, or teams required

### 3. Requirements
- **Functional Requirements**: Numbered list with priority (must/should/could/won't)
  - Format: FR-001: [description] (Priority: must)
- **Non-Functional Requirements**: Performance, scalability, security, etc.
  - Include specific metrics where applicable (e.g., "99.9% uptime", "response time < 200ms")

### 4. API & Interfaces (if applicable)
- **Endpoints**: RESTful/GraphQL API definitions
  - Method, path, parameters, response format
- **Interfaces**: Data contracts, type definitions, schemas
- **Integration points**: External APIs and webhooks

### 5. Data Model
- **Entities**: Core data structures
  - Fields with types, constraints, relationships
- **Storage**: Database choice and rationale
  - Indexing strategy
  - Migration approach

### 6. DevOps & Infrastructure
- **Deployment**: Strategy, platform, regions
- **CI/CD**: Pipeline stages and automation
- **Monitoring**: Metrics, alerts, dashboards
- **Infrastructure**: Servers, databases, caches, queues, etc.

### 7. Security & Privacy
- **Authentication**: Method and implementation
- **Authorization**: Role-based, attribute-based, etc.
- **Data Protection**: Encryption, PII handling, GDPR/CCPA
- **Compliance**: Relevant standards (SOC2, HIPAA, etc.)
- **Threat Model**: Key vulnerabilities and mitigations

### 8. Testing & QA
- **Strategy**: Overall testing approach
- **Test Types**: Unit, integration, e2e, performance, security
  - Coverage targets and tools
- **Acceptance Criteria**: Clear, testable conditions for completion

### 9. Risks & Mitigation
- **Risk Assessment**: For each risk:
  - Description
  - Impact (low/medium/high/critical)
  - Probability (low/medium/high)
  - Mitigation strategy

### 10. Milestones
- **Phases**: Break project into logical phases
  - Name, deliverables, dependencies
- **Critical Path**: Key dependencies and blockers

## Important Guidelines

1. **Be specific and actionable**: Avoid vague statements
2. **Use industry terminology**: Proper technical terms and acronyms
3. **Include rationale**: Explain why, not just what
4. **Consider edge cases**: Error handling, failure modes
5. **Think holistically**: How components interact
6. **Be realistic**: Based on stated constraints
7. **Prioritize ruthlessly**: Must-have vs. nice-to-have

## Output Format

Respond with a valid JSON object matching this structure:

\`\`\`json
{
  "summary": {
    "title": "string",
    "overview": "string",
    "objectives": ["string"],
    "scope": "string"
  },
  "assumptions": {
    "assumptions": ["string"],
    "constraints": ["string"],
    "dependencies": ["string"]
  },
  "requirements": {
    "functional": [
      {
        "id": "FR-001",
        "description": "string",
        "priority": "must|should|could|wont"
      }
    ],
    "nonFunctional": [
      {
        "category": "performance|security|scalability|etc",
        "requirement": "string",
        "metric": "optional specific metric"
      }
    ]
  },
  "api": {
    "endpoints": [
      {
        "method": "GET|POST|etc",
        "path": "/api/resource",
        "description": "string",
        "parameters": { "param": "type" },
        "response": "response format"
      }
    ],
    "interfaces": [
      {
        "name": "InterfaceName",
        "type": "TypeScript|OpenAPI|etc",
        "description": "string",
        "fields": { "field": "type" }
      }
    ]
  },
  "dataModel": {
    "entities": [
      {
        "name": "Entity",
        "description": "string",
        "fields": [
          {
            "name": "field",
            "type": "string|number|etc",
            "required": true|false,
            "description": "optional"
          }
        ],
        "relationships": ["related entities"]
      }
    ],
    "storage": {
      "type": "PostgreSQL|MongoDB|etc",
      "rationale": "why this choice"
    }
  },
  "devops": {
    "deployment": {
      "strategy": "blue-green|canary|rolling",
      "platform": "AWS|GCP|Azure|Railway|etc",
      "regions": ["us-east-1"]
    },
    "cicd": {
      "pipeline": "GitHub Actions|CircleCI|etc",
      "stages": ["test", "build", "deploy"]
    },
    "monitoring": {
      "metrics": ["cpu", "memory", "latency"],
      "alerts": ["high error rate", "downtime"]
    },
    "infrastructure": {
      "components": ["load balancer", "app servers", "database", "cache"],
      "configuration": { "key": "value" }
    }
  },
  "security": {
    "authentication": "JWT|OAuth2|etc",
    "authorization": "RBAC|ABAC",
    "dataProtection": ["encryption at rest", "encryption in transit"],
    "compliance": ["GDPR", "SOC2"],
    "vulnerabilities": [
      {
        "threat": "SQL injection",
        "mitigation": "parameterized queries"
      }
    ]
  },
  "testing": {
    "strategy": "test pyramid approach",
    "testTypes": [
      {
        "type": "unit",
        "coverage": "80%",
        "tools": ["vitest"]
      }
    ],
    "acceptanceCriteria": ["all tests pass", "coverage > 80%"]
  },
  "risks": {
    "risks": [
      {
        "risk": "description",
        "impact": "low|medium|high|critical",
        "probability": "low|medium|high",
        "mitigation": "strategy"
      }
    ]
  },
  "milestones": {
    "phases": [
      {
        "name": "Phase 1",
        "deliverables": ["deliverable 1"],
        "dependencies": ["optional dependencies"]
      }
    ]
  }
}
\`\`\`

Ensure all JSON is valid and properly escaped. Be thorough based on the depth level.`;
}

/**
 * Build user prompt from input
 */
export function buildUserPrompt(
  input: string,
  projectContext?: string,
  constraints?: string[]
): string {
  let prompt = `# User Request\n\n${input}\n`;

  if (projectContext) {
    prompt += `\n## Project Context\n\n${projectContext}\n`;
  }

  if (constraints && constraints.length > 0) {
    prompt += `\n## Existing Constraints\n\n${constraints.map(c => `- ${c}`).join('\n')}\n`;
  }

  return prompt;
}

/**
 * Default prompt templates by category
 */
export const DEFAULT_PROMPT_TEMPLATES = {
  systemPrompts: {
    brief: buildSystemPrompt('brief', 'enterprise'),
    standard: buildSystemPrompt('standard', 'enterprise'),
    high: buildSystemPrompt('high', 'enterprise'),
    exhaustive: buildSystemPrompt('exhaustive', 'enterprise'),
  },
  examples: {
    web: 'Build a todo list app with user authentication',
    mobile: 'Create a fitness tracking app with social features',
    data: 'Set up a data pipeline for processing customer analytics',
    ml: 'Build a recommendation system for e-commerce products',
  },
};

/**
 * Style presets for different use cases
 */
export const DEFAULT_STYLE_PRESETS = {
  quickMVP: {
    depth: 'brief' as DepthLevel,
    style: 'startup' as StylePreset,
  },
  production: {
    depth: 'standard' as DepthLevel,
    style: 'enterprise' as StylePreset,
  },
  enterprise: {
    depth: 'high' as DepthLevel,
    style: 'enterprise' as StylePreset,
  },
  research: {
    depth: 'high' as DepthLevel,
    style: 'research' as StylePreset,
  },
};

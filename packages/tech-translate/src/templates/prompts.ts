/**
 * Prompt Templates for Tech Translation
 *
 * These templates guide the LLM to generate comprehensive technical specifications
 * from informal user requests, following best practices across Engineering, DevOps, and Databases.
 */

import type { StylePreset, DepthLevel, Domain, TemplateContext } from '../types/index.js';

/**
 * Style-specific guidance for specification generation
 */
const STYLE_GUIDANCE: Record<StylePreset, string> = {
  enterprise: `Enterprise style:
- Formal, professional language
- Comprehensive documentation with all sections
- Focus on governance, compliance, and risk management
- Detailed deployment and operational procedures
- Emphasis on scalability, security, and maintainability
- Include org structure and approval workflows
- Reference industry standards and best practices`,

  startup: `Startup style:
- Pragmatic, action-oriented language
- Focus on MVP and iteration
- Emphasize speed to market and flexibility
- Lean infrastructure and cost-consciousness
- Highlight what can be deferred or simplified
- Include clear success metrics and KPIs
- Balance technical debt with delivery speed`,

  technical: `Technical style:
- Precise, engineering-focused language
- Deep technical detail and implementation specifics
- Architecture diagrams and data flow descriptions
- Performance benchmarks and optimization strategies
- Technology stack decisions with justifications
- Code-level considerations and patterns
- Minimal business context, maximum technical depth`,

  concise: `Concise style:
- Brief, to-the-point descriptions
- Bullet points over paragraphs
- Essential information only
- Skip obvious details
- Focus on key decisions and requirements
- Minimal elaboration
- Quick reference format`,

  detailed: `Detailed style:
- Comprehensive coverage of all aspects
- In-depth explanations and rationale
- Multiple examples and edge cases
- Extensive cross-references
- Thorough risk analysis
- Detailed implementation notes
- Complete API and data model specifications`,
};

/**
 * Depth-specific guidance for specification detail level
 */
const DEPTH_GUIDANCE: Record<DepthLevel, string> = {
  low: `Low depth (overview level):
- High-level architecture and components
- Major features and capabilities
- Key technologies and frameworks
- Basic data model entities
- Primary API endpoints
- Essential security considerations
- Overall deployment approach`,

  medium: `Medium depth (standard detail):
- Detailed component architecture
- Comprehensive feature specifications
- Technology choices with brief justifications
- Complete data model with relationships
- All API endpoints with schemas
- Security measures and authentication flow
- CI/CD pipeline and deployment steps
- Testing strategy and key test cases`,

  high: `High depth (implementation-ready):
- Fine-grained component breakdown
- Complete feature specs with edge cases
- Detailed technology evaluations and trade-offs
- Full data model with indexes and constraints
- Complete API documentation with examples
- Comprehensive security analysis and threat modeling
- Detailed DevOps runbooks and procedures
- Complete testing strategy with coverage targets
- Performance requirements and benchmarks
- Monitoring and alerting specifications`,
};

/**
 * Domain-specific guidance for technical specifications
 */
const DOMAIN_GUIDANCE: Record<Domain, string> = {
  web: `Web Application Domain:
- Frontend architecture (SPA, SSR, hybrid)
- UI/UX considerations and responsive design
- Browser compatibility and performance
- State management and routing
- Asset optimization and CDN usage
- SEO and accessibility requirements
- Progressive enhancement strategies`,

  data: `Data Engineering Domain:
- Data pipeline architecture
- ETL/ELT processes and transformations
- Data warehouse/lake design
- Batch vs streaming processing
- Data quality and validation
- Schema evolution and versioning
- Data governance and lineage`,

  ml: `Machine Learning Domain:
- Model architecture and algorithms
- Training data requirements and preprocessing
- Feature engineering approach
- Model serving and inference
- Model monitoring and retraining
- A/B testing and experimentation
- MLOps and model versioning`,

  mobile: `Mobile Application Domain:
- Platform-specific considerations (iOS/Android)
- Native vs cross-platform approach
- Offline functionality and sync
- Push notifications and deep linking
- App store requirements and distribution
- Mobile-specific performance optimization
- Device compatibility and testing`,

  devops: `DevOps/Infrastructure Domain:
- Infrastructure as Code (IaC) tools
- Container orchestration and management
- CI/CD pipeline architecture
- Environment management (dev/staging/prod)
- Deployment strategies (blue/green, canary)
- Monitoring, logging, and alerting
- Disaster recovery and backup strategies`,

  api: `API Development Domain:
- RESTful vs GraphQL vs gRPC design
- API versioning strategy
- Authentication and authorization
- Rate limiting and throttling
- Request/response validation
- API documentation (OpenAPI/Swagger)
- Backward compatibility considerations`,

  database: `Database Design Domain:
- Database type selection (SQL vs NoSQL)
- Schema design and normalization
- Indexing strategy and query optimization
- Data partitioning and sharding
- Replication and high availability
- Backup and disaster recovery
- Migration strategies and versioning`,
};

/**
 * Standard specification sections structure
 */
const SPEC_SECTIONS = `
Your technical specification MUST include the following sections:

## 1. Summary
- Brief executive overview (2-3 paragraphs)
- Problem statement and solution approach
- Key technologies and architectural decisions
- Expected outcomes and success criteria

## 2. Assumptions
- Technical assumptions about the environment
- Dependencies on existing systems or services
- Assumptions about user behavior or data
- Constraints that inform the design

## 3. Requirements
### Functional Requirements
- What the system must do
- User-facing features and capabilities
- Business logic and workflows

### Non-Functional Requirements
- Performance, scalability, reliability targets
- Security and compliance requirements
- Usability and accessibility standards

### Constraints
- Budget, timeline, or resource limitations
- Technology or platform restrictions
- Regulatory or policy constraints

## 4. API / Interfaces
- REST/GraphQL/gRPC endpoints
- Request and response schemas
- Authentication and authorization
- Error handling and status codes
- Rate limiting and versioning
- Integration points with other systems

## 5. Data Model
- Core entities and their relationships
- Database schemas (tables, collections)
- Field types, constraints, and indexes
- Data validation rules
- Data lifecycle and retention policies

## 6. DevOps / Infrastructure
- Deployment architecture and environments
- Infrastructure requirements (compute, storage, network)
- CI/CD pipeline and automation
- Monitoring, logging, and alerting
- Scaling strategy and auto-scaling rules
- Disaster recovery and backup procedures

## 7. Security & Privacy
- Authentication and authorization mechanisms
- Data encryption (at rest and in transit)
- Security best practices and hardening
- Privacy considerations (PII handling, GDPR)
- Threat modeling and mitigation strategies
- Security testing and vulnerability management

## 8. Testing & QA
- Testing strategy (unit, integration, e2e)
- Test coverage targets and key test scenarios
- Performance and load testing approach
- Quality gates and acceptance criteria
- Test automation and CI integration
- Bug tracking and resolution process

## 9. Risks & Mitigation
- Technical risks and challenges
- Severity assessment (low/medium/high/critical)
- Mitigation strategies and contingency plans
- Dependencies and external risk factors

## 10. Milestones & Implementation Plan
- Project phases and deliverables
- Key milestones and checkpoints
- Estimated timelines and resource allocation
- Success criteria for each phase
- Go-live criteria and rollout plan
`;

/**
 * Build the system prompt for tech translation
 */
export function buildSystemPrompt(context: TemplateContext): string {
  const styleGuide = STYLE_GUIDANCE[context.style];
  const depthGuide = DEPTH_GUIDANCE[context.depth];
  const domainGuide = context.domain ? DOMAIN_GUIDANCE[context.domain] : '';

  const assumptionsNote = context.includeAssumptions
    ? '\n- Include a comprehensive Assumptions section'
    : '\n- Assumptions section is optional';

  const risksNote = context.includeRisks
    ? '\n- Include detailed Risk Analysis with severity and mitigation'
    : '\n- Risk analysis is optional';

  const milestonesNote = context.includeMilestones
    ? '\n- Include Implementation Milestones with timelines'
    : '\n- Milestones section is optional';

  return `You are an expert technical architect and specification writer. Your task is to transform informal user requests into comprehensive, actionable technical specifications that follow industry best practices across Engineering, DevOps, and Database design.

${styleGuide}

${depthGuide}

${domainGuide ? `Domain-Specific Guidance:\n${domainGuide}\n` : ''}

${SPEC_SECTIONS}

Additional Guidelines:
${assumptionsNote}
${risksNote}
${milestonesNote}
- Use clear, precise technical language
- Provide concrete examples where helpful
- Include relevant technology recommendations
- Consider scalability, security, and maintainability
- Address edge cases and error scenarios
- Follow PAM (Portable Agent Manifest) compliance where applicable
- Ensure specifications are implementation-ready for development teams

Output Format: ${context.format === 'json' ? 'Structured JSON' : context.format === 'md' ? 'Markdown document' : 'Both Markdown and JSON'}`;
}

/**
 * Build the user prompt with the actual request
 */
export function buildUserPrompt(context: TemplateContext): string {
  let prompt = `Convert the following user request into a detailed technical specification:\n\n`;
  prompt += `User Request: ${context.userRequest}\n`;

  if (context.context) {
    prompt += `\nAdditional Context:\n${context.context}\n`;
  }

  if (context.format === 'json') {
    prompt += `\nProvide your response as a valid JSON object following the TechSpec schema.`;
  } else if (context.format === 'md') {
    prompt += `\nProvide your response as a well-formatted Markdown document with clear section headers.`;
  } else {
    prompt += `\nProvide your response in both formats: first the Markdown document, then the JSON object.`;
  }

  return prompt;
}

/**
 * Default prompt templates (for programmatic use)
 */
export const DEFAULT_PROMPT_TEMPLATES = {
  buildSystemPrompt,
  buildUserPrompt,
};

/**
 * Default style presets (for CLI/API exports)
 */
export const DEFAULT_STYLE_PRESETS: Record<StylePreset, string> = STYLE_GUIDANCE;

/**
 * Default depth levels (for CLI/API exports)
 */
export const DEFAULT_DEPTH_LEVELS: Record<DepthLevel, string> = DEPTH_GUIDANCE;

/**
 * Default domain guidance (for CLI/API exports)
 */
export const DEFAULT_DOMAIN_GUIDANCE: Record<Domain, string> = DOMAIN_GUIDANCE;

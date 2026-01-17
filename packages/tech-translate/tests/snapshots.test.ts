import { describe, it, expect } from 'vitest';
import { translateTech } from '../src/translator.js';

describe('Markdown snapshot tests', () => {
  it('should match snapshot for basic translation', async () => {
    const result = await translateTech('Add user authentication system');

    // Remove timestamp for stable snapshots
    const normalized = (result as string).replace(
      /Generated: .+$/m,
      'Generated: [TIMESTAMP]'
    ).replace(
      /\*Timestamp: .+\*$/m,
      '*Timestamp: [TIMESTAMP]*'
    );

    expect(normalized).toMatchSnapshot();
  });

  it('should match snapshot for MVP level', async () => {
    const result = await translateTech('Add user authentication system', {
      level: 'mvp',
    });

    const normalized = (result as string).replace(
      /Generated: .+$/m,
      'Generated: [TIMESTAMP]'
    ).replace(
      /\*Timestamp: .+\*$/m,
      '*Timestamp: [TIMESTAMP]*'
    );

    expect(normalized).toMatchSnapshot();
  });

  it('should match snapshot with all concerns', async () => {
    const result = await translateTech('Build REST API server', {
      level: 'prod',
      include: ['db', 'devops', 'security', 'testing'],
    });

    const normalized = (result as string).replace(
      /Generated: .+$/m,
      'Generated: [TIMESTAMP]'
    ).replace(
      /\*Timestamp: .+\*$/m,
      '*Timestamp: [TIMESTAMP]*'
    );

    expect(normalized).toMatchSnapshot();
  });
});

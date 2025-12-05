import { describe, it, expect } from 'vitest';
import { translateTech } from '../src/index.js';

describe('translateTech snapshots', () => {
  it('should match markdown snapshot for basic request', async () => {
    const result = await translateTech('add live status page', { format: 'markdown' });
    expect(result).toMatchSnapshot();
  });

  it('should match markdown snapshot for mvp level', async () => {
    const result = await translateTech('add user authentication', {
      format: 'markdown',
      level: 'mvp',
    });
    expect(result).toMatchSnapshot();
  });

  it('should match markdown snapshot for prod level', async () => {
    const result = await translateTech('add user authentication', {
      format: 'markdown',
      level: 'prod',
    });
    expect(result).toMatchSnapshot();
  });

  it('should match json snapshot for basic request', async () => {
    const result = await translateTech('add live status page', { format: 'json' });
    expect(result).toMatchSnapshot();
  });

  it('should match snapshot with selective sections', async () => {
    const result = await translateTech('add dashboard', {
      format: 'markdown',
      include: { db: true, devops: false, security: true, testing: false },
    });
    expect(result).toMatchSnapshot();
  });
});

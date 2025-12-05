import { NextResponse } from 'next/server';
import { getPostgresPool } from '@repo/database';
import { readdirSync, statSync, existsSync } from 'fs';
import { join } from 'path';

export const dynamic = 'force-dynamic';

const startTime = Date.now();

interface ServiceStatus {
  status: 'ok' | 'degraded' | 'error';
  message?: string;
  latency?: number;
  details?: Record<string, unknown>;
}

interface StatusResponse {
  status: 'ok' | 'degraded' | 'error';
  timestamp: string;
  uptime: number;
  version: {
    commit?: string;
    pr?: string;
    environment: string;
  };
  services: {
    database: ServiceStatus;
    web: ServiceStatus;
  };
  errors: {
    recent: boolean;
    lastError?: {
      message: string;
      timestamp: string;
    };
  };
  errorComics: Array<{
    url: string;
    filename: string;
    createdAt: string;
  }>;
}

async function checkDatabaseStatus(): Promise<ServiceStatus> {
  const start = Date.now();
  try {
    const pool = await getPostgresPool();
    const result = await pool.query('SELECT NOW() as server_time, version() as pg_version');
    const latency = Date.now() - start;

    return {
      status: 'ok',
      latency,
      details: {
        serverTime: result.rows[0].server_time,
        version: result.rows[0].pg_version.split(' ')[0] + ' ' + result.rows[0].pg_version.split(' ')[1],
      },
    };
  } catch (error) {
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Database connection failed',
      latency: Date.now() - start,
    };
  }
}

function getRecentErrorComics(limit = 5): Array<{ url: string; filename: string; createdAt: string }> {
  try {
    const comicsDir = join(process.cwd(), 'public/comics');

    if (!existsSync(comicsDir)) {
      return [];
    }

    const files = readdirSync(comicsDir);

    const errorComics = files
      .filter((file) => {
        const filePath = join(comicsDir, file);
        return (
          statSync(filePath).isFile() &&
          file.endsWith('.png') &&
          (file.includes('error') || file.includes('fail'))
        );
      })
      .map((file) => {
        const filePath = join(comicsDir, file);
        const stats = statSync(filePath);

        return {
          filename: file,
          url: `/comics/${file}`,
          createdAt: stats.birthtime.toISOString(),
          mtime: stats.mtime.getTime(),
        };
      })
      .sort((a, b) => b.mtime - a.mtime)
      .slice(0, limit)
      .map(({ filename, url, createdAt }) => ({ filename, url, createdAt }));

    return errorComics;
  } catch (error) {
    console.error('Error reading error comics:', error);
    return [];
  }
}

function checkForRecentErrors(): { recent: boolean; lastError?: { message: string; timestamp: string } } {
  const errorComics = getRecentErrorComics(1);

  if (errorComics.length > 0) {
    const lastComic = errorComics[0];
    const comicAge = Date.now() - new Date(lastComic.createdAt).getTime();
    const fifteenMinutes = 15 * 60 * 1000;

    if (comicAge < fifteenMinutes) {
      return {
        recent: true,
        lastError: {
          message: 'Recent error detected',
          timestamp: lastComic.createdAt,
        },
      };
    }
  }

  return { recent: false };
}

export async function GET() {
  try {
    const [dbStatus] = await Promise.all([
      checkDatabaseStatus(),
    ]);

    const errors = checkForRecentErrors();
    const errorComics = errors.recent ? getRecentErrorComics(3) : [];

    const overallStatus: 'ok' | 'degraded' | 'error' =
      dbStatus.status === 'error' ? 'error' :
      dbStatus.status === 'degraded' ? 'degraded' : 'ok';

    const uptime = Date.now() - startTime;

    const response: StatusResponse = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime,
      version: {
        commit: process.env.RAILWAY_GIT_COMMIT_SHA?.substring(0, 7),
        pr: process.env.RAILWAY_GIT_COMMIT_MESSAGE?.match(/\(#(\d+)\)/)?.[1],
        environment: process.env.NODE_ENV || 'development',
      },
      services: {
        database: dbStatus,
        web: {
          status: 'ok',
          message: 'Web service operational',
        },
      },
      errors,
      errorComics,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Status check failed:', error);

    return NextResponse.json(
      {
        status: 'error',
        timestamp: new Date().toISOString(),
        uptime: Date.now() - startTime,
        services: {
          database: { status: 'error', message: 'Status check failed' },
          web: { status: 'error', message: error instanceof Error ? error.message : 'Unknown error' },
        },
        errors: { recent: true },
        errorComics: [],
      } as StatusResponse,
      { status: 503 }
    );
  }
}

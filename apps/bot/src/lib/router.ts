/**
 * URL Router - Named routes for SEO-friendly URLs
 * Manages page routes and persistent storage
 */

import { writeFileSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { getArtifactsDir } from '../utils/storage.js';

const ROUTES_FILE = join(getArtifactsDir(), 'routes.json');

export interface Route {
  slug: string;
  title: string;
  content: string;
  contentType: 'html' | 'markdown';
  theme?: string;
  createdAt: string;
  updatedAt: string;
}

interface RouteStorage {
  routes: Record<string, Route>;
}

/**
 * Load routes from persistent storage
 */
function loadRoutes(): RouteStorage {
  if (!existsSync(ROUTES_FILE)) {
    return { routes: {} };
  }

  try {
    const data = readFileSync(ROUTES_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error loading routes:', error);
    return { routes: {} };
  }
}

/**
 * Save routes to persistent storage
 */
function saveRoutes(storage: RouteStorage): void {
  try {
    writeFileSync(ROUTES_FILE, JSON.stringify(storage, null, 2), 'utf-8');
  } catch (error) {
    console.error('Error saving routes:', error);
    throw new Error('Failed to save routes');
  }
}

/**
 * Validate slug format (alphanumeric, hyphens, underscores only)
 */
export function isValidSlug(slug: string): boolean {
  return /^[a-z0-9_-]+$/i.test(slug);
}

/**
 * Get a route by slug
 */
export function getRoute(slug: string): Route | null {
  const storage = loadRoutes();
  return storage.routes[slug] || null;
}

/**
 * Set or update a route
 */
export function setRoute(route: Route): void {
  if (!isValidSlug(route.slug)) {
    throw new Error(`Invalid slug format: ${route.slug}. Use only letters, numbers, hyphens, and underscores.`);
  }

  const storage = loadRoutes();
  storage.routes[route.slug] = route;
  saveRoutes(storage);
}

/**
 * Delete a route
 */
export function deleteRoute(slug: string): boolean {
  const storage = loadRoutes();

  if (!storage.routes[slug]) {
    return false;
  }

  delete storage.routes[slug];
  saveRoutes(storage);
  return true;
}

/**
 * List all routes
 */
export function listRoutes(): Route[] {
  const storage = loadRoutes();
  return Object.values(storage.routes).sort((a, b) =>
    new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
}

/**
 * Check if a route exists
 */
export function routeExists(slug: string): boolean {
  const storage = loadRoutes();
  return slug in storage.routes;
}

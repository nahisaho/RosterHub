/**
 * Express Request Type Augmentation
 *
 * Extends Express Request interface to include custom properties
 * set by authentication guards.
 */

declare namespace Express {
  export interface Request {
    /**
     * API Key record from database (set by ApiKeyGuard)
     */
    apiKeyRecord?: any;

    /**
     * Raw API key string (set by ApiKeyGuard)
     */
    apiKey?: string;

    /**
     * Client IP address (set by ApiKeyGuard)
     */
    clientIp?: string;

    /**
     * Organization ID from API key (set by ApiKeyGuard)
     */
    organizationId?: string;

    /**
     * Authenticated user (set by authentication middleware)
     */
    user?: {
      id: string;
      [key: string]: any;
    };
  }
}

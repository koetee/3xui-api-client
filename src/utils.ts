import {
    ApiError,
    AuthenticationError,
    NetworkError,
    ValidationError
} from './types';
import type { TrafficConfig, TrafficUnit } from './types';

/**
 * Retry configuration
 */
export interface RetryOptions {
    maxRetries?: number;
    backoffMs?: number;
    retryableErrors?: (error: any) => boolean;
}

/**
 * Resilient API call with exponential backoff retry
 */
export async function resilientApiCall<T>(
    fn: () => Promise<T>,
    options: RetryOptions = {}
): Promise<T> {
    const {
        maxRetries = 3,
        backoffMs = 1000,
        retryableErrors = (error) =>
            error instanceof NetworkError &&
            error.statusCode !== 401 &&
            error.statusCode !== 403
    } = options;

    let lastError: any;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;

            if (attempt === maxRetries || !retryableErrors(error)) {
                throw error;
            }

            const delay = backoffMs * Math.pow(2, attempt) + Math.random() * 1000;
            console.warn(`API call failed, retrying in ${Math.round(delay)}ms. Attempt ${attempt + 1}/${maxRetries + 1}`);

            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }

    throw lastError;
}

/**
 * Circuit Breaker for API calls
 */
export class CircuitBreaker {
    private failures = 0;
    private nextAttempt = Date.now();
    private readonly name: string;

    constructor(
        private fn: Function,
        private threshold: number = 5,
        private timeout: number = 60000,
        name: string = 'unknown'
    ) {
        this.name = name;
    }

    async call(...args: any[]): Promise<any> {
        if (this.failures >= this.threshold) {
            if (Date.now() < this.nextAttempt) {
                throw new ApiError(`Circuit breaker for ${this.name} is OPEN. Service temporarily unavailable.`);
            }
            this.failures = 0;
        }

        try {
            const result = await this.fn(...args);
            this.failures = 0;
            return result;
        } catch (error) {
            this.failures++;
            if (this.failures >= this.threshold) {
                this.nextAttempt = Date.now() + this.timeout;
                console.error(`Circuit breaker for ${this.name} opened after ${this.failures} failures`);
            }
            throw error;
        }
    }

    getStatus(): { failures: number; isOpen: boolean; nextAttempt?: Date } {
        const isOpen = this.failures >= this.threshold && Date.now() < this.nextAttempt;
        return {
            failures: this.failures,
            isOpen,
            nextAttempt: isOpen ? new Date(this.nextAttempt) : undefined
        };
    }
}

/**
 * HTTP response error handler
 */
export function handleHttpError(response: Response, responseData?: any): never {
    const { status, statusText } = response;

    if (status === 401) {
        throw new AuthenticationError('Invalid credentials or session expired');
    }

    if (status === 403) {
        throw new AuthenticationError('Access forbidden. Check your permissions.');
    }

    if (status === 404) {
        throw new ApiError('Resource not found', status, responseData);
    }

    if (status === 422) {
        throw new ValidationError(
            responseData?.message || 'Validation failed',
            responseData?.field
        );
    }

    if (status >= 400 && status < 500) {
        throw new ApiError(
            responseData?.message || `Client error: ${statusText}`,
            status,
            responseData
        );
    }

    if (status >= 500) {
        throw new NetworkError(
            responseData?.message || `Server error: ${statusText}`,
            status
        );
    }

    throw new NetworkError(
        `HTTP ${status}: ${statusText}`,
        status
    );
}

/**
 * Input validation utilities
 */

export function validatePort(port: number): boolean {
    return Number.isInteger(port) && port > 0 && port <= 65535;
}

export function validateUUID(uuid: string): boolean {
    if (!uuid || typeof uuid !== 'string') {
        return false;
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
}

export function validateInboundId(id: number): boolean {
    return Number.isInteger(id) && id > 0;
}

/**
 * Safe JSON parsing with error handling
 */
export function safeJsonParse<T = any>(jsonString: string, fallback: T): T {
    try {
        return JSON.parse(jsonString) as T;
    } catch (error) {
        console.warn('Failed to parse JSON:', error);
        return fallback;
    }
}

/**
 * Safe JSON stringifying with error handling
 */
export function safeJsonStringify(obj: any, fallback: string = '{}'): string {
    try {
        return JSON.stringify(obj);
    } catch (error) {
        console.warn('Failed to stringify JSON:', error);
        return fallback;
    }
}

/**
 * Validate client ID based on protocol type
 */
export function validateClientId(clientId: string, protocol: string): boolean {
    if (!clientId || typeof clientId !== 'string') {
        return false;
    }

    switch (protocol.toLowerCase()) {
        case 'vmess':
        case 'vless':
            return validateUUID(clientId);
        case 'trojan':
        case 'shadowsocks':
            return clientId.trim().length > 0;
        default:
            return false;
    }
}

/**
 * Graceful degradation helper
 */
export async function withFallback<T>(
    primaryFn: () => Promise<T>,
    fallbackFn: () => T | Promise<T>,
    errorMessage: string = 'Primary operation failed, using fallback'
): Promise<T> {
    try {
        return await primaryFn();
    } catch (error) {
        console.warn(errorMessage, error);
        return await fallbackFn();
    }
}

/**
 * Create error with context
 */
export function createErrorWithContext(
    error: unknown,
    context: Record<string, any> = {},
    defaultMessage: string = 'An unexpected error occurred'
): Error {
    const contextString = Object.keys(context).length > 0
        ? ` Context: ${JSON.stringify(context)}`
        : '';

    if (error instanceof Error) {
        error.message += contextString;
        return error;
    }

    return new Error(`${defaultMessage}${contextString}`);
}

/**
 * Convert traffic config to bytes
 */
export function convertTrafficToBytes(traffic: TrafficConfig | 'unlimited'): number {
    if (traffic === 'unlimited') {
        return 0; // 0 means unlimited in 3x-ui
    }

    if (traffic.unlimited) {
        return 0;
    }

    const multipliers: Record<TrafficUnit, number> = {
        MB: 1024 * 1024,
        GB: 1024 * 1024 * 1024,
        TB: 1024 * 1024 * 1024 * 1024
    };

    return traffic.size * multipliers[traffic.unit];
}

/**
 * Convert days to timestamp or handle unlimited
 */
export function convertExpiryDays(days: number | 'unlimited'): number {
    if (days === 'unlimited') {
        return 0; // 0 means no expiry in 3x-ui
    }

    if (days <= 0) {
        return 0;
    }

    return Date.now() + (days * 24 * 60 * 60 * 1000);
}

/**
 * Convert IP limit or handle unlimited
 */
export function convertIpLimit(limit: number | 'unlimited'): number {
    if (limit === 'unlimited') {
        return 0; // 0 means unlimited in 3x-ui
    }

    return Math.max(0, limit);
}

/**
 * Generate UUID for subId or clientId
 */
export function generateUUID(): string {
    return crypto.randomUUID();
}

/**
 * Generate random email from 8 random bytes (like "8s884159@x.ui")
 */
export function generateRandomEmail(): string {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';

    for (let i = 0; i < 8; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    return `${result}`;
} 
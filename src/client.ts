import {
    type ClientConfig,
    type LoginRequest,
    type LoginResponse,
    type ApiResponse,
    AuthenticationError,
    NetworkError,
    ValidationError
} from './types';

import {
    resilientApiCall,
    CircuitBreaker,
    handleHttpError,
    createErrorWithContext,
    safeJsonParse
} from './utils';

/**
 * Main 3x-ui API client with authentication and session management
 */
export class XUIClient {
    private readonly baseUrl: string;
    private readonly username: string;
    private readonly password: string;
    private readonly timeout: number;
    private readonly retryAttempts: number;
    private readonly retryDelay: number;

    private sessionCookie: string | null = null;
    private isAuthenticated = false;
    private lastLoginTime: number = 0;
    private circuitBreaker: CircuitBreaker;

    constructor(config: ClientConfig) {
        if (!config.baseUrl || !config.username || !config.password) {
            throw new ValidationError('baseUrl, username, and password are required');
        }

        this.baseUrl = config.baseUrl.replace(/\/$/, '');
        this.username = config.username;
        this.password = config.password;
        this.timeout = config.timeout ?? 30000; // 30 seconds default
        this.retryAttempts = config.retryAttempts ?? 3;
        this.retryDelay = config.retryDelay ?? 1000;

        this.circuitBreaker = new CircuitBreaker(
            this.makeHttpRequest.bind(this),
            5, // threshold
            60000, // timeout
            '3x-ui-api'
        );

        console.log(`Initialized 3x-ui client for ${this.baseUrl}`);
    }

    /**
     * Authenticate with the 3x-ui panel
     */
    async login(): Promise<void> {
        try {
            console.log('Attempting to login...');

            const loginData: LoginRequest = {
                username: this.username,
                password: this.password
            };

            const response = await this.makeRawRequest('/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams(loginData as any).toString()
            });

            const setCookieHeaders = response.headers.getSetCookie?.() ||
                response.headers.get('set-cookie')?.split(',') ||
                [];

            let sessionCookie = '';

            for (const cookie of setCookieHeaders) {
                if (cookie.includes('session') || cookie.includes('3x-ui')) {
                    sessionCookie = cookie.split(';')[0] || '';
                    break;
                }
            }

            if (!sessionCookie) {
                throw new AuthenticationError('No session cookie received from server');
            }

            this.sessionCookie = sessionCookie;
            this.isAuthenticated = true;
            this.lastLoginTime = Date.now();

            console.log('Login successful');
        } catch (error) {
            this.isAuthenticated = false;
            this.sessionCookie = null;

            throw createErrorWithContext(error, {
                username: this.username,
                baseUrl: this.baseUrl
            }, 'Login failed');
        }
    }

    /**
     * Check if current session is valid and re-authenticate if needed
     */
    private async ensureAuthenticated(): Promise<void> {
        const sessionAge = Date.now() - this.lastLoginTime;
        const oneHour = 60 * 60 * 1000;

        if (!this.isAuthenticated || !this.sessionCookie || sessionAge > oneHour) {
            await this.login();
        }
    }

    /**
     * Make a raw HTTP request without authentication
     */
    private async makeRawRequest(path: string, init: RequestInit = {}): Promise<Response> {
        const url = `${this.baseUrl}${path}`;

        const requestInit: RequestInit = {
            ...init,
            headers: {
                'User-Agent': '3xui-api-client/1.0.0',
                ...init.headers
            }
        };

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        try {
            const response = await fetch(url, {
                ...requestInit,
                signal: controller.signal
            });

            clearTimeout(timeoutId);
            return response;
        } catch (error) {
            clearTimeout(timeoutId);

            if ((error as Error).name === 'AbortError') {
                throw new NetworkError(`Request timeout after ${this.timeout}ms`);
            }

            throw new NetworkError(`Network request failed: ${(error as Error).message}`);
        }
    }

    /**
     * Make an authenticated HTTP request
     */
    private async makeHttpRequest(path: string, init: RequestInit = {}): Promise<Response> {
        await this.ensureAuthenticated();

        const requestInit: RequestInit = {
            ...init,
            headers: {
                'Cookie': this.sessionCookie || '',
                'Content-Type': 'application/json',
                ...init.headers
            }
        };

        const response = await this.makeRawRequest(path, requestInit);

        if (response.status === 401) {
            console.warn('Authentication failed, attempting re-login...');
            this.isAuthenticated = false;
            this.sessionCookie = null;

            await this.login();

            return this.makeRawRequest(path, {
                ...requestInit,
                headers: {
                    ...requestInit.headers,
                    'Cookie': this.sessionCookie || ''
                }
            });
        }

        return response;
    }

    /**
     * Make an API request and parse JSON response
     */
    async request<T = any>(path: string, init: RequestInit = {}): Promise<T> {
        return resilientApiCall(async () => {
            const response = await this.circuitBreaker.call(path, init);

            let responseData: any;

            try {
                const textResponse = await response.text();
                responseData = textResponse ? safeJsonParse(textResponse, {}) : {};
            } catch (error) {
                console.warn('Failed to parse response as JSON, using empty object');
                responseData = {};
            }

            if (!response.ok) {
                handleHttpError(response, responseData);
            }

            return responseData as T;
        }, {
            maxRetries: this.retryAttempts,
            backoffMs: this.retryDelay
        });
    }

    /**
     * GET request
     */
    async get<T = any>(path: string): Promise<T> {
        return this.request<T>(path, { method: 'GET' });
    }

    /**
     * POST request
     */
    async post<T = any>(path: string, data?: any): Promise<T> {
        const init: RequestInit = {
            method: 'POST'
        };

        if (data) {
            if (data instanceof FormData || data instanceof URLSearchParams) {
                init.body = data;
            } else {
                init.body = JSON.stringify(data);
                init.headers = {
                    'Content-Type': 'application/json'
                };
            }
        }

        return this.request<T>(path, init);
    }

    /**
     * PUT request
     */
    async put<T = any>(path: string, data?: any): Promise<T> {
        const init: RequestInit = {
            method: 'PUT'
        };

        if (data) {
            init.body = JSON.stringify(data);
        }

        return this.request<T>(path, init);
    }

    /**
     * DELETE request
     */
    async delete<T = any>(path: string): Promise<T> {
        return this.request<T>(path, { method: 'DELETE' });
    }

    /**
     * Check connection to 3x-ui panel
     */
    async checkConnection(): Promise<boolean> {
        try {
            await this.makeRawRequest('/', { method: 'GET' });
            return true;
        } catch (error) {
            console.warn('Connection check failed:', error);
            return false;
        }
    }

    /**
     * Get circuit breaker status
     */
    getCircuitBreakerStatus() {
        return this.circuitBreaker.getStatus();
    }

    /**
     * Get authentication status
     */
    getAuthStatus(): {
        isAuthenticated: boolean;
        lastLogin?: Date;
        sessionAge?: number;
    } {
        return {
            isAuthenticated: this.isAuthenticated,
            lastLogin: this.lastLoginTime ? new Date(this.lastLoginTime) : undefined,
            sessionAge: this.lastLoginTime ? Date.now() - this.lastLoginTime : undefined
        };
    }

    /**
     * Manually logout and clear session
     */
    logout(): void {
        this.isAuthenticated = false;
        this.sessionCookie = null;
        this.lastLoginTime = 0;
        console.log('Logged out successfully');
    }

    /**
     * Get the base API path for inbound operations
     */
    private getInboundPath(subPath: string = ''): string {
        return `/panel/api/inbounds${subPath}`;
    }
} 
import { XUIClient } from './client';
import { InboundManager } from './inbound-manager';
import { ClientManager } from './client-manager';

export * from './types';
export * from './utils';

export { XUIClient } from './client';
export { InboundManager } from './inbound-manager';
export { ClientManager } from './client-manager';

import type { ClientConfig } from './types';

/**
 * Main 3x-ui API client that combines all functionality
 */
export class XUI {
    private xuiClient: XUIClient;

    /** Inbound management operations */
    public readonly inbounds: InboundManager;

    /** Client management operations */
    public readonly clients: ClientManager;

    constructor(config: ClientConfig) {
        this.xuiClient = new XUIClient(config);
        this.inbounds = new InboundManager(this.xuiClient);
        this.clients = new ClientManager(this.xuiClient);
    }

    /**
     * Login to 3x-ui panel
     */
    async login(): Promise<void> {
        return this.xuiClient.login();
    }

    /**
     * Logout from 3x-ui panel
     */
    logout(): void {
        this.xuiClient.logout();
    }

    /**
     * Check connection to 3x-ui panel
     */
    async checkConnection(): Promise<boolean> {
        return this.xuiClient.checkConnection();
    }

    /**
     * Get authentication status
     */
    getAuthStatus() {
        return this.xuiClient.getAuthStatus();
    }

    /**
     * Get circuit breaker status
     */
    getCircuitBreakerStatus() {
        return this.xuiClient.getCircuitBreakerStatus();
    }

    /**
     * Make a raw request (advanced usage)
     */
    async request<T = any>(path: string, init?: RequestInit): Promise<T> {
        return this.xuiClient.request<T>(path, init);
    }

    /**
 * Get system overview with basic statistics
 */
    async getSystemOverview(): Promise<{
        auth: ReturnType<XUIClient['getAuthStatus']>;
        circuitBreaker: ReturnType<XUIClient['getCircuitBreakerStatus']>;
        inbounds: Awaited<ReturnType<InboundManager['getSummary']>>;
        onlineUsers: string[];
        subscriptions: Awaited<ReturnType<ClientManager['getAllSubscriptions']>>;
    }> {
        const results = await Promise.allSettled([
            this.inbounds.getSummary(),
            this.inbounds.getOnlineUsers(),
            this.clients.getAllSubscriptions()
        ]);

        const inboundsSummary = results[0].status === 'fulfilled'
            ? results[0].value
            : { total: 0, enabled: 0, disabled: 0, protocols: {}, totalTraffic: { up: 0, down: 0, total: 0 } };

        const onlineUsers = results[1].status === 'fulfilled'
            ? results[1].value
            : [];

        const subscriptions = results[2].status === 'fulfilled'
            ? results[2].value
            : [];

        return {
            auth: this.getAuthStatus(),
            circuitBreaker: this.getCircuitBreakerStatus(),
            inbounds: inboundsSummary,
            onlineUsers,
            subscriptions
        };
    }

    /**
 * Quick method: Create client with same subId on all inbounds
 */
    async createUniversalClient(options: {
        subId?: string;
        limitIp?: number | 'unlimited';
        traffic?: { size: number; unit: 'MB' | 'GB' | 'TB' } | 'unlimited';
        expiryDays?: number | 'unlimited';
    } = {}) {
        return this.clients.createClientOnAllInbounds({
            subId: options.subId,
            enable: true,
            limitIp: options.limitIp ?? 'unlimited',
            traffic: options.traffic ?? 'unlimited',
            expiryDays: options.expiryDays ?? 'unlimited',
            reset: 0
        });
    }
}

/**
 * Create a new 3x-ui client instance
 */
export function createClient(config: ClientConfig): XUI {
    return new XUI(config);
}

/**
 * Default export for convenience
 */
export default XUI; 
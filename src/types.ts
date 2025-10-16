/**
 * Authentication types
 */
export interface LoginRequest {
    username: string;
    password: string;
}

export interface LoginResponse {
    success: boolean;
    message?: string;
    token?: string;
}

/**
 * Client types based on different protocols
 */
export interface BaseClient {
    id: string;
    email: string;
    enable: boolean;
    limitIp: number;
    totalGB: number;
    expiryTime: number;
    subId: string;
    reset: number;
}

export interface VmessClient extends BaseClient {
    id: string;
    alterId: number;
    security: string;
}

export interface VlessClient extends BaseClient {
    id: string;
    flow: string;
}

export interface TrojanClient extends BaseClient {
    password: string;
}

export interface ShadowsocksClient extends BaseClient {
    method: string;
    password: string;
}

export type Client = VmessClient | VlessClient | TrojanClient | ShadowsocksClient;

/**
 * Inbound types
 */
export interface InboundSettings {
    clients?: Client[];
    decryption?: string;
    fallbacks?: any[];
}

export interface InboundStreamSettings {
    network: string;
    security: string;
    tlsSettings?: {
        serverName: string;
        certificates: Array<{
            certificateFile: string;
            keyFile: string;
        }>;
    };
    wsSettings?: {
        path: string;
        headers?: Record<string, string>;
    };
    tcpSettings?: {
        header?: {
            type: string;
        };
    };
    kcpSettings?: any;
    httpSettings?: any;
    quicSettings?: any;
    grpcSettings?: {
        serviceName: string;
    };
}

export interface Inbound {
    id: number;
    userId: number;
    up: number;
    down: number;
    total: number;
    remark: string;
    enable: boolean;
    expiryTime: number;
    clientStats: any[];
    listen: string;
    port: number;
    protocol: 'vmess' | 'vless' | 'trojan' | 'shadowsocks' | 'dokodemo-door' | 'socks' | 'http';
    settings: InboundSettings;
    streamSettings: InboundStreamSettings;
    tag: string;
    sniffing: {
        enabled: boolean;
        destOverride: string[];
    };
}

/**
 * Traffic statistics
 */
export interface ClientTraffic {
    id: number;
    inboundId: number;
    enable: boolean;
    email: string;
    up: number;
    down: number;
    expiryTime: number;
    total: number;
    reset: number;
}

/**
 * API Response types
 */
export interface ApiResponse<T = any> {
    success: boolean;
    message?: string;
    obj?: T;
}

export interface InboundListResponse extends ApiResponse<Inbound[]> { }
export interface InboundGetResponse extends ApiResponse<Inbound> { }
export interface ClientTrafficResponse extends ApiResponse<ClientTraffic> { }
export interface ClientTrafficsResponse extends ApiResponse<ClientTraffic[]> { }
export interface OnlineUsersResponse extends ApiResponse<string[]> { }

/**
 * Request types
 */
export interface AddInboundRequest {
    userId?: number;
    remark: string;
    enable: boolean;
    expiryTime: number;
    listen: string;
    port: number;
    protocol: Inbound['protocol'];
    settings: InboundSettings;
    streamSettings: InboundStreamSettings;
    tag: string;
    sniffing: {
        enabled: boolean;
        destOverride: string[];
    };
}

export interface UpdateInboundRequest extends Partial<AddInboundRequest> {
    id: number;
}

export interface AddClientRequest {
    id: number;
    settings: string;
}

export interface UpdateClientRequest {
    id: number;
    settings: string;
}

/**
 * Error types
 */
export class ApiError extends Error {
    constructor(
        message: string,
        public statusCode?: number,
        public response?: any
    ) {
        super(message);
        this.name = 'ApiError';
    }
}

export class AuthenticationError extends ApiError {
    constructor(message: string = 'Authentication failed') {
        super(message, 401);
        this.name = 'AuthenticationError';
    }
}

export class ValidationError extends ApiError {
    constructor(message: string, public field?: string) {
        super(message, 400);
        this.name = 'ValidationError';
    }
}

export class NetworkError extends ApiError {
    constructor(message: string, statusCode?: number) {
        super(message, statusCode);
        this.name = 'NetworkError';
    }
}

/**
 * Client configuration
 */
export interface ClientConfig {
    baseUrl: string;
    username: string;
    password: string;
    timeout?: number;
    retryAttempts?: number;
    retryDelay?: number;
}

/**
 * Client IP information
 */
export interface ClientIpInfo {
    clientEmail: string;
    ips: string[];
}

/**
 * Subscription information
 */
export interface SubscriptionInfo {
    subId: string;
    clients: Array<{
        client: Client;
        inboundId: number;
        inboundRemark: string;
        inboundProtocol: string;
    }>;
}

/**
 * Traffic size units
 */
export type TrafficUnit = 'MB' | 'GB' | 'TB';

/**
 * Traffic configuration
 */
export interface TrafficConfig {
    size: number;
    unit: TrafficUnit;
    unlimited?: boolean;
}

/**
 * Mass client creation request
 */
export interface MassClientRequest {
    subId?: string;
    enable?: boolean;
    limitIp?: number | 'unlimited';
    traffic?: TrafficConfig | 'unlimited';
    expiryDays?: number | 'unlimited';
    reset?: number;
    // Protocol-specific settings
    vmess?: {
        alterId?: number;
        security?: string;
    };
    vless?: {
        flow?: string;
    };
    trojan?: {
        password?: string;
    };
    shadowsocks?: {
        method?: string;
        password?: string;
    };
} 
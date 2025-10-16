import { XUIClient } from './client';
import { ValidationError } from './types';
import type {
    Client,
    ClientTraffic,
    ClientTrafficResponse,
    ClientTrafficsResponse,
    ClientIpInfo,
    ApiResponse,
    Inbound,
    InboundSettings,
    SubscriptionInfo,
    MassClientRequest,
    VlessClient,
    VmessClient,
    TrojanClient,
    ShadowsocksClient
} from './types';

import {
    validateInboundId,
    validateClientId,
    createErrorWithContext,
    safeJsonStringify,
    safeJsonParse,
    convertTrafficToBytes,
    convertExpiryDays,
    convertIpLimit,
    generateUUID,
    generateRandomEmail
} from './utils';

/**
 * Client manager for operations on inbound clients
 */
export class ClientManager {
    constructor(private client: XUIClient) { }

    /**
     * Get client traffic statistics by email
     */
    async getClientTraffic(email: string): Promise<ClientTraffic> {

        try {
            const response = await this.client.get<ClientTrafficResponse>(
                this.getPath(`/getClientTraffics/${encodeURIComponent(email)}`)
            );

            if (!response.success || !response.obj) {
                throw new Error(response.message || 'Client traffic not found');
            }

            return response.obj;
        } catch (error) {
            throw createErrorWithContext(error, {
                operation: 'getClientTraffic',
                email
            }, `Failed to get traffic for client ${email}`);
        }
    }

    /**
     * Get client traffic statistics by client ID
     */
    async getClientTrafficById(id: number): Promise<ClientTraffic> {
        if (!Number.isInteger(id) || id <= 0) {
            throw new ValidationError('Invalid client ID', 'id');
        }

        try {
            const response = await this.client.get<ClientTrafficResponse>(
                this.getPath(`/getClientTrafficsById/${id}`)
            );

            if (!response.success || !response.obj) {
                throw new Error(response.message || 'Client traffic not found');
            }

            return response.obj;
        } catch (error) {
            throw createErrorWithContext(error, {
                operation: 'getClientTrafficById',
                clientId: id
            }, `Failed to get traffic for client ID ${id}`);
        }
    }

    /**
     * Add client to inbound
     */
    async addClient(inboundId: number, client: Client): Promise<boolean> {
        if (!validateInboundId(inboundId)) {
            throw new ValidationError('Invalid inbound ID', 'inboundId');
        }

        this.validateClientData(client);

        try {
            const inboundResponse = await this.client.get<any>(
                this.getPath(`/get/${inboundId}`)
            );

            if (!inboundResponse.success || !inboundResponse.obj) {
                throw new Error('Inbound not found');
            }

            const inbound: Inbound = inboundResponse.obj;

            const currentSettings = inbound.settings || { clients: [] };
            const settings: InboundSettings = {
                ...currentSettings,
                clients: [...(currentSettings.clients || [])]
            };

            settings.clients!.push(client);

            const updateData = {
                id: inboundId,
                settings: safeJsonStringify(settings)
            };

            const response = await this.client.post<ApiResponse>(
                this.getPath('/addClient'),
                updateData
            );

            if (!response.success) {
                throw new Error(response.message || 'Failed to add client');
            }

            console.log(`Successfully added client ${client.email} to inbound ${inboundId}`);
            return true;
        } catch (error) {
            throw createErrorWithContext(error, {
                operation: 'addClient',
                inboundId,
                clientEmail: client.email
            }, 'Failed to add client');
        }
    }

    /**
     * Delete client by client ID
     * @param inboundId Inbound ID
     * @param clientId Client ID (depends on protocol: client.id for VMESS/VLESS, client.password for TROJAN, client.email for Shadowsocks)
     */
    async deleteClient(inboundId: number, clientId: string): Promise<boolean> {
        if (!validateInboundId(inboundId)) {
            throw new ValidationError('Invalid inbound ID', 'inboundId');
        }

        if (!clientId?.trim()) {
            throw new ValidationError('Client ID is required', 'clientId');
        }

        try {
            const response = await this.client.post<ApiResponse>(
                this.getPath(`/${inboundId}/delClient/${encodeURIComponent(clientId)}`)
            );

            if (!response.success) {
                throw new Error(response.message || 'Failed to delete client');
            }

            console.log(`Successfully deleted client ${clientId} from inbound ${inboundId}`);
            return true;
        } catch (error) {
            throw createErrorWithContext(error, {
                operation: 'deleteClient',
                inboundId,
                clientId
            }, 'Failed to delete client');
        }
    }

    /**
     * Update client by client ID
     */
    async updateClient(inboundId: number, clientId: string, clientData: Partial<Client>): Promise<boolean> {
        if (!validateInboundId(inboundId)) {
            throw new ValidationError('Invalid inbound ID', 'inboundId');
        }

        if (!clientId?.trim()) {
            throw new ValidationError('Client ID is required', 'clientId');
        }

        try {
            const inboundResponse = await this.client.get<any>(
                this.getPath(`/get/${inboundId}`)
            );

            if (!inboundResponse.success || !inboundResponse.obj) {
                throw new Error('Inbound not found');
            }

            const inbound: Inbound = inboundResponse.obj;

            const currentSettings = inbound.settings || { clients: [] };
            if (!currentSettings.clients || currentSettings.clients.length === 0) {
                throw new Error('No clients found in inbound');
            }

            let clientFound = false;
            const updatedClients = currentSettings.clients.map(client => {
                const isMatch = this.isClientMatch(client, clientId, inbound.protocol);

                if (isMatch) {
                    clientFound = true;
                    return { ...client, ...clientData };
                }
                return client;
            });

            if (!clientFound) {
                throw new Error('Client not found');
            }

            const settings: InboundSettings = {
                ...currentSettings,
                clients: updatedClients
            };

            const updateData = {
                id: inboundId,
                settings: safeJsonStringify(settings)
            };

            const response = await this.client.post<ApiResponse>(
                this.getPath(`/updateClient/${encodeURIComponent(clientId)}`),
                updateData
            );

            if (!response.success) {
                throw new Error(response.message || 'Failed to update client');
            }

            console.log(`Successfully updated client ${clientId} in inbound ${inboundId}`);
            return true;
        } catch (error) {
            throw createErrorWithContext(error, {
                operation: 'updateClient',
                inboundId,
                clientId
            }, 'Failed to update client');
        }
    }

    /**
     * Reset client traffic by email
     */
    async resetClientTraffic(inboundId: number, email: string): Promise<boolean> {
        if (!validateInboundId(inboundId)) {
            throw new ValidationError('Invalid inbound ID', 'inboundId');
        }


        try {
            const response = await this.client.post<ApiResponse>(
                this.getPath(`/${inboundId}/resetClientTraffic/${encodeURIComponent(email)}`)
            );

            if (!response.success) {
                throw new Error(response.message || 'Failed to reset client traffic');
            }

            console.log(`Successfully reset traffic for client ${email} in inbound ${inboundId}`);
            return true;
        } catch (error) {
            throw createErrorWithContext(error, {
                operation: 'resetClientTraffic',
                inboundId,
                email
            }, 'Failed to reset client traffic');
        }
    }

    /**
     * Get client IP addresses
     */
    async getClientIps(email: string): Promise<string[]> {

        try {
            const response = await this.client.post<ApiResponse<{ ips: string[] }>>(
                this.getPath(`/clientIps/${encodeURIComponent(email)}`)
            );

            if (!response.success || !response.obj) {
                throw new Error(response.message || 'Failed to get client IPs');
            }

            return response.obj.ips || [];
        } catch (error) {
            throw createErrorWithContext(error, {
                operation: 'getClientIps',
                email
            }, `Failed to get IPs for client ${email}`);
        }
    }

    /**
     * Clear client IP addresses
     */
    async clearClientIps(email: string): Promise<boolean> {

        try {
            const response = await this.client.post<ApiResponse>(
                this.getPath(`/clearClientIps/${encodeURIComponent(email)}`)
            );

            if (!response.success) {
                throw new Error(response.message || 'Failed to clear client IPs');
            }

            console.log(`Successfully cleared IPs for client ${email}`);
            return true;
        } catch (error) {
            throw createErrorWithContext(error, {
                operation: 'clearClientIps',
                email
            }, `Failed to clear IPs for client ${email}`);
        }
    }

    /**
     * Enable/disable client
     */
    async toggleClientEnabled(inboundId: number, clientId: string, enabled: boolean): Promise<boolean> {
        return this.updateClient(inboundId, clientId, { enable: enabled });
    }

    /**
     * Set client traffic limit
     */
    async setClientTrafficLimit(inboundId: number, clientId: string, limitGB: number): Promise<boolean> {
        if (limitGB < 0) {
            throw new ValidationError('Traffic limit must be non-negative', 'limitGB');
        }

        return this.updateClient(inboundId, clientId, {
            totalGB: limitGB * 1024 * 1024 * 1024 // Convert GB to bytes
        });
    }

    /**
     * Set client expiry date
     */
    async setClientExpiry(inboundId: number, clientId: string, expiryDate: Date): Promise<boolean> {
        return this.updateClient(inboundId, clientId, {
            expiryTime: expiryDate.getTime()
        });
    }

    /**
     * Get all clients from inbound
     */
    async getClientsFromInbound(inboundId: number): Promise<Client[]> {
        if (!validateInboundId(inboundId)) {
            throw new ValidationError('Invalid inbound ID', 'inboundId');
        }

        try {
            const inboundResponse = await this.client.get<any>(
                this.getPath(`/get/${inboundId}`)
            );

            if (!inboundResponse.success || !inboundResponse.obj) {
                throw new Error('Inbound not found');
            }

            const inbound: Inbound = inboundResponse.obj;
            return inbound.settings?.clients || [];
        } catch (error) {
            throw createErrorWithContext(error, {
                operation: 'getClientsFromInbound',
                inboundId
            }, `Failed to get clients from inbound ${inboundId}`);
        }
    }

    /**
     * Find client by email across all inbounds
     */
    async findClientByEmail(email: string): Promise<{ client: Client; inboundId: number } | null> {

        try {
            // Get all inbounds
            const inboundsResponse = await this.client.get<any>(
                this.getPath('/list')
            );

            if (!inboundsResponse.success || !inboundsResponse.obj) {
                return null;
            }

            const inbounds: Inbound[] = inboundsResponse.obj;

            for (const inbound of inbounds) {
                if (inbound.settings?.clients) {
                    const client = inbound.settings.clients.find(c => c.email === email);
                    if (client) {
                        return { client, inboundId: inbound.id };
                    }
                }
            }

            return null;
        } catch (error) {
            throw createErrorWithContext(error, {
                operation: 'findClientByEmail',
                email
            }, `Failed to find client with email ${email}`);
        }
    }

    /**
     * Validate client data
     */
    private validateClientData(client: Client): void {

        if (!client.id?.trim()) {
            throw new ValidationError('Client ID is required', 'id');
        }

        if (typeof client.enable !== 'boolean') {
            throw new ValidationError('Enable flag must be boolean', 'enable');
        }

        if (client.limitIp !== undefined && (!Number.isInteger(client.limitIp) || client.limitIp < 0)) {
            throw new ValidationError('IP limit must be a non-negative integer', 'limitIp');
        }

        if (client.totalGB !== undefined && (!Number.isInteger(client.totalGB) || client.totalGB < 0)) {
            throw new ValidationError('Total GB must be a non-negative integer', 'totalGB');
        }

        if (client.expiryTime !== undefined && (!Number.isInteger(client.expiryTime) || client.expiryTime < 0)) {
            throw new ValidationError('Expiry time must be a non-negative integer (timestamp)', 'expiryTime');
        }
    }

    /**
     * Check if client matches the given client ID based on protocol
     */
    private isClientMatch(client: Client, clientId: string, protocol: string): boolean {
        switch (protocol.toLowerCase()) {
            case 'vmess':
            case 'vless':
                return client.id === clientId;
            case 'trojan':
                return (client as any).password === clientId;
            case 'shadowsocks':
                return client.email === clientId;
            default:
                return client.id === clientId;
        }
    }

    /**
 * Get all subscriptions (sub) and their inbounds
 */
    async getAllSubscriptions(): Promise<SubscriptionInfo[]> {
        try {
            const inboundsResponse = await this.client.get<any>(
                this.getPath('/list')
            );

            if (!inboundsResponse.success || !inboundsResponse.obj) {
                throw new Error('Failed to get inbounds');
            }

            const inbounds: Inbound[] = inboundsResponse.obj;

            const subscriptionsMap = new Map<string, SubscriptionInfo>();

            for (const inbound of inbounds) {
                let parsedSettings: any = null;
                if (typeof inbound.settings === 'string') {
                    try {
                        parsedSettings = JSON.parse(inbound.settings);
                    } catch (error) {
                        console.warn(`Failed to parse settings for inbound ${inbound.id}: ${error}`);
                        continue;
                    }
                } else {
                    parsedSettings = inbound.settings;
                }

                if (parsedSettings?.clients) {
                    for (const client of parsedSettings.clients) {
                        if (client.subId) {
                            let subscription = subscriptionsMap.get(client.subId);

                            if (!subscription) {
                                subscription = {
                                    subId: client.subId,
                                    clients: []
                                };
                                subscriptionsMap.set(client.subId, subscription);
                            }

                            subscription.clients.push({
                                client,
                                inboundId: inbound.id,
                                inboundRemark: inbound.remark,
                                inboundProtocol: inbound.protocol
                            });
                        }
                    }
                }
            }

            return Array.from(subscriptionsMap.values());
        } catch (error) {
            throw createErrorWithContext(error, {
                operation: 'getAllSubscriptions'
            }, 'Failed to get all subscriptions');
        }
    }

    /**
     * Get subscription by subId
     */
    async getSubscriptionById(subId: string): Promise<SubscriptionInfo | null> {
        if (!subId?.trim()) {
            throw new ValidationError('SubId is required', 'subId');
        }

        try {
            const allSubscriptions = await this.getAllSubscriptions();
            return allSubscriptions.find(sub => sub.subId === subId) || null;
        } catch (error) {
            throw createErrorWithContext(error, {
                operation: 'getSubscriptionById',
                subId
            }, `Failed to get subscription with subId ${subId}`);
        }
    }

    /**
     * Create client with the same subId on all inbounds
     */
    async createClientOnAllInbounds(request: MassClientRequest): Promise<{
        success: number;
        failed: number;
        results: Array<{
            inboundId: number;
            inboundRemark: string;
            protocol: string;
            success: boolean;
            error?: string;
        }>;
    }> {
        this.validateMassClientRequest(request);

        if (!request.subId) {
            request.subId = generateUUID();
        }

        try {
            const inboundsResponse = await this.client.get<any>(
                this.getPath('/list')
            );

            if (!inboundsResponse.success || !inboundsResponse.obj) {
                throw new Error('Failed to get inbounds');
            }

            const inbounds: Inbound[] = inboundsResponse.obj;
            const results: Array<{
                inboundId: number;
                inboundRemark: string;
                protocol: string;
                success: boolean;
                error?: string;
            }> = [];

            let successCount = 0;
            let failedCount = 0;

            for (const inbound of inbounds) {
                try {
                    const client = this.createClientForProtocol(inbound, request);
                    await this.addClient(inbound.id, client);

                    results.push({
                        inboundId: inbound.id,
                        inboundRemark: inbound.remark,
                        protocol: inbound.protocol,
                        success: true
                    });

                    successCount++;
                    console.log(`✅ Client created successfully on inbound ${inbound.id} (${inbound.remark})`);
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

                    results.push({
                        inboundId: inbound.id,
                        inboundRemark: inbound.remark,
                        protocol: inbound.protocol,
                        success: false,
                        error: errorMessage
                    });

                    failedCount++;
                    console.warn(`❌ Failed to create client on inbound ${inbound.id} (${inbound.remark}): ${errorMessage}`);
                }
            }

            console.log(`Mass client creation completed: ${successCount} success, ${failedCount} failed`);

            return {
                success: successCount,
                failed: failedCount,
                results
            };
        } catch (error) {
            throw createErrorWithContext(error, {
                operation: 'createClientOnAllInbounds',
                subId: request.subId || 'generated'
            }, 'Failed to create client on all inbounds');
        }
    }

    /**
     * Create client with the same subId on specific inbounds
     */
    async createClientOnInbounds(request: MassClientRequest, inboundIds: number[]): Promise<{
        success: number;
        failed: number;
        results: Array<{
            inboundId: number;
            inboundRemark: string;
            protocol: string;
            success: boolean;
            error?: string;
        }>;
    }> {
        this.validateMassClientRequest(request);

        if (!Array.isArray(inboundIds) || inboundIds.length === 0) {
            throw new ValidationError('At least one inbound ID is required', 'inboundIds');
        }

        if (!request.subId) {
            request.subId = generateUUID();
        }

        try {
            const results: Array<{
                inboundId: number;
                inboundRemark: string;
                protocol: string;
                success: boolean;
                error?: string;
            }> = [];

            let successCount = 0;
            let failedCount = 0;

            for (const inboundId of inboundIds) {
                try {
                    const inboundResponse = await this.client.get<any>(
                        this.getPath(`/get/${inboundId}`)
                    );

                    if (!inboundResponse.success || !inboundResponse.obj) {
                        throw new Error('Inbound not found');
                    }

                    const inbound: Inbound = inboundResponse.obj;
                    const client = this.createClientForProtocol(inbound, request);
                    await this.addClient(inbound.id, client);

                    results.push({
                        inboundId: inbound.id,
                        inboundRemark: inbound.remark,
                        protocol: inbound.protocol,
                        success: true
                    });

                    successCount++;
                    console.log(`✅ Client created successfully on inbound ${inbound.id} (${inbound.remark})`);
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

                    results.push({
                        inboundId: inboundId,
                        inboundRemark: 'Unknown',
                        protocol: 'Unknown',
                        success: false,
                        error: errorMessage
                    });

                    failedCount++;
                    console.warn(`❌ Failed to create client on inbound ${inboundId}: ${errorMessage}`);
                }
            }

            console.log(`Mass client creation completed: ${successCount} success, ${failedCount} failed`);

            return {
                success: successCount,
                failed: failedCount,
                results
            };
        } catch (error) {
            throw createErrorWithContext(error, {
                operation: 'createClientOnInbounds',
                subId: request.subId || 'generated',
                inboundIds
            }, 'Failed to create client on specified inbounds');
        }
    }

    /**
     * Delete all clients with specific subId
     */
    async deleteClientsBySubId(subId: string): Promise<{
        success: number;
        failed: number;
        results: Array<{
            inboundId: number;
            clientEmail: string;
            success: boolean;
            error?: string;
        }>;
    }> {
        if (!subId?.trim()) {
            throw new ValidationError('SubId is required', 'subId');
        }

        try {
            const subscription = await this.getSubscriptionById(subId);

            if (!subscription) {
                return {
                    success: 0,
                    failed: 0,
                    results: []
                };
            }

            const results: Array<{
                inboundId: number;
                clientEmail: string;
                success: boolean;
                error?: string;
            }> = [];

            let successCount = 0;
            let failedCount = 0;

            for (const clientInfo of subscription.clients) {
                try {
                    const clientId = this.getClientIdForProtocol(clientInfo.client, clientInfo.inboundProtocol);
                    await this.deleteClient(clientInfo.inboundId, clientId);

                    results.push({
                        inboundId: clientInfo.inboundId,
                        clientEmail: clientInfo.client.email,
                        success: true
                    });

                    successCount++;
                    console.log(`✅ Client ${clientInfo.client.email} deleted from inbound ${clientInfo.inboundId}`);
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

                    results.push({
                        inboundId: clientInfo.inboundId,
                        clientEmail: clientInfo.client.email,
                        success: false,
                        error: errorMessage
                    });

                    failedCount++;
                    console.warn(`❌ Failed to delete client ${clientInfo.client.email} from inbound ${clientInfo.inboundId}: ${errorMessage}`);
                }
            }

            console.log(`Mass client deletion completed: ${successCount} success, ${failedCount} failed`);

            return {
                success: successCount,
                failed: failedCount,
                results
            };
        } catch (error) {
            throw createErrorWithContext(error, {
                operation: 'deleteClientsBySubId',
                subId
            }, `Failed to delete clients with subId ${subId}`);
        }
    }

    /**
    * Generate unique random email (8 random bytes like "8s884159")
    */
    private generateUniqueEmail(): string {
        return generateRandomEmail();
    }

    /**
     * Create client object based on protocol and inbound settings
     */
    private createClientForProtocol(inbound: Inbound, request: MassClientRequest): Client {
        const subId = request.subId;
        const email = this.generateUniqueEmail();
        const limitIp = request.limitIp ? convertIpLimit(request.limitIp) : 2;
        const totalGB = request.traffic ? convertTrafficToBytes(request.traffic) : 0;
        const expiryTime = request.expiryDays ? convertExpiryDays(request.expiryDays) : 0;

        const baseClient = {
            id: generateUUID(),
            email,
            enable: request.enable ?? true,
            limitIp,
            totalGB,
            expiryTime,
            subId,
            reset: request.reset ?? 0
        };

        switch (inbound.protocol.toLowerCase()) {
            case 'vmess':
                return {
                    ...baseClient,
                    alterId: request.vmess?.alterId ?? 0,
                    security: request.vmess?.security ?? 'auto'
                } as VmessClient;

            case 'vless':
                return {
                    ...baseClient,
                    flow: this.determineVlessFlow(inbound, request)
                } as VlessClient;

            case 'trojan':
                return {
                    ...baseClient,
                    password: request.trojan?.password ?? generateUUID()
                } as TrojanClient;

            case 'shadowsocks':
                return {
                    ...baseClient,
                    method: request.shadowsocks?.method ?? 'aes-256-gcm',
                    password: request.shadowsocks?.password ?? generateUUID()
                } as ShadowsocksClient;

            default:
                return {
                    ...baseClient,
                    flow: this.determineVlessFlow(inbound, request)
                } as VlessClient;
        }
    }

    /**
     * Determine correct flow for VLESS based on inbound stream settings
     */
    private determineVlessFlow(inbound: Inbound, request: MassClientRequest): string {
        if (request.vless?.flow !== undefined) {
            return request.vless.flow;
        }

        const streamSettings = inbound.streamSettings;
        if (!streamSettings) {
            return '';
        }

        const security = streamSettings.security?.toLowerCase();
        const network = streamSettings.network?.toLowerCase();

        if (security === 'xtls') {
            return 'xtls-rprx-vision';
        }

        if (security === 'tls' || security === 'reality') {
            return '';
        }

        if (network === 'tcp' && (!security || security === 'none')) {
            return '';
        }

        if (network === 'ws' || network === 'grpc' || network === 'h2' || network === 'httpupgrade') {
            return '';
        }

        return '';
    }

    /**
     * Get client ID for protocol-specific deletion
     */
    private getClientIdForProtocol(client: Client, protocol: string): string {
        switch (protocol.toLowerCase()) {
            case 'vmess':
            case 'vless':
                return client.id;
            case 'trojan':
                return (client as TrojanClient).password;
            case 'shadowsocks':
                return client.email;
            default:
                return client.id;
        }
    }

    /**
 * Validate mass client request
 */
    private validateMassClientRequest(request: MassClientRequest): void {
        if (request.limitIp !== undefined && request.limitIp !== 'unlimited') {
            if (!Number.isInteger(request.limitIp) || request.limitIp < 0) {
                throw new ValidationError('IP limit must be a non-negative integer or "unlimited"', 'limitIp');
            }
        }

        if (request.traffic && request.traffic !== 'unlimited' && typeof request.traffic === 'object') {
            if (request.traffic.size <= 0) {
                throw new ValidationError('Traffic size must be positive', 'traffic.size');
            }
            if (!['MB', 'GB', 'TB'].includes(request.traffic.unit)) {
                throw new ValidationError('Traffic unit must be MB, GB, or TB', 'traffic.unit');
            }
        }

        if (request.expiryDays !== undefined && request.expiryDays !== 'unlimited') {
            if (!Number.isInteger(request.expiryDays) || request.expiryDays < 0) {
                throw new ValidationError('Expiry days must be a non-negative integer or "unlimited"', 'expiryDays');
            }
        }
    }

    /**
     * Get API path for client operations
     */
    private getPath(subPath: string): string {
        return `/panel/api/inbounds${subPath}`;
    }
} 
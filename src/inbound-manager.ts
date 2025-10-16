import { XUIClient } from './client';
import {
    type Inbound,
    type AddInboundRequest,
    type UpdateInboundRequest,
    type InboundListResponse,
    type InboundGetResponse,
    type ApiResponse,
    ValidationError
} from './types';

import {
    validateInboundId,
    validatePort,
    createErrorWithContext
} from './utils';

/**
 * Inbound manager for CRUD operations on inbound connections
 */
export class InboundManager {
    constructor(private client: XUIClient) { }

    /**
     * Get all inbounds
     */
    async getList(): Promise<Inbound[]> {
        try {
            const response = await this.client.get<InboundListResponse>(
                this.getPath('/list')
            );

            if (!response.success || !response.obj) {
                throw new Error(response.message || 'Failed to get inbound list');
            }

            return response.obj;
        } catch (error) {
            throw createErrorWithContext(error, {
                operation: 'getInboundList'
            }, 'Failed to retrieve inbound list');
        }
    }

    /**
     * Get inbound by ID
     */
    async getById(id: number): Promise<Inbound> {
        if (!validateInboundId(id)) {
            throw new ValidationError('Invalid inbound ID', 'id');
        }

        try {
            const response = await this.client.get<InboundGetResponse>(
                this.getPath(`/get/${id}`)
            );

            if (!response.success || !response.obj) {
                throw new Error(response.message || 'Inbound not found');
            }

            return response.obj;
        } catch (error) {
            throw createErrorWithContext(error, {
                operation: 'getInboundById',
                inboundId: id
            }, `Failed to get inbound with ID ${id}`);
        }
    }

    /**
     * Add new inbound
     */
    async add(inboundData: AddInboundRequest): Promise<boolean> {
        this.validateInboundData(inboundData);

        try {
            const response = await this.client.post<ApiResponse>(
                this.getPath('/add'),
                inboundData
            );

            if (!response.success) {
                throw new Error(response.message || 'Failed to add inbound');
            }

            console.log(`Successfully added inbound: ${inboundData.remark}`);
            return true;
        } catch (error) {
            throw createErrorWithContext(error, {
                operation: 'addInbound',
                remark: inboundData.remark,
                port: inboundData.port,
                protocol: inboundData.protocol
            }, 'Failed to add inbound');
        }
    }

    /**
     * Update existing inbound
     */
    async update(id: number, inboundData: Partial<UpdateInboundRequest>): Promise<boolean> {
        if (!validateInboundId(id)) {
            throw new ValidationError('Invalid inbound ID', 'id');
        }

        if (inboundData.port !== undefined && !validatePort(inboundData.port)) {
            throw new ValidationError('Invalid port number', 'port');
        }

        try {
            const updateData = { ...inboundData, id };

            const response = await this.client.post<ApiResponse>(
                this.getPath(`/update/${id}`),
                updateData
            );

            if (!response.success) {
                throw new Error(response.message || 'Failed to update inbound');
            }

            console.log(`Successfully updated inbound ID ${id}`);
            return true;
        } catch (error) {
            throw createErrorWithContext(error, {
                operation: 'updateInbound',
                inboundId: id,
                updateData: inboundData
            }, `Failed to update inbound with ID ${id}`);
        }
    }

    /**
     * Delete inbound by ID
     */
    async delete(id: number): Promise<boolean> {
        if (!validateInboundId(id)) {
            throw new ValidationError('Invalid inbound ID', 'id');
        }

        try {
            const response = await this.client.post<ApiResponse>(
                this.getPath(`/del/${id}`)
            );

            if (!response.success) {
                throw new Error(response.message || 'Failed to delete inbound');
            }

            console.log(`Successfully deleted inbound ID ${id}`);
            return true;
        } catch (error) {
            throw createErrorWithContext(error, {
                operation: 'deleteInbound',
                inboundId: id
            }, `Failed to delete inbound with ID ${id}`);
        }
    }

    /**
     * Enable/disable inbound
     */
    async toggleEnabled(id: number, enabled: boolean): Promise<boolean> {
        const inbound = await this.getById(id);

        return this.update(id, {
            enable: enabled
        });
    }

    /**
     * Reset all traffics for all inbounds
     */
    async resetAllTraffics(): Promise<boolean> {
        try {
            const response = await this.client.post<ApiResponse>(
                this.getPath('/resetAllTraffics')
            );

            if (!response.success) {
                throw new Error(response.message || 'Failed to reset all traffics');
            }

            console.log('Successfully reset all traffics');
            return true;
        } catch (error) {
            throw createErrorWithContext(error, {
                operation: 'resetAllTraffics'
            }, 'Failed to reset all traffics');
        }
    }

    /**
     * Reset traffics for all clients in a specific inbound
     */
    async resetAllClientTraffics(id: number): Promise<boolean> {
        if (!validateInboundId(id)) {
            throw new ValidationError('Invalid inbound ID', 'id');
        }

        try {
            const response = await this.client.post<ApiResponse>(
                this.getPath(`/resetAllClientTraffics/${id}`)
            );

            if (!response.success) {
                throw new Error(response.message || 'Failed to reset client traffics');
            }

            console.log(`Successfully reset all client traffics for inbound ${id}`);
            return true;
        } catch (error) {
            throw createErrorWithContext(error, {
                operation: 'resetAllClientTraffics',
                inboundId: id
            }, `Failed to reset client traffics for inbound ${id}`);
        }
    }

    /**
     * Delete depleted clients from inbound
     * @param id Inbound ID, or -1 for all inbounds
     */
    async deleteDepletedClients(id: number): Promise<boolean> {
        if (id !== -1 && !validateInboundId(id)) {
            throw new ValidationError('Invalid inbound ID (use -1 for all inbounds)', 'id');
        }

        try {
            const response = await this.client.post<ApiResponse>(
                this.getPath(`/delDepletedClients/${id}`)
            );

            if (!response.success) {
                throw new Error(response.message || 'Failed to delete depleted clients');
            }

            const target = id === -1 ? 'all inbounds' : `inbound ${id}`;
            console.log(`Successfully deleted depleted clients for ${target}`);
            return true;
        } catch (error) {
            throw createErrorWithContext(error, {
                operation: 'deleteDepletedClients',
                inboundId: id
            }, `Failed to delete depleted clients for inbound ${id}`);
        }
    }

    /**
    * Get online users (list of emails)
    */
    async getOnlineUsers(): Promise<string[]> {
        try {
            const response = await this.client.post<any>(
                this.getPath('/onlines')
            );

            if (response.success && response.obj) {
                if (Array.isArray(response.obj)) {
                    return response.obj;
                }
                if (response.obj.users && Array.isArray(response.obj.users)) {
                    return response.obj.users;
                }
                if (response.obj.emails && Array.isArray(response.obj.emails)) {
                    return response.obj.emails;
                }
            }

            console.warn('Unexpected response format for online users:', response);
            return [];

        } catch (error) {
            console.warn('Failed to get online users:', error instanceof Error ? error.message : 'Unknown error');
            return [];
        }
    }

    /**
     * Create backup (Telegram bot functionality)
     */
    async createBackup(): Promise<boolean> {
        try {
            const response = await this.client.get<ApiResponse>(
                this.getPath('/createbackup')
            );

            if (!response.success) {
                throw new Error(response.message || 'Failed to create backup');
            }

            console.log('Backup creation request sent');
            return true;
        } catch (error) {
            throw createErrorWithContext(error, {
                operation: 'createBackup'
            }, 'Failed to create backup');
        }
    }

    /**
     * Find inbound by port
     */
    async findByPort(port: number): Promise<Inbound | null> {
        if (!validatePort(port)) {
            throw new ValidationError('Invalid port number', 'port');
        }

        const inbounds = await this.getList();
        return inbounds.find(inbound => inbound.port === port) || null;
    }

    /**
     * Find inbounds by protocol
     */
    async findByProtocol(protocol: string): Promise<Inbound[]> {
        const inbounds = await this.getList();
        return inbounds.filter(inbound =>
            inbound.protocol.toLowerCase() === protocol.toLowerCase()
        );
    }

    /**
     * Get inbounds summary statistics
     */
    async getSummary(): Promise<{
        total: number;
        enabled: number;
        disabled: number;
        protocols: Record<string, number>;
        totalTraffic: { up: number; down: number; total: number };
    }> {
        const inbounds = await this.getList();

        const summary = {
            total: inbounds.length,
            enabled: 0,
            disabled: 0,
            protocols: {} as Record<string, number>,
            totalTraffic: { up: 0, down: 0, total: 0 }
        };

        for (const inbound of inbounds) {
            if (inbound.enable) {
                summary.enabled++;
            } else {
                summary.disabled++;
            }

            summary.protocols[inbound.protocol] = (summary.protocols[inbound.protocol] || 0) + 1;

            summary.totalTraffic.up += inbound.up;
            summary.totalTraffic.down += inbound.down;
            summary.totalTraffic.total += inbound.total;
        }

        return summary;
    }

    /**
     * Validate inbound data before creating/updating
     */
    private validateInboundData(data: AddInboundRequest): void {
        if (!data.remark?.trim()) {
            throw new ValidationError('Remark is required', 'remark');
        }

        if (!validatePort(data.port)) {
            throw new ValidationError('Invalid port number', 'port');
        }

        if (!data.protocol) {
            throw new ValidationError('Protocol is required', 'protocol');
        }

        const validProtocols = ['vmess', 'vless', 'trojan', 'shadowsocks', 'dokodemo-door', 'socks', 'http'];
        if (!validProtocols.includes(data.protocol)) {
            throw new ValidationError(`Invalid protocol. Supported: ${validProtocols.join(', ')}`, 'protocol');
        }

        if (!data.streamSettings?.network) {
            throw new ValidationError('Stream network settings are required', 'streamSettings.network');
        }
    }

    /**
     * Get API path for inbound operations
     */
    private getPath(subPath: string): string {
        return `/panel/api/inbounds${subPath}`;
    }
} 
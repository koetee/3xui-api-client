import type { HeadersInit } from "bun";

/**
 * Custom error class for API-related errors.
 */
class APIError extends Error {
   constructor(public readonly status: number, message: string) {
      super(message);
      this.name = 'APIError';
   }
}

/**
 * Interface representing an inbound configuration in 3x-ui.
 */
interface Inbound {
   readonly id: number;
   readonly userId: number;
   readonly up: number;
   readonly down: number;
   readonly total: number;
   readonly remark: string;
   readonly enable: boolean;
   readonly expiryTime: number;
   readonly listen: string;
   readonly port: number;
   readonly protocol: string;
   readonly settings: string; // JSON string
   readonly streamSettings: string; // JSON string
   readonly tag: string;
   readonly sniffing: string; // JSON string
}

/**
 * Interface representing a client in 3x-ui.
 */
interface Client {
   readonly email: string;
   readonly enable: boolean;
   readonly expiryTime: number;
   readonly totalGB: number;
   readonly settings: object; // Protocol-specific settings
}

/**
 * Interface representing traffic data for a client.
 */
interface Traffic {
   readonly upload: number;
   readonly download: number;
   readonly total: number;
}

/**
 * Options for making an API request.
 */
interface RequestOptions {
   readonly method: string;
   readonly path: string;
   readonly body?: object;
}

/**
 * Main class for interacting with the 3x-ui API.
 */
class XUI {
   private readonly baseUrl: string;
   private readonly headers: HeadersInit = {
      'Content-Type': 'application/json',
   };

   /**
    * Constructs an XUI instance.
    * @param baseUrl - The base URL of the 3x-ui panel (e.g., 'http://panel.example.com').
    */
   constructor(baseUrl: string) {
      this.baseUrl = this.normalizeBaseUrl(baseUrl);
   }

   /**
    * Normalizes the base URL by removing trailing slashes.
    * @param url - The URL to normalize.
    * @returns The normalized URL.
    */
   private normalizeBaseUrl(url: string): string {
      return url.endsWith('/') ? url.slice(0, -1) : url;
   }

   /**
    * Executes an API request to the 3x-ui panel.
    * @param options - The request options.
    * @returns The response data.
    * @throws {APIError} If the request fails.
    */
   private async executeRequest<T>({ method, path, body }: RequestOptions): Promise<T> {
      const url = `${this.baseUrl}/panel/api/inbounds${path}`;
      const response = await fetch(url, {
         method,
         headers: this.headers,
         credentials: 'include',
         body: body ? JSON.stringify(body) : undefined,
      });
      if (!response.ok) {
         const errorText = await response.text();
         throw new APIError(response.status, errorText);
      }
      return response.json() as Promise<T>;
   }

   /**
    * Authenticates with the 3x-ui panel. Must be called before other methods.
    * @param username - The admin username.
    * @param password - The admin password.
    * @throws {APIError} If login fails.
    */
   async login(username: string, password: string): Promise<void> {
      await this.executeRequest<void>({
         method: 'POST',
         path: '/login',
         body: { username, password },
      });
   }

   /**
    * Retrieves all inbounds from the panel.
    * @returns An array of inbound configurations.
    */
   async getInbounds(): Promise<Inbound[]> {
      return this.executeRequest<Inbound[]>({ method: 'GET', path: '/list' });
   }

   /**
    * Retrieves a specific inbound by ID.
    * @param id - The inbound ID.
    * @returns The inbound configuration.
    */
   async getInbound(id: number): Promise<Inbound> {
      return this.executeRequest<Inbound>({ method: 'GET', path: `/get/${id}` });
   }

   /**
    * Adds a new inbound to the panel.
    * @param inbound - The inbound configuration to add.
    * @returns The created inbound.
    */
   async addInbound(inbound: Partial<Inbound>): Promise<Inbound> {
      return this.executeRequest<Inbound>({ method: 'POST', path: '/add', body: inbound });
   }

   /**
    * Deletes an inbound by ID.
    * @param id - The inbound ID to delete.
    */
   async deleteInbound(id: number): Promise<void> {
      await this.executeRequest<void>({ method: 'POST', path: `/del/${id}` });
   }

   /**
    * Updates an existing inbound by ID.
    * @param id - The inbound ID to update.
    * @param inbound - The partial inbound configuration to update.
    * @returns The updated inbound.
    */
   async updateInbound(id: number, inbound: Partial<Inbound>): Promise<Inbound> {
      return this.executeRequest<Inbound>({ method: 'POST', path: `/update/${id}`, body: inbound });
   }

   /**
    * Adds a client to an inbound.
    * @param inboundId - The ID of the inbound to add the client to.
    * @param client - The client configuration.
    * @returns The created client.
    */
   async addClient(inboundId: number, client: Client): Promise<Client> {
      return this.executeRequest<Client>({
         method: 'POST',
         path: '/addClient',
         body: { id: inboundId, settings: client },
      });
   }

   /**
    * Deletes a client by its client ID.
    * @param clientId - The client ID (protocol-specific: id for VMESS/VLESS, password for Trojan, email for Shadowsocks).
    */
   async deleteClient(clientId: string): Promise<void> {
      await this.executeRequest<void>({ method: 'POST', path: `/delClient/${clientId}` });
   }

   /**
    * Updates a client by its client ID.
    * @param clientId - The client ID to update.
    * @param client - The partial client configuration to update.
    * @returns The updated client.
    */
   async updateClient(clientId: string, client: Partial<Client>): Promise<Client> {
      return this.executeRequest<Client>({
         method: 'POST',
         path: `/updateClient/${clientId}`,
         body: client,
      });
   }

   /**
    * Retrieves traffic data for a client by email.
    * @param email - The client's email.
    * @returns An array of traffic data.
    */
   async getClientTraffics(email: string): Promise<Traffic[]> {
      return this.executeRequest<Traffic[]>({ method: 'GET', path: `/getClientTraffics/${email}` });
   }

   /**
    * Resets traffic for all inbounds.
    */
   async resetAllTraffics(): Promise<void> {
      await this.executeRequest<void>({ method: 'POST', path: '/resetAllTraffics' });
   }

   /**
    * Deletes depleted clients from an inbound or all inbounds if inboundId is -1.
    * @param inboundId - The inbound ID, or -1 for all.
    */
   async deleteDepletedClients(inboundId: number = -1): Promise<void> {
      await this.executeRequest<void>({ method: 'POST', path: `/delDepletedClients/${inboundId}` });
   }

   /**
    * Retrieves a list of online users.
    * @returns An array of email addresses of online users.
    */
   async getOnlineUsers(): Promise<string[]> {
      return this.executeRequest<string[]>({ method: 'POST', path: '/onlines' });
   }
}

export { XUI, APIError };
export type { Inbound, Client, Traffic };
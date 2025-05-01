import { BaseApi } from "./base-api";
import { type Client, createClient } from "../models/client";

/** Handles client-related operations in the 3x-ui API. */
export class ClientApi {
   constructor(private readonly baseApi: BaseApi) { }

   /**
    * Retrieves a client by email.
    * @param email - The email of the client to retrieve.
    * @returns The client object or null if not found.
    */
   async getByEmail(email: string): Promise<Client | null> {
      const response = await this.baseApi.get<Record<string, unknown>>(
         `panel/api/inbounds/getClientTraffics/${email}`
      );
      return response.obj ? createClient(response.obj) : null;
   }

   /**
    * Retrieves IP records for a client.
    * @param email - The email of the client.
    * @returns List of IP addresses.
    */
   async getIps(email: string): Promise<string[]> {
      const response = await this.baseApi.post<string[]>(`panel/api/inbounds/clientIps/${email}`, {});

      return response.obj ?? [];
   }

   /**
    * Adds clients to an inbound.
    * @param inboundId - The ID of the inbound.
    * @param clients - List of clients to add.
    */
   async add(inboundId: number, clients: Client[]): Promise<void> {
      const settings = { clients: clients.map((c) => ({ id: c.id, email: c.email, enable: c.enable })) };
      await this.baseApi.post("panel/api/inbounds/addClient", {
         id: inboundId,
         settings: JSON.stringify(settings),
      });
   }

   /**
    * Updates a client's details.
    * @param clientUuid - The UUID of the client to update.
    * @param client - Updated client data.
    */
   async update(clientUuid: string, client: Client): Promise<void> {
      const settings = { clients: [{ id: clientUuid, email: client.email, enable: client.enable }] };
      await this.baseApi.post(`panel/api/inbounds/updateClient/${clientUuid}`, {
         id: client.inboundId,
         settings: JSON.stringify(settings),
      });
   }

   /** Resets IP records for a client by email. */
   async resetIps(email: string): Promise<void> {
      await this.baseApi.post(`panel/api/inbounds/clearClientIps/${email}`, {});
   }

   /** Resets traffic statistics for a client. */
   async resetStats(inboundId: number, email: string): Promise<void> {
      await this.baseApi.post(`panel/api/inbounds/${inboundId}/resetClientTraffic/${email}`, {});
   }

   /** Deletes a client from an inbound. */
   async delete(inboundId: number, clientUuid: string): Promise<void> {
      await this.baseApi.post(`panel/api/inbounds/${inboundId}/delClient/${clientUuid}`, {});
   }

   /** Deletes depleted clients from an inbound. */
   async deleteDepleted(inboundId: number): Promise<void> {
      await this.baseApi.post(`panel/api/inbounds/delDepletedClients/${inboundId}`, {});
   }

   /** Retrieves emails of online clients. */
   async getOnline(): Promise<string[]> {
      const response = await this.baseApi.post<string[]>("panel/api/inbounds/onlines", {});
      return response.obj ?? [];
   }

   /**
    * Retrieves traffic data by client UUID.
    * @param clientUuid - The UUID of the client.
    * @returns List of client traffic data.
    */
   async getTrafficById(clientUuid: string): Promise<Client[]> {
      const response = await this.baseApi.get<Record<string, unknown>[]>(
         `panel/api/inbounds/getClientTraffics/${clientUuid}`
      );
      return response.obj?.map(createClient) ?? [];
   }
}
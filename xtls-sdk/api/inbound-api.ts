import { BaseApi } from "./base-api";
import { type Inbound, createInbound } from "../models/inbound";

/** Handles inbound-related operations in the 3x-ui API. */
export class InboundApi {
   constructor(private readonly baseApi: BaseApi) { }

   /** Retrieves a list of all inbounds. */
   async getList(): Promise<Inbound[]> {
      const response = await this.baseApi.get<Record<string, unknown>[]>("panel/api/inbounds/list");
      return response.obj?.map(createInbound) ?? [];
   }

   /**
    * Retrieves an inbound by ID.
    * @param inboundId - The ID of the inbound.
    */
   async getById(inboundId: number): Promise<Inbound> {
      const response = await this.baseApi.get<Record<string, unknown>>(
         `panel/api/inbounds/get/${inboundId}`
      );
      if (!response.obj) throw new Error(`Inbound ${inboundId} not found`);
      return createInbound(response.obj);
   }

   /** Adds a new inbound configuration. */
   async add(inbound: Inbound): Promise<void> {
      const data = {
         id: inbound.id,
         enable: inbound.enable,
         remark: inbound.remark,
         protocol: inbound.protocol,
         port: inbound.port,
         settings: JSON.stringify(inbound.settings),
         streamSettings: JSON.stringify(inbound.streamSettings),
         sniffing: JSON.stringify(inbound.sniffing),
      };
      await this.baseApi.post("panel/api/inbounds/add", data);
   }

   /** Deletes an inbound by ID. */
   async delete(inboundId: number): Promise<void> {
      await this.baseApi.post(`panel/api/inbounds/del/${inboundId}`, {});
   }

   /** Updates an existing inbound. */
   async update(inboundId: number, inbound: Inbound): Promise<void> {
      const data = {
         id: inboundId,
         enable: inbound.enable,
         remark: inbound.remark,
         protocol: inbound.protocol,
         port: inbound.port,
         settings: JSON.stringify(inbound.settings),
         streamSettings: JSON.stringify(inbound.streamSettings),
         sniffing: JSON.stringify(inbound.sniffing),
      };
      await this.baseApi.post(`panel/api/inbounds/update/${inboundId}`, data);
   }

   /** Resets traffic statistics for all inbounds. */
   async resetStats(): Promise<void> {
      await this.baseApi.post("panel/api/inbounds/resetAllTraffics", {});
   }

   /** Resets client traffic statistics for an inbound. */
   async resetClientStats(inboundId: number): Promise<void> {
      await this.baseApi.post(`panel/api/inbounds/resetAllClientTraffics/${inboundId}`, {});
   }
}
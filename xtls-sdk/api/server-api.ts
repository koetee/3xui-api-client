import { BaseApi } from "./base-api";
import { type Server, createServer } from "../models/server";

/** Handles server-related operations in the 3x-ui API. */
export class ServerApi {
   constructor(private readonly baseApi: BaseApi) { }

   /** Retrieves the database backup as a binary buffer. */
   async getDb(): Promise<Buffer> {
      return this.baseApi.getBinary("server/getDb");
   }

   /** Retrieves the current server status. */
   async getStatus(): Promise<Server> {
      const response = await this.baseApi.post<Record<string, unknown>>("server/status", {});

      if (!response.obj) throw new Error("Server status not available");
      return createServer(response.obj);
   }
}
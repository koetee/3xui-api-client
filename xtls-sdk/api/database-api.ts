import { BaseApi } from "./base-api";

/** Handles database-related operations in the 3x-ui API. */
export class DatabaseApi {
   constructor(private readonly baseApi: BaseApi) { }

   /** Triggers the export of the database via Telegram bot. */
   async export(): Promise<void> {
      await this.baseApi.get("panel/api/inbounds/createbackup");
   }
}
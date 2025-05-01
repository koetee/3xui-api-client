/**
 * Represents a client in the 3x-ui system.
 */
export interface Client {
   /** Unique identifier for the client. */
   readonly id: number;
   /** Email address of the client. */
   readonly email: string;
   /** Indicates whether the client is enabled. */
   readonly enable: boolean;
   /** ID of the associated inbound. */
   readonly inboundId: number;
   /** Uploaded bytes. */
   readonly up: number;
   /** Downloaded bytes. */
   readonly down: number;
   /** Expiry time of the client. */
   readonly expiryTime: number;
   /** Total allocated data. */
   readonly total: number;
   /** Reset value. */
   readonly reset: number;
}

/**
 * Converts raw JSON data to a Client object.
 * @param data - Raw JSON data.
 * @returns A Client object with validated fields.
 */
export function createClient(data: unknown): Client {
   const obj = data as Record<string, unknown>;
   return {
      id: Number(obj.id ?? 0),
      email: String(obj.email ?? ""),
      enable: Boolean(obj.enable ?? false),
      inboundId: Number(obj.inboundId ?? 0),
      up: Number(obj.up ?? 0),
      down: Number(obj.down ?? 0),
      expiryTime: Number(obj.expiryTime ?? 0),
      total: Number(obj.total ?? 0),
      reset: Number(obj.reset ?? 0),
   };
}
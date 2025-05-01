/** Represents an inbound configuration in the 3x-ui system. */
export interface Inbound {
   /** Unique identifier for the inbound. */
   readonly id: number;
   /** Indicates whether the inbound is enabled. */
   readonly enable: boolean;
   /** Remark or name for the inbound. */
   readonly remark: string;
   /** Protocol used by the inbound (e.g., "vless"). */
   readonly protocol: string;
   /** Port number for the inbound. */
   readonly port: number;
   // Simplified settings; expand as needed based on API
   readonly settings: Record<string, unknown>;
   readonly streamSettings: Record<string, unknown>;
   readonly sniffing: { enabled: boolean };
}

/** Converts raw JSON data to an Inbound object. */
export function createInbound(data: unknown): Inbound {
   const obj = data as Record<string, unknown>;
   return {
      id: Number(obj.id ?? 0),
      enable: Boolean(obj.enable ?? false),
      remark: String(obj.remark ?? ""),
      protocol: String(obj.protocol ?? ""),
      port: Number(obj.port ?? 0),
      settings: (obj.settings as Record<string, unknown>) ?? {},
      streamSettings: (obj.streamSettings as Record<string, unknown>) ?? {},
      sniffing: { enabled: Boolean((obj.sniffing as { enabled?: unknown })?.enabled ?? false) },
   };
}
/**
 * Represents server status information in the 3x-ui system.
 */
export interface Server {
   /** CPU usage percentage. */
   readonly cpu: number;
   /** Number of CPU cores. */
   readonly cpuCores: number;
   /** Number of logical processors. */
   readonly logicalPro: number;
   /** CPU speed in MHz. */
   readonly cpuSpeedMhz: number;
   /** Memory usage details. */
   readonly mem: {
      /** Current memory usage in bytes. */
      readonly current: number;
      /** Total available memory in bytes. */
      readonly total: number;
   };
   /** Swap usage details. */
   readonly swap: {
      /** Current swap usage in bytes. */
      readonly current: number;
      /** Total available swap in bytes. */
      readonly total: number;
   };
   /** Disk usage details. */
   readonly disk: {
      /** Current disk usage in bytes. */
      readonly current: number;
      /** Total disk capacity in bytes. */
      readonly total: number;
   };
   /** Xray service status details. */
   readonly xray: {
      /** State of the xray service. */
      readonly state: string;
      /** Error message if any. */
      readonly errorMsg: string;
      /** Version of the xray service. */
      readonly version: string;
   };
   /** Server uptime in seconds. */
   readonly uptime: number;
   /** System load averages over 1, 5, and 15 minutes. */
   readonly loads: number[];
   /** Count of active TCP connections. */
   readonly tcpCount: number;
   /** Count of active UDP connections. */
   readonly udpCount: number;
   /** Network I/O details. */
   readonly netIO: {
      /** Uploaded bytes. */
      readonly up: number;
      /** Downloaded bytes. */
      readonly down: number;
   };
   /** Network traffic statistics. */
   readonly netTraffic: {
      /** Total sent bytes. */
      readonly sent: number;
      /** Total received bytes. */
      readonly recv: number;
   };
   /** Public IP addresses. */
   readonly publicIP: {
      /** Public IPv4 address. */
      readonly ipv4: string;
      /** Public IPv6 address or 'N/A' if not available. */
      readonly ipv6: string;
   };
   /** Application-specific statistics. */
   readonly appStats: {
      /** Number of threads used by the application. */
      readonly threads: number;
      /** Memory usage in bytes by the application. */
      readonly mem: number;
      /** Application uptime in seconds. */
      readonly uptime: number;
   };
}

/**
 * Converts raw JSON data to a Server object.
 * @param data - Raw JSON data.
 * @returns A Server object with validated fields.
 */
export function createServer(data: unknown): Server {
   const obj = data as Record<string, unknown>;

   const getNestedNumber = (container: Record<string, unknown> | undefined, key: string): number =>
      Number(container?.[key] ?? 0);

   const getNestedString = (container: Record<string, unknown> | undefined, key: string): string =>
      String(container?.[key] ?? "");

   return {
      cpu: Number(obj.cpu ?? 0),
      cpuCores: Number(obj.cpuCores ?? 0),
      logicalPro: Number(obj.logicalPro ?? 0),
      cpuSpeedMhz: Number(obj.cpuSpeedMhz ?? 0),
      mem: {
         current: getNestedNumber(obj.mem as Record<string, unknown>, "current"),
         total: getNestedNumber(obj.mem as Record<string, unknown>, "total"),
      },
      swap: {
         current: getNestedNumber(obj.swap as Record<string, unknown>, "current"),
         total: getNestedNumber(obj.swap as Record<string, unknown>, "total"),
      },
      disk: {
         current: getNestedNumber(obj.disk as Record<string, unknown>, "current"),
         total: getNestedNumber(obj.disk as Record<string, unknown>, "total"),
      },
      xray: {
         state: getNestedString(obj.xray as Record<string, unknown>, "state"),
         errorMsg: getNestedString(obj.xray as Record<string, unknown>, "errorMsg"),
         version: getNestedString(obj.xray as Record<string, unknown>, "version"),
      },
      uptime: Number(obj.uptime ?? 0),
      loads: Array.isArray(obj.loads) ? (obj.loads as unknown[]).map((v) => Number(v)) : [],
      tcpCount: Number(obj.tcpCount ?? 0),
      udpCount: Number(obj.udpCount ?? 0),
      netIO: {
         up: getNestedNumber(obj.netIO as Record<string, unknown>, "up"),
         down: getNestedNumber(obj.netIO as Record<string, unknown>, "down"),
      },
      netTraffic: {
         sent: getNestedNumber(obj.netTraffic as Record<string, unknown>, "sent"),
         recv: getNestedNumber(obj.netTraffic as Record<string, unknown>, "recv"),
      },
      publicIP: {
         ipv4: getNestedString(obj.publicIP as Record<string, unknown>, "ipv4"),
         ipv6: getNestedString(obj.publicIP as Record<string, unknown>, "ipv6"),
      },
      appStats: {
         threads: getNestedNumber(obj.appStats as Record<string, unknown>, "threads"),
         mem: getNestedNumber(obj.appStats as Record<string, unknown>, "mem"),
         uptime: getNestedNumber(obj.appStats as Record<string, unknown>, "uptime"),
      },
   };
}

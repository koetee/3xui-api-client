import { Api, type Client, type Server } from "./xtls-sdk";

/**
 * Formats a number of bytes into a human-readable string.
 * @param bytes - The number of bytes.
 * @returns The formatted string.
 */
function formatBytes(bytes: number): string {
   const units = ["B", "KB", "MB", "GB", "TB"];
   let value = bytes;
   let index = 0;
   while (value >= 1024 && index < units.length - 1) {
      value /= 1024;
      index++;
   }
   return `${value.toFixed(2)} ${units[index]}`;
}

/**
 * Formats a number of seconds into a human-readable uptime string.
 * @param seconds - The number of seconds.
 * @returns The formatted uptime string.
 */
function formatUptime(seconds: number): string {
   const days = Math.floor(seconds / 86400);
   const hours = Math.floor((seconds % 86400) / 3600);
   const minutes = Math.floor((seconds % 3600) / 60);
   const secs = Math.floor(seconds % 60);
   return `${days}d ${hours}h ${minutes}m ${secs}s`;
}

/**
 * Logs detailed server status information.
 * @param status - The server status object.
 */
function logServerStatus(status: Server): void {
   console.log(`Server Status:
 CPU: ${status.cpu.toFixed(2)}% (Speed: ${status.cpuSpeedMhz.toFixed(2)} MHz, Cores: ${status.cpuCores}, Logical Processors: ${status.logicalPro})
 Memory: ${formatBytes(status.mem.current)} / ${formatBytes(status.mem.total)}
 Swap: ${formatBytes(status.swap.current)} / ${formatBytes(status.swap.total)}
 Disk: ${formatBytes(status.disk.current)} / ${formatBytes(status.disk.total)}
 Uptime: ${formatUptime(status.uptime)}
 Xray: ${status.xray.state} (v${status.xray.version})${status.xray.errorMsg ? ' - Error: ' + status.xray.errorMsg : ''}
 Network I/O: Up: ${formatBytes(status.netIO.up)}, Down: ${formatBytes(status.netIO.down)}
 Network Traffic: Sent: ${formatBytes(status.netTraffic.sent)}, Received: ${formatBytes(status.netTraffic.recv)}
 Public IP: IPv4: ${status.publicIP.ipv4}, IPv6: ${status.publicIP.ipv6}
 App Stats: Threads: ${status.appStats.threads}, Memory: ${formatBytes(status.appStats.mem)}, Uptime: ${formatUptime(status.appStats.uptime)}
 Loads: ${status.loads.map((load: number) => load.toFixed(2)).join(', ')}
 TCP/UDP: TCP: ${status.tcpCount}, UDP: ${status.udpCount}
 `);
}

async function main() {
   const api = Api.fromEnv();
   await api.login();

   // Get server status
   const status = await api.server.getStatus();
   logServerStatus(status);
   // console.log(`CPU: ${status.cpu.toFixed(2)}%, \nMemory: ${formatBytes(status.mem.current)} / ${formatBytes(status.mem.total)}`);

   const clientEmail = "7ddcquz8";

   // const client = await api.client.getByEmail(clientEmail);
   await api.client.getTrafficById(`1`);
   // console.log(client);
   // await getClientDetails(clientEmail);

   const inbound = await api.inbound.getById(2);
   console.log(`Inbound: ${inbound.remark}, Протокол: ${inbound.protocol}, Порт: ${inbound.port}`);
}

main().catch(console.error);

export { Api };

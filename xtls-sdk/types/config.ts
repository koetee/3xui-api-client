/** Configuration options for the API client. */
export interface ApiConfig {
   /** Base URL of the 3x-ui host (e.g., "https://xui.example.com"). */
   readonly host: string;
   /** Username for authentication. */
   readonly username: string;
   /** Password for authentication. */
   readonly password: string;
   /** Optional secret token for additional security. */
   readonly token?: string;
   /** Whether to verify the server's TLS certificate. Defaults to true. */
   readonly useTlsVerify?: boolean;
   /** Path to a custom TLS certificate file, if applicable. */
   readonly customCertificatePath?: string;
   /** Maximum number of retries for failed requests. Defaults to 3. */
   readonly maxRetries?: number;
}
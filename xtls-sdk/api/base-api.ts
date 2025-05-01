import axios, { type AxiosInstance } from "axios";
import axiosRetry from "axios-retry";
import https from "https";
import qs from "qs";
import { type ApiResponse } from "../types/api-response";
import { type ApiConfig } from "../types/config";

/** Base class for making HTTP requests to the 3x-ui API. */
export class BaseApi {
   private readonly axiosInstance: AxiosInstance;
   private sessionCookie: { name: string; value: string } | null = null;
   private readonly config: ApiConfig;

   /**
    * Initializes the base API with configuration.
    * @param config - Configuration options for the API client.
    */
   constructor(config: ApiConfig) {
      this.config = {
         useTlsVerify: true,
         maxRetries: 3,
         ...config,
      };
      const httpsAgent = new https.Agent({
         rejectUnauthorized: this.config.useTlsVerify,
         // TODO: Implement custom certificate loading if customCertificatePath is provided
      });
      this.axiosInstance = axios.create({
         baseURL: this.config.host,
         httpsAgent,
         headers: { "Content-Type": "application/x-www-form-urlencoded" },
      });
      axiosRetry(this.axiosInstance, {
         retries: this.config.maxRetries,
         retryDelay: (retryCount) => retryCount * 1000,
      });
   }

   /** Performs the login operation and sets the session cookie. */
   async login(): Promise<void> {
      const data = {
         username: this.config.username,
         password: this.config.password,
         ...(this.config.token ? { loginSecret: this.config.token } : {}),
      };
      const response = await this.axiosInstance.post<ApiResponse>("login", qs.stringify(data));
      this.checkResponse(response.data);
      this.extractSessionCookie(response.headers["set-cookie"]);
   }

   /** Makes a POST request to the specified endpoint. */
   async post<T>(endpoint: string, data: Record<string, unknown>): Promise<ApiResponse<T>> {
      this.ensureAuthenticated();
      const headers = this.getAuthHeaders();
      const response = await this.axiosInstance.post<ApiResponse<T>>(
         endpoint,
         qs.stringify(data),
         { headers }
      );
      this.checkResponse(response.data);
      return response.data;
   }

   /** Makes a GET request to the specified endpoint. */
   async get<T>(endpoint: string): Promise<ApiResponse<T>> {
      this.ensureAuthenticated();
      const headers = this.getAuthHeaders();
      const response = await this.axiosInstance.get<ApiResponse<T>>(endpoint, { headers });
      this.checkResponse(response.data);
      return response.data;
   }

   /** Makes a GET request returning raw binary data. */
   async getBinary(endpoint: string): Promise<Buffer> {
      this.ensureAuthenticated();
      const headers = this.getAuthHeaders();
      const response = await this.axiosInstance.get(endpoint, {
         headers,
         responseType: "arraybuffer",
      });
      return Buffer.from(response.data);
   }

   private extractSessionCookie(setCookie?: string[]): void {
      const COOKIE_NAMES = ["session", "3x-ui"];
      if (!setCookie) throw new Error("No session cookie received");
      for (const cookieStr of setCookie) {
         for (const name of COOKIE_NAMES) {
            if (cookieStr.startsWith(`${name}=`)) {
               this.sessionCookie = { name, value: cookieStr.split(";")[0].split("=")[1] };
               return;
            }
         }
      }
      throw new Error("Session cookie not found in response");
   }

   private getAuthHeaders(): Record<string, string> {
      return this.sessionCookie
         ? { Cookie: `${this.sessionCookie.name}=${this.sessionCookie.value}` }
         : {};
   }

   private ensureAuthenticated(): void {
      if (!this.sessionCookie) throw new Error("Not authenticated. Call login() first.");
   }

   private checkResponse<T>(response: ApiResponse<T>): void {
      if (!response.success) throw new Error(`API error: ${response.msg}`);
   }
}
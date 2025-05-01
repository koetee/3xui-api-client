import { BaseApi } from "./base-api";
import { ClientApi } from "./client-api";
import { InboundApi } from "./inbound-api";
import { DatabaseApi } from "./database-api";
import { ServerApi } from "./server-api";
import { type ApiConfig } from "../types/config";

/** Main entry point for interacting with the 3x-ui API. */
export class Api {
  private readonly baseApi: BaseApi;
  public readonly client: ClientApi;
  public readonly inbound: InboundApi;
  public readonly database: DatabaseApi;
  public readonly server: ServerApi;

  /**
   * Initializes the API client with configuration.
   * @param config - Configuration options for the API client.
   */
  constructor(config: ApiConfig) {
    this.baseApi = new BaseApi(config);
    this.client = new ClientApi(this.baseApi);
    this.inbound = new InboundApi(this.baseApi);
    this.database = new DatabaseApi(this.baseApi);
    this.server = new ServerApi(this.baseApi);
  }

  /** Authenticates with the 3x-ui API. */
  async login(): Promise<void> {
    await this.baseApi.login();
  }

  /**
   * Creates an API instance from environment variables.
   * Expected variables: XUI_HOST, XUI_USERNAME, XUI_PASSWORD, XUI_TOKEN (optional).
   */
  static fromEnv(): Api {
    const host = process.env.XUI_HOST ?? "";
    const username = process.env.XUI_USERNAME ?? "";
    const password = process.env.XUI_PASSWORD ?? "";
    const token = process.env.XUI_TOKEN;
    if (!host || !username || !password) {
      throw new Error("Missing required environment variables: XUI_HOST, XUI_USERNAME, XUI_PASSWORD");
    }
    return new Api({ host, username, password, token });
  }
}
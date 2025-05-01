/** Standard response structure from the 3x-ui API. */
export interface ApiResponse<T = unknown> {
   /** Indicates if the request was successful. */
   readonly success: boolean;
   /** Message describing the result or error. */
   readonly msg: string;
   /** Response data, if any. */
   readonly obj?: T;
}
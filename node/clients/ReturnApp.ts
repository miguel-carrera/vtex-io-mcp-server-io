import type { InstanceOptions, IOContext } from '@vtex/api'
import { AppClient } from '@vtex/api'

import type { ReturnRequest, ReturnRequestPayload } from '../types/return'

/*
 * Client for interacting with the VTEX Return App
 */
export class ReturnApp extends AppClient {
  private readonly baseURL: string

  constructor(ctx: IOContext, options?: InstanceOptions) {
    super('vtex.return-app@3.x', ctx, {
      ...options,
      headers: {
        VtexIdClientAutCookie:
          ctx.adminUserAuthToken ?? ctx.storeUserAuthToken ?? '',
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
    })

    this.baseURL = `http://${this.context.workspace}--${this.context.account}.myvtex.com`
  }

  /**
   * Creates a new return request
   * @param returnRequest The return request data
   * @returns Promise with the created return request
   * @throws Error if the request fails
   */
  public async createReturn(
    returnRequest: ReturnRequest
  ): Promise<ReturnRequest> {
    return this.http.post<ReturnRequest>(
      `${this.baseURL}/_v/return-request`,
      returnRequest
    )
  }

  /**
   * Retrieves a return request by order ID
   * @param orderId The ID of the order
   * @returns Promise with the return request
   * @throws Error if the request fails
   */
  public async getReturnRequestByOrderId(
    orderId: string
  ): Promise<{ list: ReturnRequest[] }> {
    return this.http.get<{ list: ReturnRequest[] }>(
      `${this.baseURL}/_v/return-request?_orderId=${orderId}`
    )
  }

  /**
   * Retrieves a return request by ID
   * @param requestId The ID of the return request
   * @returns Promise with the return request
   * @throws Error if the request fails
   */
  public async getRequest(requestId: string): Promise<ReturnRequest> {
    return this.http.get<ReturnRequest>(
      `${this.baseURL}/_v/return-request/${requestId}`
    )
  }

  /**
   * Updates the status of a return request
   * @param requestId The ID of the return request
   * @param requestStatus The new status and optional comment
   * @returns Promise with the updated return request
   * @throws Error if the request fails
   */
  public async updateRequestStatus(
    requestId: string,
    requestStatus: ReturnRequestPayload
  ): Promise<ReturnRequest> {
    return this.http.put<ReturnRequest>(
      `${this.baseURL}/_v/return-request/${requestId}`,
      requestStatus
    )
  }
}

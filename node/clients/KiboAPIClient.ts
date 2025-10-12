import type { InstanceOptions, IOContext } from '@vtex/api'
import { Apps, ExternalClient } from '@vtex/api'
import type {
  KiboAppSettings,
  KiboOrder,
  KiboReturnOrder,
  KiboReturnOrderActions,
  KiboReturnResponse,
  KiboShipment,
  KiboTokenResponse,
  ReturnOrder,
} from 'types/kibo'

export const KiboReturnType = {
  REFUND: 'Refund',
} as const

type KiboOrderResponse = KiboOrder

/**
 * KiboAPIClient is a client for interacting with the Kibo API.
 * It extends the ExternalClient and provides methods to manage
 * orders, shipments, and return orders within the Kibo platform.
 *
 * The client handles authentication by caching tokens and fetching
 * new ones when necessary. It also processes order data to create
 * payloads for API requests, ensuring the correct format and
 * calculations for totals and item details.
 */
export default class KiboAPIClient extends ExternalClient {
  private settings: KiboAppSettings | null = null
  protected tokenCache: {
    token: string
    expiresAt: number
  } | null = null

  constructor(context: IOContext, options?: InstanceOptions) {
    super('', context, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
      },
    })
  }

  /**
   * Retrieves and caches Kibo app settings.
   * @returns Kibo app settings
   * @throws Error if VTEX_APP_ID environment variable is not set or if Kibo app settings are invalid
   */
  protected async getKiboAppSettings(): Promise<KiboAppSettings> {
    if (this.settings) {
      return this.settings
    }

    const app = new Apps(this.context)
    const appId = process.env.VTEX_APP_ID

    if (!appId) {
      throw new Error('VTEX_APP_ID environment variable is not set')
    }

    const settings = await app.getAppSettings(appId)

    if (!settings?.appCreds) {
      throw new Error('Invalid Kibo app settings configuration')
    }

    this.settings = settings as KiboAppSettings

    return this.settings
  }

  /**
   * Retrieves a cached token if it exists and is still valid.
   * If the token is not cached or has expired, it fetches a new token.
   * @returns The cached or newly fetched token
   */
  protected async getCachedToken(): Promise<string> {
    if (this.tokenCache && Date.now() < this.tokenCache.expiresAt) {
      return this.tokenCache.token
    }

    const settings = await this.getKiboAppSettings()
    const token = await this.fetchKiboToken(settings)

    // Cache the token for 55 minutes (Kibo tokens typically expire in 1 hour)
    this.tokenCache = {
      token,
      expiresAt: Date.now() + 55 * 60 * 1000,
    }

    return token
  }

  /**
   * Fetches a new token from the Kibo API.
   * @param settings Kibo app settings
   * @returns The newly fetched token
   */
  protected async fetchKiboToken(settings: KiboAppSettings): Promise<string> {
    const {
      kiboSiteId: siteID,
      kiboTenantId: tenantID,
      kiboURL: domain,
    } = settings.appCreds

    const url = this.constructApiUrl(
      tenantID,
      domain,
      'platform/applications/authtickets/oauth'
    )

    const requestBody = {
      grant_type: settings.appCreds.grantypeKibo,
      client_id: settings.appCreds.kiboClientId,
      client_secret: settings.appCreds.kiboClientSecretId,
    }

    const response = await this.http.post<KiboTokenResponse>(url, requestBody, {
      headers: {
        'x-vol-site': siteID,
        'x-vol-tenant': tenantID,
        'x-vtex-use-https': true,
      },
    })

    if (!response.access_token) {
      throw new Error('Failed to retrieve access token from Kibo API')
    }

    return response.access_token
  }

  /**
   * Constructs a Kibo API URL with the given tenant ID and endpoint path
   * @param tenantID The Kibo tenant ID
   * @param domain The Kibo domain
   * @param endpointPath The API endpoint path
   * @returns The complete API URL
   */
  private constructApiUrl(
    tenantID: string,
    domain: string,
    endpointPath: string
  ): string {
    return `http://t${tenantID}.${domain}/api/${endpointPath}`
  }

  /**
   * Retrieves a shipment by order ID from Kibo.
   * @param orderId The ID of the order to retrieve the shipment for
   * @returns The retrieved shipment
   */
  public async getShipmentByOrderId(orderId: string): Promise<KiboShipment[]> {
    const settings = await this.getKiboAppSettings()
    const token = await this.getCachedToken()
    const {
      kiboSiteId: siteID,
      kiboTenantId: tenantID,
      kiboURL: domain,
    } = settings.appCreds

    const apiUrl = this.constructApiUrl(
      tenantID,
      domain,
      `commerce/shipments?filter=orderId==${orderId}`
    )

    const response = await this.http.get<{
      _embedded: { shipments: KiboShipment[] }
    }>(apiUrl, {
      headers: {
        'x-vol-site': siteID,
        'x-vol-tenant': tenantID,
        'x-vtex-use-https': true,
        authorization: `Bearer ${token}`,
      },
    })

    return response._embedded.shipments
  }

  /**
   * Retrieves a shipment by external order ID from Kibo.
   * @param externalOrderId The external order ID to retrieve the shipments for
   * @returns The retrieved shipments
   */
  public async getShipmentByExternalOrderId(
    externalOrderId: string
  ): Promise<KiboShipment[]> {
    const settings = await this.getKiboAppSettings()
    const token = await this.getCachedToken()
    const {
      kiboSiteId: siteID,
      kiboTenantId: tenantID,
      kiboURL: domain,
    } = settings.appCreds

    const apiUrl = this.constructApiUrl(
      tenantID,
      domain,
      `commerce/shipments?filter=externalOrderId==${externalOrderId}`
    )

    const response = await this.http.get<{
      _embedded: { shipments: KiboShipment[] }
    }>(apiUrl, {
      headers: {
        'x-vol-site': siteID,
        'x-vol-tenant': tenantID,
        'x-vtex-use-https': true,
        authorization: `Bearer ${token}`,
      },
    })

    return response._embedded.shipments
  }

  /**
   * Retrieves an order by external ID from Kibo.
   * @param externalId The external ID of the order to retrieve
   * @returns The retrieved order
   */
  public async getOrderByExternalId(
    externalId: string
  ): Promise<KiboOrderResponse> {
    const settings = await this.getKiboAppSettings()
    const token = await this.getCachedToken()
    const {
      kiboSiteId: siteID,
      kiboTenantId: tenantID,
      kiboURL: domain,
    } = settings.appCreds

    const apiUrl = this.constructApiUrl(
      tenantID,
      domain,
      `commerce/orders?filter=externalId eq '${externalId}'`
    )

    const response = await this.http.get<{ items: KiboOrderResponse[] }>(
      apiUrl,
      {
        headers: {
          'x-vol-site': siteID,
          'x-vol-tenant': tenantID,
          'x-vtex-use-https': true,
          authorization: `Bearer ${token}`,
        },
      }
    )

    return response.items[0]
  }

  /**
   * Retrieves an order by ID from Kibo.
   * @param orderId The ID of the order to retrieve
   * @returns The retrieved order
   */
  public async getOrder(orderId: string): Promise<KiboOrderResponse> {
    const settings = await this.getKiboAppSettings()
    const token = await this.getCachedToken()
    const {
      kiboSiteId: siteID,
      kiboTenantId: tenantID,
      kiboURL: domain,
    } = settings.appCreds

    const apiUrl = this.constructApiUrl(
      tenantID,
      domain,
      `commerce/orders/${orderId}`
    )

    const response = await this.http.get<KiboOrderResponse>(apiUrl, {
      headers: {
        'x-vol-site': siteID,
        'x-vol-tenant': tenantID,
        'x-vtex-use-https': true,
        authorization: `Bearer ${token}`,
      },
    })

    return response
  }

  /**
   * Retrieves a shipment by ID from Kibo.
   * @param shipmentId The ID of the shipment to retrieve
   * @returns The retrieved shipment
   */
  public async getShipmentById(shipmentId: string): Promise<KiboShipment> {
    const settings = await this.getKiboAppSettings()
    const token = await this.getCachedToken()
    const {
      kiboSiteId: siteID,
      kiboTenantId: tenantID,
      kiboURL: domain,
    } = settings.appCreds

    const apiUrl = this.constructApiUrl(
      tenantID,
      domain,
      `commerce/shipments/${shipmentId}`
    )

    const response = await this.http.get(apiUrl, {
      headers: {
        'x-vol-site': siteID,
        'x-vol-tenant': tenantID,
        'x-vtex-use-https': true,
        authorization: `Bearer ${token}`,
      },
    })

    return response
  }

  /**
   * Retrieves a return by ID from Kibo.
   * @param returnId The ID of the return to retrieve
   * @returns The retrieved return
   */
  public async getReturn(returnId: string): Promise<KiboReturnOrder> {
    const settings = await this.getKiboAppSettings()
    const token = await this.getCachedToken()
    const {
      kiboSiteId: siteID,
      kiboTenantId: tenantID,
      kiboURL: domain,
    } = settings.appCreds

    const apiUrl = this.constructApiUrl(
      tenantID,
      domain,
      `commerce/returns/${returnId}`
    )

    const response = await this.http.get<KiboReturnOrder>(apiUrl, {
      headers: {
        'x-vol-site': siteID,
        'x-vol-tenant': tenantID,
        'x-vtex-use-https': true,
        authorization: `Bearer ${token}`,
      },
    })

    return response
  }

  /**
   * Retrieves a return by ID from Kibo.
   * @param returnId The ID of the return to retrieve
   * @returns The retrieved return
   */
  public async getReturnsByExternalId(
    externalId: string
  ): Promise<KiboReturnResponse> {
    const settings = await this.getKiboAppSettings()
    const token = await this.getCachedToken()
    const {
      kiboSiteId: siteID,
      kiboTenantId: tenantID,
      kiboURL: domain,
    } = settings.appCreds

    const apiUrl = this.constructApiUrl(
      tenantID,
      domain,
      `commerce/returns?filter=ExternalId eq ${externalId}`
    )

    const response = await this.http.get<KiboReturnResponse>(apiUrl, {
      headers: {
        'x-vol-site': siteID,
        'x-vol-tenant': tenantID,
        'x-vtex-use-https': true,
        authorization: `Bearer ${token}`,
      },
    })

    return response
  }

  /**
   * Retrieves a return by ID from Kibo.
   * @param returnId The ID of the return to retrieve
   * @returns The retrieved return
   */
  public async getReturnsByOrderId(
    orderId: string
  ): Promise<KiboReturnResponse> {
    const settings = await this.getKiboAppSettings()
    const token = await this.getCachedToken()
    const {
      kiboSiteId: siteID,
      kiboTenantId: tenantID,
      kiboURL: domain,
    } = settings.appCreds

    const apiUrl = this.constructApiUrl(
      tenantID,
      domain,
      `commerce/returns?filter=originalOrderId eq ${orderId}`
    )

    const response = await this.http.get<KiboReturnResponse>(apiUrl, {
      headers: {
        'x-vol-site': siteID,
        'x-vol-tenant': tenantID,
        'x-vtex-use-https': true,
        authorization: `Bearer ${token}`,
      },
    })

    return response
  }

  /**
   * Creates a return order in Kibo.
   * @param returnOrderData The return order data to create
   * @returns The created return order
   */
  public async createReturnOrder(
    returnOrderData: ReturnOrder
  ): Promise<KiboReturnOrder> {
    const settings = await this.getKiboAppSettings()
    const token = await this.getCachedToken()
    const {
      kiboSiteId: siteID,
      kiboTenantId: tenantID,
      kiboURL: domain,
    } = settings.appCreds

    const apiUrl = this.constructApiUrl(tenantID, domain, 'commerce/returns')

    const response = await this.http.post<KiboReturnOrder>(
      apiUrl,
      returnOrderData,
      {
        headers: {
          'x-vol-site': siteID,
          'x-vol-tenant': tenantID,
          'x-vtex-use-https': true,
          authorization: `Bearer ${token}`,
        },
      }
    )

    return response
  }

  /**
   * Updates a return order in Kibo.
   * @param returnId The ID of the return to update
   * @param returnStatus The status to update the return to
   * @returns The updated return order
   */
  public async updateReturnOrder(
    returnId: string,
    returnOrderData: any
  ): Promise<KiboReturnOrder> {
    const settings = await this.getKiboAppSettings()
    const token = await this.getCachedToken()
    const {
      kiboSiteId: siteID,
      kiboTenantId: tenantID,
      kiboURL: domain,
    } = settings.appCreds

    const apiUrl = this.constructApiUrl(
      tenantID,
      domain,
      `commerce/returns/${returnId}`
    )

    const response = await this.http.put<KiboReturnOrder>(
      apiUrl,
      returnOrderData,
      {
        headers: {
          'x-vol-site': siteID,
          'x-vol-tenant': tenantID,
          'x-vtex-use-https': true,
          authorization: `Bearer ${token}`,
        },
      }
    )

    return response
  }

  /**
   * Updates a return order in Kibo.
   * @param returnId The ID of the return to update
   * @param returnStatus The status to update the return to
   * @returns The updated return order
   */
  public async performReturnOrderAction(
    returnId: string,
    returnStatus: typeof KiboReturnOrderActions[keyof typeof KiboReturnOrderActions]
  ): Promise<KiboReturnOrder> {
    const settings = await this.getKiboAppSettings()
    const token = await this.getCachedToken()
    const {
      kiboSiteId: siteID,
      kiboTenantId: tenantID,
      kiboURL: domain,
    } = settings.appCreds

    const apiUrl = this.constructApiUrl(
      tenantID,
      domain,
      `commerce/returns/actions`
    )

    const response = await this.http.post<KiboReturnOrder>(
      apiUrl,
      {
        actionName: returnStatus,
        returnIds: [returnId],
      },
      {
        headers: {
          'x-vol-site': siteID,
          'x-vol-tenant': tenantID,
          'x-vtex-use-https': true,
          authorization: `Bearer ${token}`,
        },
      }
    )

    return response
  }
}

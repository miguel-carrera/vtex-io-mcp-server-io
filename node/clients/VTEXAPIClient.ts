import type { InstanceOptions, IOContext } from '@vtex/api'
import { JanusClient } from '@vtex/api'

export interface VTEXAPIClientOptions {
  baseURL?: string
  timeout?: number
  retries?: number
}

export interface APIRequestConfig {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS'
  path: string
  headers?: Record<string, string>
  query?: Record<string, any>
  body?: any
  timeout?: number
}

export class VTEXAPIClient extends JanusClient {
  private customBaseURL?: string

  constructor(
    ctx: IOContext,
    options?: InstanceOptions & VTEXAPIClientOptions
  ) {
    super(ctx, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...options?.headers,
      },
    })

    this.customBaseURL = options?.baseURL
  }

  /**
   * Execute a dynamic API request
   */
  public async executeRequest<T = any>(config: APIRequestConfig): Promise<T> {
    const {
      method,
      path,
      headers = {},
      query,
      body,
      timeout = this.options?.timeout || 10000,
    } = config

    // Build the full URL
    const baseURL = this.customBaseURL || this.getBaseURL()
    const url = this.buildURL(baseURL, path)

    // Prepare headers with authentication and mandatory headers
    const requestHeaders = {
      Accept: '*/*',
      'Content-Type': 'application/json',
      ...this.getAuthHeaders(),
      ...headers,
    }

    // Prepare request options
    const requestOptions: any = {
      method,
      headers: requestHeaders,
      timeout,
      metric: `vtex-api-${method.toLowerCase()}`,
    }

    // Add query parameters if provided
    if (query && Object.keys(query).length > 0) {
      requestOptions.params = query
    }

    // Add body for POST, PUT, PATCH requests
    if (body && ['POST', 'PUT', 'PATCH'].includes(method)) {
      requestOptions.data = body
    }

    // Use the appropriate HTTP method based on the request method
    switch (method) {
      case 'GET':
        return this.http.get(url, requestOptions)

      case 'POST':
        return this.http.post(url, requestOptions.data, requestOptions)

      case 'PUT':
        return this.http.put(url, requestOptions.data, requestOptions)

      case 'PATCH':
        return this.http.patch(url, requestOptions.data, requestOptions)

      case 'DELETE':
        // Force return type to 'any' to avoid type error with IOResponse<void>
        return this.http.delete(url, requestOptions) as any

      case 'HEAD':
        // Force return type to 'any' to avoid type error with IOResponse<void>
        return this.http.head(url, requestOptions) as any

      case 'OPTIONS':
        // OPTIONS method not available in VTEX HttpClient, use GET as fallback
        return this.http.get(url, requestOptions)

      default:
        throw new Error(`Unsupported HTTP method: ${method}`)
    }
  }

  /**
   * Get authentication headers based on context
   */
  private getAuthHeaders(): Record<string, string> {
    const headers: Record<string, string> = {}

    // Use admin token if available, otherwise use regular auth token
    if (this.context.adminUserAuthToken) {
      headers.VtexIdClientAutCookie = this.context.adminUserAuthToken
    } else if (this.context.authToken) {
      headers.VtexIdClientAutCookie = this.context.authToken
    }

    // Add account and workspace headers
    headers['X-VTEX-API-AccountName'] = this.context.account
    headers['X-VTEX-API-Workspace'] = this.context.workspace

    return headers
  }

  /**
   * Get the base URL for the request
   */
  private getBaseURL(): string {
    // Default to the current account's API
    return `https://${this.context.account}.vtexcommercestable.com.br`
  }

  /**
   * Build the complete URL from base URL and path
   */
  private buildURL(_baseURL: string, path: string): string {
    // Ensure path starts with /
    const normalizedPath = path.startsWith('/') ? path : `/${path}`

    // For VTEX IO, we need to return only the path (relative URL)
    // The baseURL is used for configuration but not in the actual HTTP request
    return normalizedPath
  }

  /**
   * Convenience method for GET requests
   */
  public async get<T = any>(
    path: string,
    query?: Record<string, any>,
    headers?: Record<string, string>
  ): Promise<T> {
    return this.executeRequest<T>({
      method: 'GET',
      path,
      query,
      headers,
    })
  }

  /**
   * Convenience method for POST requests
   */
  public async post<T = any>(
    path: string,
    body?: any,
    query?: Record<string, any>,
    headers?: Record<string, string>
  ): Promise<T> {
    return this.executeRequest<T>({
      method: 'POST',
      path,
      body,
      query,
      headers,
    })
  }

  /**
   * Convenience method for PUT requests
   */
  public async put<T = any>(
    path: string,
    body?: any,
    query?: Record<string, any>,
    headers?: Record<string, string>
  ): Promise<T> {
    return this.executeRequest<T>({
      method: 'PUT',
      path,
      body,
      query,
      headers,
    })
  }

  /**
   * Convenience method for PATCH requests
   */
  public async patch<T = any>(
    path: string,
    body?: any,
    query?: Record<string, any>,
    headers?: Record<string, string>
  ): Promise<T> {
    return this.executeRequest<T>({
      method: 'PATCH',
      path,
      body,
      query,
      headers,
    })
  }

  /**
   * Convenience method for DELETE requests
   */
  public async delete<T = any>(
    path: string,
    query?: Record<string, any>,
    headers?: Record<string, string>
  ): Promise<T> {
    return this.executeRequest<T>({
      method: 'DELETE',
      path,
      query,
      headers,
    })
  }
}

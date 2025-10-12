import type { InstanceOptions, IOContext } from '@vtex/api'
import { ExternalClient } from '@vtex/api'

import type { OpenAPISpec } from '../types/openapi'

/**
 * OpenAPIClient is a client for fetching OpenAPI specifications from external URLs.
 * It extends the ExternalClient and provides methods to retrieve and validate
 * OpenAPI 3.0 specifications from remote endpoints.
 *
 * The client handles HTTP requests with proper error handling and validation
 * to ensure the fetched content is a valid OpenAPI specification.
 */
export default class OpenAPIClient extends ExternalClient {
  constructor(context: IOContext, options?: InstanceOptions) {
    super('', context, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json, application/yaml, text/yaml',
        'User-Agent': 'VTEX-IO-MCP-Server/1.0',
      },
      timeout: 30000, // 30 seconds timeout
    })
  }

  /**
   * Fetches an OpenAPI specification from a remote URL.
   * @param specUrl The URL to fetch the OpenAPI specification from
   * @returns The parsed OpenAPI specification
   * @throws Error if the URL is invalid, request fails, or spec is invalid
   */
  public async fetchSpecFromUrl(specUrl: string): Promise<OpenAPISpec> {
    try {
      // Validate URL format
      this.validateUrl(specUrl)

      // Fetch the specification
      const response = await this.http.get(specUrl, {
        headers: {
          Accept: 'application/json, application/yaml, text/yaml',
          'User-Agent': 'VTEX-IO-MCP-Server/1.0',
        },
        timeout: 30000,
      })

      // Validate that it's a valid OpenAPI spec
      this.validateOpenAPISpec(response)

      return response as OpenAPISpec
    } catch (error) {
      // Log the error for debugging
      this.context.logger.error({
        error,
        data: { specUrl },
        message: `Failed to fetch OpenAPI specification from URL: ${specUrl}`,
      })

      throw new Error(
        `Failed to fetch specification from ${specUrl}: ${error.message}`
      )
    }
  }

  /**
   * Validates that a URL is properly formatted and uses a supported protocol.
   * @param url The URL to validate
   * @throws Error if the URL is invalid
   */
  private validateUrl(url: string): void {
    if (!url || typeof url !== 'string') {
      throw new Error('URL must be a non-empty string')
    }

    try {
      const parsedUrl = new URL(url)

      // Only allow HTTP and HTTPS protocols
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        throw new Error('URL must use HTTP or HTTPS protocol')
      }

      // Ensure the URL has a valid hostname
      if (!parsedUrl.hostname) {
        throw new Error('URL must have a valid hostname')
      }
    } catch (error) {
      if (error instanceof TypeError) {
        throw new Error('Invalid URL format')
      }

      throw error
    }
  }

  /**
   * Validates that the fetched content is a valid OpenAPI 3.0 specification.
   * @param spec The specification object to validate
   * @throws Error if the specification is invalid
   */
  private validateOpenAPISpec(spec: any): void {
    if (!spec || typeof spec !== 'object') {
      throw new Error(
        'Invalid OpenAPI specification format: must be a JSON object'
      )
    }

    // Check for required OpenAPI 3.0 fields
    if (!spec.openapi || typeof spec.openapi !== 'string') {
      throw new Error(
        'Invalid OpenAPI specification: missing or invalid "openapi" field'
      )
    }

    if (!spec.info || typeof spec.info !== 'object') {
      throw new Error(
        'Invalid OpenAPI specification: missing or invalid "info" field'
      )
    }

    if (!spec.info.title || typeof spec.info.title !== 'string') {
      throw new Error(
        'Invalid OpenAPI specification: missing or invalid "info.title" field'
      )
    }

    if (!spec.info.version || typeof spec.info.version !== 'string') {
      throw new Error(
        'Invalid OpenAPI specification: missing or invalid "info.version" field'
      )
    }

    if (!spec.paths || typeof spec.paths !== 'object') {
      throw new Error(
        'Invalid OpenAPI specification: missing or invalid "paths" field'
      )
    }

    // Validate OpenAPI version (should be 3.x.x)
    const openApiVersion = spec.openapi

    if (!openApiVersion.startsWith('3.')) {
      throw new Error(
        `Unsupported OpenAPI version: ${openApiVersion}. Only OpenAPI 3.x.x is supported`
      )
    }

    // Basic validation of paths structure
    const { paths } = spec

    for (const [path, pathItem] of Object.entries(paths)) {
      if (typeof pathItem !== 'object' || pathItem === null) {
        throw new Error(
          `Invalid path item for path "${path}": must be an object`
        )
      }

      // Check for valid HTTP methods
      const validMethods = [
        'get',
        'post',
        'put',
        'patch',
        'delete',
        'head',
        'options',
      ]

      for (const [method, operation] of Object.entries(pathItem)) {
        if (validMethods.includes(method)) {
          if (typeof operation !== 'object' || operation === null) {
            throw new Error(
              `Invalid operation ${method.toUpperCase()} for path "${path}": must be an object`
            )
          }

          // Check for operationId (recommended but not required)
          if (
            operation.operationId &&
            typeof operation.operationId !== 'string'
          ) {
            throw new Error(
              `Invalid operationId for ${method.toUpperCase()} "${path}": must be a string`
            )
          }

          // Check for responses (required)
          if (!operation.responses || typeof operation.responses !== 'object') {
            throw new Error(
              `Missing responses for ${method.toUpperCase()} "${path}"`
            )
          }
        }
      }
    }
  }

  /**
   * Checks if a URL is accessible and returns a valid OpenAPI specification.
   * This is a lightweight check that doesn't fetch the full spec.
   * @param specUrl The URL to check
   * @returns Promise<boolean> indicating if the URL is accessible and returns valid OpenAPI
   */
  public async isAccessible(specUrl: string): Promise<boolean> {
    try {
      // Validate URL format
      this.validateUrl(specUrl)

      // Make a HEAD request to check if the URL is accessible
      await this.http.head(specUrl, {
        headers: {
          Accept: 'application/json, application/yaml, text/yaml',
          'User-Agent': 'VTEX-IO-MCP-Server/1.0',
        },
        timeout: 10000, // Shorter timeout for accessibility check
      })

      return true
    } catch (error) {
      this.context.logger.warn({
        error,
        data: { specUrl },
        message: `OpenAPI specification URL is not accessible: ${specUrl}`,
      })

      return false
    }
  }
}

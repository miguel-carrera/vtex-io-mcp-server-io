import type {
  OpenAPISpec,
  OpenAPIOperation,
  OpenAPIParameter,
  OpenAPIReference,
  ResolvedParameters,
} from '../types/openapi'
import type { VTEXAPIClient } from '../clients/VTEXAPIClient'

export interface APIExecutionContext {
  apiGroup: string
  operationId: string
  method: string
  path: string
  baseUrl?: string
  parameters: OpenAPIParameter[]
  requestBody?: any
  responses: any
}

export interface ExecuteAPIOptions {
  apiGroup: string
  operationId?: string
  method?: string
  path?: string
  pathParams?: Record<string, any>
  queryParams?: Record<string, any>
  headers?: Record<string, string>
  body?: any
}

export class APIExecutor {
  constructor(private vtexApiClient: VTEXAPIClient) {}

  /**
   * Execute an API operation based on OpenAPI specification
   */
  public async executeOperation(
    spec: OpenAPISpec,
    options: ExecuteAPIOptions
  ): Promise<{ data: any; metadata: any }> {
    const startTime = Date.now()

    try {
      // Resolve operation context either by operationId or by method+path
      let operation: OpenAPIOperation | null = null
      let resolvedMethod: string
      let resolvedPath: string

      if (options.operationId) {
        operation = this.findOperation(spec, options.operationId)

        if (!operation) {
          throw new Error(
            `Operation '${options.operationId}' not found in API specification`
          )
        }

        const mp = this.getMethodAndPath(spec, options.operationId)

        resolvedMethod = mp.method
        resolvedPath = mp.path
      } else if (options.method && options.path) {
        const mp = this.findOperationByPathAndMethod(
          spec,
          options.method,
          options.path
        )

        operation = mp.operation
        resolvedMethod = mp.method
        resolvedPath = mp.path
      } else {
        throw new Error('You must provide either operationId or method+path')
      }

      // Resolve parameters (path, query, headers)
      const resolvedParams = this.resolveParameters(
        operation.parameters || [],
        options.pathParams || {},
        options.queryParams || {},
        options.headers || {}
      )

      // Build the final path with resolved path parameters
      const finalPath = this.buildPath(resolvedPath, resolvedParams.pathParams)

      // Prepare request configuration
      const requestConfig = {
        method: resolvedMethod as any,
        path: finalPath,
        headers: resolvedParams.headers,
        query: resolvedParams.queryParams,
        body: options.body,
      }

      // Execute the request
      const response = await this.vtexApiClient.executeRequest(requestConfig)
      const executionTime = Date.now() - startTime

      // Extract response data and headers
      const data = response.data || response
      const responseHeaders = response.headers || {}
      const contentType =
        responseHeaders['content-type'] ||
        responseHeaders['Content-Type'] ||
        'application/json'

      return {
        data,
        metadata: {
          executionTime,
          apiGroup: options.apiGroup,
          operationId: options.operationId,
          method: resolvedMethod,
          path: finalPath,
          contentType,
          responseHeaders,
        },
      }
    } catch (error) {
      const executionTime = Date.now() - startTime

      throw {
        error: error.message || 'Unknown error',
        metadata: {
          executionTime,
          apiGroup: options.apiGroup,
          operationId: options.operationId,
        },
      }
    }
  }

  /**
   * Find an operation by operationId in the OpenAPI spec
   */
  private findOperation(
    spec: OpenAPISpec,
    operationId: string
  ): OpenAPIOperation | null {
    const targetId = operationId.toLowerCase()

    for (const [, pathItem] of Object.entries(spec.paths)) {
      const methods = [
        'get',
        'post',
        'put',
        'patch',
        'delete',
        'head',
        'options',
      ]

      for (const method of methods) {
        const operation = pathItem[
          method as keyof typeof pathItem
        ] as OpenAPIOperation

        if (
          operation &&
          operation.operationId &&
          operation.operationId.toLowerCase() === targetId
        ) {
          return operation
        }
      }
    }

    return null
  }

  /**
   * Get the HTTP method and path for an operation
   */
  private getMethodAndPath(
    spec: OpenAPISpec,
    operationId: string
  ): { method: string; path: string } {
    const targetId = operationId.toLowerCase()

    for (const [path, pathItem] of Object.entries(spec.paths)) {
      const methods = [
        'get',
        'post',
        'put',
        'patch',
        'delete',
        'head',
        'options',
      ]

      for (const method of methods) {
        const operation = pathItem[
          method as keyof typeof pathItem
        ] as OpenAPIOperation

        if (
          operation &&
          operation.operationId &&
          operation.operationId.toLowerCase() === targetId
        ) {
          return { method: method.toUpperCase(), path }
        }
      }
    }

    throw new Error(`Operation '${operationId}' not found in API specification`)
  }

  /**
   * Find an operation by explicit method and path from the spec
   */
  private findOperationByPathAndMethod(
    spec: OpenAPISpec,
    method: string,
    path: string
  ): { operation: OpenAPIOperation; method: string; path: string } {
    const normalizedMethod = method.toLowerCase()
    const pathItem = (spec.paths as any)[path]

    if (!pathItem) {
      throw new Error(`Path '${path}' not found in API specification`)
    }

    const operation = pathItem[normalizedMethod] as OpenAPIOperation | undefined

    if (!operation) {
      throw new Error(
        `Method '${method.toUpperCase()}' not available for path '${path}'`
      )
    }

    return { operation, method: method.toUpperCase(), path }
  }

  /**
   * Resolve parameters from OpenAPI spec and provided values
   */
  private resolveParameters(
    specParameters: Array<OpenAPIParameter | OpenAPIReference>,
    pathParams: Record<string, any>,
    queryParams: Record<string, any>,
    headers: Record<string, string>
  ): ResolvedParameters {
    const resolvedPathParams: Record<string, any> = {}
    const resolvedQueryParams: Record<string, any> = {}
    const resolvedHeaders: Record<string, string> = { ...headers }

    for (const param of specParameters) {
      // Skip reference parameters for now - in a full implementation, you'd resolve them
      if ('$ref' in param) {
        continue
      }

      const value = this.getParameterValue(
        param,
        pathParams,
        queryParams,
        headers
      )

      if (value !== undefined) {
        switch (param.in) {
          case 'path':
            resolvedPathParams[param.name] = value
            break

          case 'query':
            resolvedQueryParams[param.name] = value
            break

          case 'header':
            resolvedHeaders[param.name] = String(value)
            break

          default:
            // Skip unknown parameter types
            break
        }
      } else if (param.required) {
        // Skip validation for mandatory headers that are automatically added by VTEXAPIClient
        const mandatoryHeaders = ['Accept', 'Content-Type']

        if (param.in === 'header' && mandatoryHeaders.includes(param.name)) {
          continue
        }

        throw new Error(
          `Required parameter '${param.name}' (${param.in}) is missing`
        )
      }
    }

    // Add any additional query parameters not defined in the spec
    Object.assign(resolvedQueryParams, queryParams)

    return {
      pathParams: resolvedPathParams,
      queryParams: resolvedQueryParams,
      headers: resolvedHeaders,
    }
  }

  /**
   * Get parameter value from the appropriate source
   */
  private getParameterValue(
    param: OpenAPIParameter,
    pathParams: Record<string, any>,
    queryParams: Record<string, any>,
    headers: Record<string, string>
  ): any {
    switch (param.in) {
      case 'path':
        return pathParams[param.name]

      case 'query':
        return queryParams[param.name]

      case 'header':
        return headers[param.name]

      default:
        return undefined
    }
  }

  /**
   * Build the final path by replacing path parameters
   */
  private buildPath(path: string, pathParams: Record<string, any>): string {
    let finalPath = path

    for (const [key, value] of Object.entries(pathParams)) {
      const placeholder = `{${key}}`

      if (finalPath.includes(placeholder)) {
        finalPath = finalPath.replace(
          placeholder,
          encodeURIComponent(String(value))
        )
      }
    }

    // Check for any remaining unresolved path parameters
    const unresolvedParams = finalPath.match(/\{[^}]+\}/g)

    if (unresolvedParams) {
      throw new Error(
        `Unresolved path parameters: ${unresolvedParams.join(', ')}`
      )
    }

    return finalPath
  }

  /**
   * Validate request body against OpenAPI spec (basic validation)
   */
  public validateRequestBody(operation: OpenAPIOperation, body: any): boolean {
    if (!operation.requestBody) {
      return body === undefined || body === null
    }

    // Skip validation for reference request bodies
    if ('$ref' in operation.requestBody) {
      return true
    }

    if (
      operation.requestBody.required &&
      (body === undefined || body === null)
    ) {
      throw new Error('Request body is required for this operation')
    }

    // Basic validation - in a real implementation, you'd want more sophisticated validation
    return true
  }

  /**
   * Get operation summary for debugging/logging
   */
  public getOperationSummary(spec: OpenAPISpec, operationId: string): string {
    const operation = this.findOperation(spec, operationId)

    if (!operation) {
      return `Operation '${operationId}' not found`
    }

    const { method, path } = this.getMethodAndPath(spec, operationId)

    return `${method} ${path} - ${operation.summary || operationId}`
  }

  /**
   * List all available operations in a spec
   */
  public listOperations(spec: OpenAPISpec): Array<{
    operationId: string
    method: string
    path: string
    summary?: string
  }> {
    const operations: Array<{
      operationId: string
      method: string
      path: string
      summary?: string
    }> = []

    for (const [path, pathItem] of Object.entries(spec.paths)) {
      const methods = [
        'get',
        'post',
        'put',
        'patch',
        'delete',
        'head',
        'options',
      ]

      for (const method of methods) {
        const operation = pathItem[
          method as keyof typeof pathItem
        ] as OpenAPIOperation

        if (operation && operation.operationId) {
          operations.push({
            operationId: operation.operationId,
            method: method.toUpperCase(),
            path,
            summary: operation.summary,
          })
        }
      }
    }

    return operations
  }
}

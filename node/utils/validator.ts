import type { OpenAPISpec } from '../types/openapi'
import type { MCPExecuteApiRequest, MCPUploadSpecRequest } from '../types/mcp'

export class RequestValidator {
  /**
   * Validate MCP execute API request
   */
  public static validateExecuteApiRequest(request: any): MCPExecuteApiRequest {
    if (!request || typeof request !== 'object') {
      throw new Error('Request body must be a valid JSON object')
    }

    const { apiGroup, operationId, parameters, pathParams, queryParams, body } =
      request

    // Required fields
    if (!apiGroup || typeof apiGroup !== 'string') {
      throw new Error('apiGroup is required and must be a string')
    }

    if (!operationId || typeof operationId !== 'string') {
      throw new Error('operationId is required and must be a string')
    }

    // Optional fields validation
    if (
      parameters !== undefined &&
      (typeof parameters !== 'object' || parameters === null)
    ) {
      throw new Error('parameters must be an object if provided')
    }

    if (
      pathParams !== undefined &&
      (typeof pathParams !== 'object' || pathParams === null)
    ) {
      throw new Error('pathParams must be an object if provided')
    }

    if (
      queryParams !== undefined &&
      (typeof queryParams !== 'object' || queryParams === null)
    ) {
      throw new Error('queryParams must be an object if provided')
    }

    return {
      apiGroup,
      operationId,
      parameters,
      pathParams,
      queryParams,
      body,
    }
  }

  /**
   * Validate MCP upload spec request
   */
  public static validateUploadSpecRequest(request: any): MCPUploadSpecRequest {
    if (!request || typeof request !== 'object') {
      throw new Error('Request body must be a valid JSON object')
    }

    const { apiGroup, version, specUrl, enabled, description } = request

    // Required fields
    if (!apiGroup || typeof apiGroup !== 'string') {
      throw new Error('apiGroup is required and must be a string')
    }

    if (!version || typeof version !== 'string') {
      throw new Error('version is required and must be a string')
    }

    if (!specUrl || typeof specUrl !== 'string') {
      throw new Error('specUrl is required and must be a valid URL string')
    }

    // Validate URL format
    try {
      new URL(specUrl)
    } catch {
      throw new Error('specUrl must be a valid URL')
    }

    // Optional fields validation
    if (enabled !== undefined && typeof enabled !== 'boolean') {
      throw new Error('enabled must be a boolean if provided')
    }

    if (description !== undefined && typeof description !== 'string') {
      throw new Error('description must be a string if provided')
    }

    return {
      apiGroup,
      version,
      specUrl,
      enabled: enabled !== undefined ? enabled : true,
      description,
    }
  }

  /**
   * Validate OpenAPI 3.0 specification structure
   */
  public static validateOpenAPISpec(spec: any): OpenAPISpec {
    if (!spec || typeof spec !== 'object') {
      throw new Error('OpenAPI spec must be a valid object')
    }

    // Check required fields
    if (!spec.openapi || typeof spec.openapi !== 'string') {
      throw new Error(
        'OpenAPI spec must have an "openapi" field with version string'
      )
    }

    if (!spec.info || typeof spec.info !== 'object') {
      throw new Error('OpenAPI spec must have an "info" object')
    }

    if (!spec.info.title || typeof spec.info.title !== 'string') {
      throw new Error('OpenAPI spec info must have a "title" field')
    }

    if (!spec.info.version || typeof spec.info.version !== 'string') {
      throw new Error('OpenAPI spec info must have a "version" field')
    }

    if (!spec.paths || typeof spec.paths !== 'object') {
      throw new Error('OpenAPI spec must have a "paths" object')
    }

    // Validate paths structure
    for (const [path, pathItem] of Object.entries(spec.paths)) {
      if (typeof pathItem !== 'object' || pathItem === null) {
        throw new Error(`Path "${path}" must be a valid path item object`)
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
              `Operation ${method.toUpperCase()} for path "${path}" must be a valid operation object`
            )
          }

          // Check for operationId
          if (
            !operation.operationId ||
            typeof operation.operationId !== 'string'
          ) {
            throw new Error(
              `Operation ${method.toUpperCase()} for path "${path}" must have an "operationId"`
            )
          }

          // Check for responses
          if (!operation.responses || typeof operation.responses !== 'object') {
            throw new Error(
              `Operation ${method.toUpperCase()} for path "${path}" must have a "responses" object`
            )
          }
        }
      }
    }

    return spec as OpenAPISpec
  }

  /**
   * Validate API group name
   */
  public static validateApiGroup(apiGroup: string): void {
    if (!apiGroup || typeof apiGroup !== 'string') {
      throw new Error('API group must be a non-empty string')
    }

    // Check for valid characters (alphanumeric, underscore, hyphen)
    if (!/^[a-zA-Z0-9_-]+$/.test(apiGroup)) {
      throw new Error(
        'API group can only contain alphanumeric characters, underscores, and hyphens'
      )
    }

    if (apiGroup.length > 50) {
      throw new Error('API group name cannot exceed 50 characters')
    }
  }

  /**
   * Validate version string
   */
  public static validateVersion(version: string): void {
    if (!version || typeof version !== 'string') {
      throw new Error('Version must be a non-empty string')
    }

    // Basic semantic version validation
    if (
      !/^[0-9]+\.[0-9]+(\.[0-9]+)?(-[a-zA-Z0-9.-]+)?(\+[a-zA-Z0-9.-]+)?$/.test(
        version
      )
    ) {
      throw new Error(
        'Version must follow semantic versioning format (e.g., "1.0.0", "2.1.0-beta")'
      )
    }
  }

  /**
   * Validate operation ID
   */
  public static validateOperationId(operationId: string): void {
    if (!operationId || typeof operationId !== 'string') {
      throw new Error('Operation ID must be a non-empty string')
    }

    // Check for valid characters (alphanumeric, underscore, hyphen)
    if (!/^[a-zA-Z0-9_-]+$/.test(operationId)) {
      throw new Error(
        'Operation ID can only contain alphanumeric characters, underscores, and hyphens'
      )
    }

    if (operationId.length > 100) {
      throw new Error('Operation ID cannot exceed 100 characters')
    }
  }

  /**
   * Sanitize and validate query parameters
   */
  public static validateQueryParams(queryParams: any): Record<string, any> {
    if (queryParams === undefined || queryParams === null) {
      return {}
    }

    if (typeof queryParams !== 'object') {
      throw new Error('Query parameters must be an object')
    }

    const sanitized: Record<string, any> = {}

    for (const [key, value] of Object.entries(queryParams)) {
      if (typeof key !== 'string') {
        throw new Error('Query parameter keys must be strings')
      }

      // Convert values to strings for query parameters
      if (value !== null && value !== undefined) {
        sanitized[key] = String(value)
      }
    }

    return sanitized
  }

  /**
   * Sanitize and validate path parameters
   */
  public static validatePathParams(pathParams: any): Record<string, any> {
    if (pathParams === undefined || pathParams === null) {
      return {}
    }

    if (typeof pathParams !== 'object') {
      throw new Error('Path parameters must be an object')
    }

    const sanitized: Record<string, any> = {}

    for (const [key, value] of Object.entries(pathParams)) {
      if (typeof key !== 'string') {
        throw new Error('Path parameter keys must be strings')
      }

      if (value !== null && value !== undefined) {
        sanitized[key] = String(value)
      }
    }

    return sanitized
  }

  /**
   * Validate headers object
   */
  public static validateHeaders(headers: any): Record<string, string> {
    if (headers === undefined || headers === null) {
      return {}
    }

    if (typeof headers !== 'object') {
      throw new Error('Headers must be an object')
    }

    const sanitized: Record<string, string> = {}

    for (const [key, value] of Object.entries(headers)) {
      if (typeof key !== 'string') {
        throw new Error('Header keys must be strings')
      }

      if (value !== null && value !== undefined) {
        sanitized[key] = String(value)
      }
    }

    return sanitized
  }
}

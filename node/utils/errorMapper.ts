/**
 * Utility functions for mapping HTTP errors to MCP error responses
 */

export interface MCPErrorInfo {
  code: number
  message: string
  data?: any
}

/**
 * Maps HTTP status codes to MCP error codes and extracts error messages
 * @param error - The error object from the API call
 * @returns MCP error information
 */
export function mapHttpErrorToMCP(error: any): MCPErrorInfo {
  // Extract status code from various possible locations
  const statusCode = extractStatusCode(error)

  // Extract error message from various possible locations
  const errorMessage = extractErrorMessage(error, statusCode)

  // Map HTTP status codes to MCP error codes
  const mcpCode = mapStatusCodeToMCP(statusCode)

  return {
    code: mcpCode,
    message: errorMessage,
    data: {
      httpStatusCode: statusCode,
      originalError: error,
    },
  }
}

/**
 * Extracts HTTP status code from error object
 * @param error - The error object
 * @returns HTTP status code or 500 if not found
 */
function extractStatusCode(error: any): number {
  // Try various common locations for status code
  if (error?.status) return error.status
  if (error?.statusCode) return error.statusCode
  if (error?.response?.status) return error.response.status
  if (error?.response?.statusCode) return error.response.statusCode
  if (error?.metadata?.statusCode) return error.metadata.statusCode

  // Default to 500 for unknown errors
  return 500
}

/**
 * Extracts error message from error object
 * @param error - The error object
 * @param statusCode - The HTTP status code
 * @returns Error message
 */
function extractErrorMessage(error: any, statusCode: number): string {
  // Try to extract message from various locations
  if (error?.message) return error.message
  if (error?.error) return error.error
  if (error?.response?.data?.message) return error.response.data.message
  if (error?.response?.data?.error) return error.response.data.error
  if (error?.response?.data?.errorMessage)
    return error.response.data.errorMessage

  // Try to extract from response body
  if (error?.response?.data) {
    const data = error.response.data
    if (typeof data === 'string') {
      try {
        const parsed = JSON.parse(data)
        if (parsed.message) return parsed.message
        if (parsed.error) return parsed.error
      } catch {
        // If parsing fails, use the string as is
        return data
      }
    }
  }

  // Fallback to default messages based on status code
  return getDefaultErrorMessage(statusCode)
}

/**
 * Maps HTTP status codes to MCP error codes
 * @param statusCode - HTTP status code
 * @returns MCP error code
 */
function mapStatusCodeToMCP(statusCode: number): number {
  // MCP uses JSON-RPC 2.0 error codes for consistency
  // We map HTTP status codes to appropriate MCP error codes

  switch (statusCode) {
    case 400:
      return -32602 // Invalid params
    case 401:
      return -32600 // Invalid Request (authentication)
    case 403:
      return -32600 // Invalid Request (authorization)
    case 404:
      return -32602 // Invalid params (resource not found)
    case 405:
      return -32601 // Method not found
    case 422:
      return -32602 // Invalid params (validation error)
    case 429:
      return -32603 // Internal error (rate limited)
    case 500:
    case 502:
    case 503:
    case 504:
      return -32603 // Internal error (server issues)
    default:
      // For other status codes, use -32603 (Internal error) as fallback
      // This maintains MCP protocol consistency
      return -32603
  }
}

/**
 * Gets default error message based on HTTP status code
 * @param statusCode - HTTP status code
 * @returns Default error message
 */
function getDefaultErrorMessage(statusCode: number): string {
  switch (statusCode) {
    case 400:
      return 'Bad Request'
    case 401:
      return 'Unauthorized'
    case 403:
      return 'Forbidden'
    case 404:
      return 'Not Found'
    case 405:
      return 'Method Not Allowed'
    case 422:
      return 'Unprocessable Entity'
    case 429:
      return 'Too Many Requests'
    case 500:
      return 'Internal Server Error'
    // eslint-disable-next-line no-fallthrough
    case 502:
      return 'Bad Gateway'
    case 503:
      return 'Service Unavailable'
    case 504:
      return 'Gateway Timeout'
    default:
      return `HTTP Error ${statusCode}`
  }
}

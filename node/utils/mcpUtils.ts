/**
 * Utility functions for MCP (Model Context Protocol) operations
 */

/**
 * Normalizes MCP method names to handle both standard and prefixed formats
 * @param method - The method name from the request
 * @returns The normalized method name
 */
export function normalizeMCPMethod(method: string): string {
  // If method already starts with 'mcp/', return as is
  if (method.startsWith('mcp/')) {
    return method
  }

  // Map standard methods to their mcp/ prefixed versions
  const methodMap: Record<string, string> = {
    initialize: 'mcp/initialize',
    'tools/list': 'mcp/tools/list',
    'tools/call': 'mcp/tools/call',
    'resources/list': 'mcp/resources/list',
    'resources/read': 'mcp/resources/read',
    'notifications/initialized': 'mcp/notifications/initialized',
  }

  return methodMap[method] || method
}

/**
 * Checks if a method is a valid MCP method (either standard or prefixed format)
 * @param method - The method name to validate
 * @returns True if the method is valid
 */
export function isValidMCPMethod(method: string): boolean {
  const validMethods = [
    // Standard methods
    'handshake',
    'initialize',
    'tools/list',
    'tools/call',
    'resources/list',
    'resources/read',
    'notifications/initialized',
    // Prefixed methods
    'mcp/handshake',
    'mcp/initialize',
    'mcp/tools/list',
    'mcp/tools/call',
    'mcp/resources/list',
    'mcp/resources/read',
    'mcp/notifications/initialized',
  ]

  return validMethods.includes(method)
}

/**
 * Gets the expected method name for a specific endpoint
 * @param endpoint - The endpoint name (e.g., 'initialize', 'tools/list')
 * @returns Array of valid method names for this endpoint
 */
export function getValidMethodsForEndpoint(endpoint: string): string[] {
  const methodMap: Record<string, string[]> = {
    handshake: ['handshake', 'mcp/handshake'],
    initialize: ['initialize', 'mcp/initialize'],
    'tools/list': ['tools/list', 'mcp/tools/list'],
    'tools/call': ['tools/call', 'mcp/tools/call'],
    'resources/list': ['resources/list', 'mcp/resources/list'],
    'resources/read': ['resources/read', 'mcp/resources/read'],
    'notifications/initialized': [
      'notifications/initialized',
      'mcp/notifications/initialized',
    ],
  }

  return methodMap[endpoint] || []
}

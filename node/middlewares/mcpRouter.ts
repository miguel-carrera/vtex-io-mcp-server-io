import { json } from 'co-body'

import type { MCPRequest } from '../types/mcp-protocol'
import { logToMasterData } from '../utils/logging'
import { getValidMethodsForEndpoint } from '../utils/mcpUtils'
import { mapHttpErrorToMCP } from '../utils/errorMapper'
import { mcpInitialize } from './mcpInitialize'
import { mcpToolsList } from './mcpToolsList'
import { mcpToolsCall } from './mcpToolsCall'
import { mcpResourcesList } from './mcpResourcesList'
import { mcpResourcesRead } from './mcpResourcesRead'

/**
 * MCP Router endpoint - handles generic JSON-RPC requests
 * POST /_v/mcp_server/v1/mcp
 */
export async function mcpRouter(ctx: Context, next: () => Promise<void>) {
  logToMasterData(ctx, 'mcpRouter-info', '', 'info', {
    data: {
      url: ctx.req.url,
      method: ctx.req.method,
    },
    message: 'mcpRouter invoked',
  })

  let requestBody: MCPRequest | null = null

  try {
    const { req } = ctx

    requestBody = (await json(req)) as MCPRequest

    await logToMasterData(ctx, 'mcpRouter-request', '', 'debug', {
      requestBody,
      message: 'mcpRouter request parsed',
    })

    // Validate JSON-RPC request
    if (!requestBody || requestBody.jsonrpc !== '2.0') {
      ctx.status = 400
      ctx.body = {
        jsonrpc: '2.0',
        id: requestBody?.id ?? null,
        error: {
          code: -32600,
          message: 'Invalid Request',
        },
      }

      return
    }

    // Check if this is a notification (no id) or a request (must have id)
    const isNotification = !('id' in requestBody)
    const isRequest = 'id' in requestBody

    // For requests (not notifications), validate that id is not null/undefined
    if (
      isRequest &&
      (requestBody.id === undefined || requestBody.id === null)
    ) {
      ctx.status = 400
      ctx.body = {
        jsonrpc: '2.0',
        id: null,
        error: {
          code: -32600,
          message: 'Invalid Request: id is required for requests',
        },
      }

      return
    }

    // Route the request based on the method
    const { method } = requestBody

    // Log the incoming request
    await logToMasterData(ctx, 'mcpRouter', 'middleware', 'debug', {
      data: {
        method,
        id: requestBody.id,
        hasParams: !!requestBody.params,
        isNotification,
        isRequest,
      },
      message: `Routing MCP ${
        isNotification ? 'notification' : 'request'
      }: ${method}`,
    })

    // Route to appropriate handler based on method
    switch (method) {
      case 'initialize':
        await handleInitialize(ctx, requestBody)
        break

      case 'mcp/initialize':
        await handleInitialize(ctx, requestBody)
        break

      case 'tools/list':
        await handleToolsList(ctx, requestBody)
        break

      case 'mcp/tools/list':
        await handleToolsList(ctx, requestBody)
        break

      case 'tools/call':
        await handleToolsCall(ctx, requestBody)
        break

      case 'mcp/tools/call':
        await handleToolsCall(ctx, requestBody)
        break

      case 'resources/list':
        await handleResourcesList(ctx, requestBody)
        break

      case 'mcp/resources/list':
        await handleResourcesList(ctx, requestBody)
        break

      case 'resources/read':
        await handleResourcesRead(ctx, requestBody)
        break

      case 'mcp/resources/read':
        await handleResourcesRead(ctx, requestBody)
        break

      case 'notifications/initialized':
        await handleInitialized(ctx, requestBody)
        break

      case 'mcp/notifications/initialized':
        await handleInitialized(ctx, requestBody)
        break

      case 'handshake':
        await handleHandshake(ctx, requestBody)
        break

      case 'mcp/handshake':
        await handleHandshake(ctx, requestBody)
        break

      default:
        ctx.status = 400
        ctx.body = {
          jsonrpc: '2.0',
          id: requestBody.id,
          error: {
            code: -32601,
            message: 'Method not found',
          },
        }

        return
    }

    return next()
  } catch (error) {
    await logToMasterData(ctx, 'mcpRouter', 'middleware', 'error', {
      error,
      message: 'Failed to route MCP request',
    })

    ctx.status = 500
    ctx.body = {
      jsonrpc: '2.0',
      id: requestBody?.id || null,
      error: {
        code: -32603,
        message: 'Internal error',
      },
    }
  }
}

// Handler functions that implement the logic directly
async function handleInitialize(ctx: Context, requestBody: MCPRequest) {
  try {
    // Delegate to the existing HTTP middleware to avoid duplication
    ;(ctx.state as any).mcpRequest = requestBody
    await mcpInitialize(ctx, async () => {})
  } catch (error) {
    logToMasterData(ctx, 'handleInitialize-error', '', 'error', {
      error,
      message: 'Failed to initialize MCP client via router',
    })

    ctx.status = 500
    ctx.body = {
      jsonrpc: '2.0',
      id: requestBody.id,
      error: {
        code: -32603,
        message: 'Internal error',
      },
    }
  }
}

async function handleToolsList(ctx: Context, requestBody: MCPRequest) {
  try {
    // Validate method - accept both 'tools/list' and 'mcp/tools/list'
    const validMethods = getValidMethodsForEndpoint('tools/list')

    if (!validMethods.includes(requestBody.method)) {
      ctx.status = 400
      ctx.body = {
        jsonrpc: '2.0',
        id: requestBody.id,
        error: {
          code: -32601,
          message: 'Method not found',
        },
      }

      return
    }

    // Delegate to the existing HTTP middleware to avoid duplication
    ;(ctx.state as any).mcpRequest = requestBody
    await mcpToolsList(ctx, async () => {})
  } catch (error) {
    logToMasterData(ctx, 'handleToolsList-error', '', 'error', {
      error,
      message: 'Failed to get MCP tools list via router',
    })

    ctx.status = 500
    ctx.body = {
      jsonrpc: '2.0',
      id: requestBody.id,
      error: {
        code: -32603,
        message: 'Internal error',
      },
    }
  }
}

async function handleToolsCall(ctx: Context, requestBody: MCPRequest) {
  try {
    // Validate method - accept both 'tools/call' and 'mcp/tools/call'
    const validMethods = getValidMethodsForEndpoint('tools/call')

    if (!validMethods.includes(requestBody.method)) {
      ctx.status = 400
      ctx.body = {
        jsonrpc: '2.0',
        id: requestBody.id,
        error: {
          code: -32601,
          message: 'Method not found',
        },
      }

      return
    }

    // Delegate to the existing HTTP middleware to avoid duplication
    ;(ctx.state as any).mcpRequest = requestBody
    await mcpToolsCall(ctx, async () => {})
  } catch (error) {
    logToMasterData(ctx, 'handleToolsCall-error', '', 'error', {
      error,
      message: 'Failed to execute MCP tool call via router',
    })

    const mcpError = mapHttpErrorToMCP(error)

    // Use the HTTP status code from the error, or default to 500
    const httpStatusCode = mcpError.data?.httpStatusCode || 500

    ctx.status = httpStatusCode

    ctx.body = {
      jsonrpc: '2.0',
      id: requestBody.id,
      error: {
        code: mcpError.code,
        message: mcpError.message,
        data: mcpError.data,
      },
    }
  }
}

async function handleResourcesList(ctx: Context, requestBody: MCPRequest) {
  try {
    // Validate method - accept both 'resources/list' and 'mcp/resources/list'
    const validMethods = getValidMethodsForEndpoint('resources/list')

    if (!validMethods.includes(requestBody.method)) {
      ctx.status = 400
      ctx.body = {
        jsonrpc: '2.0',
        id: requestBody.id,
        error: {
          code: -32601,
          message: 'Method not found',
        },
      }

      return
    }

    // Delegate to the existing HTTP middleware to avoid duplication
    ;(ctx.state as any).mcpRequest = requestBody
    await mcpResourcesList(ctx, async () => {})
  } catch (error) {
    logToMasterData(ctx, 'handleResourcesList-error', '', 'error', {
      error,
      message: 'Failed to retrieve MCP resources list via router',
    })
    ctx.status = 500
    ctx.body = {
      jsonrpc: '2.0',
      id: requestBody.id,
      error: {
        code: -32603,
        message: 'Internal error',
      },
    }
  }
}

async function handleResourcesRead(ctx: Context, requestBody: MCPRequest) {
  try {
    // Validate method - accept both 'resources/read' and 'mcp/resources/read'
    const validMethods = getValidMethodsForEndpoint('resources/read')

    if (!validMethods.includes(requestBody.method)) {
      ctx.status = 400
      ctx.body = {
        jsonrpc: '2.0',
        id: requestBody.id,
        error: {
          code: -32601,
          message: 'Method not found',
        },
      }

      return
    }

    // Delegate to the existing HTTP middleware to avoid duplication
    ;(ctx.state as any).mcpRequest = requestBody
    await mcpResourcesRead(ctx, async () => {})
  } catch (error) {
    logToMasterData(ctx, 'handleResourcesRead-error', '', 'error', {
      error,
      message: 'Failed to read MCP resource via router',
    })

    ctx.status = 500
    ctx.body = {
      jsonrpc: '2.0',
      id: requestBody.id,
      error: {
        code: -32603,
        message: 'Internal error',
      },
    }
  }
}

async function handleInitialized(ctx: Context, requestBody: MCPRequest) {
  try {
    // For notifications, we don't send a response body
    ctx.status = 200
  } catch (error) {
    logToMasterData(ctx, 'handleInitialized-error', '', 'error', {
      error,
      message: 'Failed to process MCP initialized notification via router',
    })

    ctx.status = 500
    ctx.body = {
      jsonrpc: '2.0',
      id: requestBody.id || null,
      error: {
        code: -32603,
        message: 'Internal error',
      },
    }
  }
}

async function handleHandshake(ctx: Context, requestBody: MCPRequest) {
  try {
    // Validate method - accept both 'mcp/handshake' and 'handshake'
    const validMethods = getValidMethodsForEndpoint('handshake')

    if (!validMethods.includes(requestBody.method)) {
      ctx.status = 400
      ctx.body = {
        jsonrpc: '2.0',
        id: requestBody.id,
        error: {
          code: -32601,
          message: 'Method not found',
        },
      }

      return
    }

    // Extract handshake parameters
    const params = requestBody.params || {}
    const clientVersion = params.version || 'unknown'
    const clientCapabilities = params.capabilities || []

    // Check if client version is compatible
    const supportedVersions = ['1.0.0', '2024-11-05']
    const isVersionCompatible = supportedVersions.includes(clientVersion)

    // Define server capabilities
    const serverCapabilities = ['resources', 'tools', 'logging']

    // Create handshake response
    const response = {
      version: '1.0.0',
      capabilities: serverCapabilities,
      compatible: isVersionCompatible,
      serverInfo: {
        name: 'VTEX IO MCP Server',
        version: '1.0.0',
        description:
          'Model Context Protocol server for VTEX IO API integration',
      },
    }

    const mcpResponse = {
      jsonrpc: '2.0',
      id: requestBody.id,
      result: response,
    }

    ctx.status = 200
    ctx.body = mcpResponse

    // Log the handshake for monitoring
    logToMasterData(ctx, 'handleHandshake-success', '', 'info', {
      data: {
        clientVersion,
        clientCapabilities,
        isVersionCompatible,
        serverCapabilities,
      },
      message: 'MCP handshake completed via router',
    })
  } catch (error) {
    logToMasterData(ctx, 'handleHandshake-error', '', 'error', {
      error,
      message: 'Failed to process MCP handshake via router',
    })

    ctx.status = 500
    ctx.body = {
      jsonrpc: '2.0',
      id: requestBody.id,
      error: {
        code: -32603,
        message: 'Internal error',
      },
    }
  }
}

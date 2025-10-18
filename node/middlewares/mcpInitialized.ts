import { json } from 'co-body'

import type { MCPRequest } from '../types/mcp-protocol'
import { logToMasterData } from '../utils/logging'
import { getValidMethodsForEndpoint } from '../utils/mcpUtils'

/**
 * MCP Initialized notification endpoint
 * POST /_v/mcp_server/v0/mcp/notifications/initialized
 */
export async function mcpInitialized(ctx: Context, next: () => Promise<void>) {
  let requestBody: MCPRequest | null = null

  try {
    const {
      req,
      state: {
        body: { mcpConfig },
      },
    } = ctx

    requestBody = (await json(req)) as MCPRequest

    // Check MCP configuration
    if (!mcpConfig || !mcpConfig.enabled) {
      ctx.status = 403
      ctx.body = {
        jsonrpc: '2.0',
        id: requestBody?.id || null,
        error: {
          code: -32000,
          message: mcpConfig
            ? 'MCP server is disabled for this instance'
            : 'MCP server not found',
        },
      }

      return
    }

    // Validate JSON-RPC request
    if (!requestBody || requestBody.jsonrpc !== '2.0') {
      ctx.status = 400
      ctx.body = {
        jsonrpc: '2.0',
        id: requestBody?.id || null,
        error: {
          code: -32600,
          message: 'Invalid Request',
        },
      }

      return
    }

    // Validate method - accept both 'notifications/initialized' and 'mcp/notifications/initialized'
    const validMethods = getValidMethodsForEndpoint('notifications/initialized')

    if (!validMethods.includes(requestBody.method)) {
      ctx.status = 400
      ctx.body = {
        jsonrpc: '2.0',
        id: requestBody.id || null,
        error: {
          code: -32601,
          message: 'Method not found',
        },
      }

      return
    }

    // For notifications, we don't send a response body
    ctx.status = 200

    // Log the initialization notification for monitoring
    await logToMasterData(ctx, 'mcpInitialized', 'middleware', 'info', {
      data: {
        notification: 'initialized',
      },
      message: 'MCP client sent initialized notification',
    })

    return next()
  } catch (error) {
    await logToMasterData(ctx, 'mcpInitialized', 'middleware', 'error', {
      error,
      message: 'Failed to process MCP initialized notification',
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

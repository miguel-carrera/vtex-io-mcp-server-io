import { json } from 'co-body'

import type {
  MCPRequest,
  MCPResponse,
  MCPHandshakeRequest,
  MCPHandshakeResponse,
} from '../types/mcp-protocol'
import { logToMasterData } from '../utils/logging'
import { getValidMethodsForEndpoint } from '../utils/mcpUtils'

/**
 * MCP Handshake endpoint
 * POST /_v/mcp_server/v0/mcp/handshake
 *
 * Purpose: Used at the very beginning of the connection to verify that:
 * - Both sides speak MCP
 * - The protocol versions are compatible
 * - Capabilities can be safely negotiated
 */
export async function mcpHandshake(ctx: Context, next: () => Promise<void>) {
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
    if (
      !requestBody ||
      requestBody.jsonrpc !== '2.0' ||
      requestBody.id === undefined ||
      requestBody.id === null
    ) {
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
    const params = (requestBody.params as MCPHandshakeRequest) || {}
    const clientVersion = params.version || 'unknown'
    const clientCapabilities = params.capabilities || []

    // Check if client version is compatible
    const supportedVersions = ['1.0.0', '2024-11-05']
    const isVersionCompatible = supportedVersions.includes(clientVersion)

    // Define server capabilities
    const serverCapabilities = ['resources', 'tools', 'logging']

    // Create handshake response
    const response: MCPHandshakeResponse = {
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

    const mcpResponse: MCPResponse = {
      jsonrpc: '2.0',
      id: requestBody.id,
      result: response,
    }

    ctx.status = 200
    ctx.body = mcpResponse

    // Log the handshake for monitoring
    await logToMasterData(ctx, 'mcpHandshake', 'middleware', 'info', {
      data: {
        clientVersion,
        clientCapabilities,
        isVersionCompatible,
        serverCapabilities,
      },
      message: 'MCP handshake completed',
    })

    return next()
  } catch (error) {
    await logToMasterData(ctx, 'mcpHandshake', 'middleware', 'error', {
      error,
      message: 'Failed to process MCP handshake',
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

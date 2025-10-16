import { json } from 'co-body'

import type {
  MCPRequest,
  MCPResponse,
  MCPInitializeRequest,
  MCPInitializeResponse,
} from '../types/mcp-protocol'
import { logToMasterData } from '../utils/logging'
import { getValidMethodsForEndpoint } from '../utils/mcpUtils'

/**
 * MCP Initialize endpoint
 * POST /_v/mcp_server/v0/mcp/initialize
 */
export async function mcpInitialize(ctx: Context, next: () => Promise<void>) {
  let requestBody: MCPRequest | null = null

  try {
    const { req } = ctx

    requestBody =
      ((ctx.state as any)?.mcpRequest as MCPRequest | undefined) ||
      ((await json(req)) as MCPRequest)

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

    // Validate method - accept both 'initialize' and 'mcp/initialize'
    const validMethods = getValidMethodsForEndpoint('initialize')

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

    // Validate initialize request parameters
    const params = requestBody.params as MCPInitializeRequest

    if (
      !params ||
      !params.protocolVersion ||
      !params.capabilities ||
      !params.clientInfo
    ) {
      ctx.status = 400
      ctx.body = {
        jsonrpc: '2.0',
        id: requestBody.id,
        error: {
          code: -32602,
          message: 'Invalid params',
        },
      }

      return
    }

    // Check protocol version compatibility
    const supportedVersions = ['2024-11-05', '2025-03-26', '2025-06-18']
    const supportedVersion = supportedVersions.includes(params.protocolVersion)
      ? params.protocolVersion
      : supportedVersions[0]

    if (!supportedVersions.includes(params.protocolVersion)) {
      ctx.status = 400
      ctx.body = {
        jsonrpc: '2.0',
        id: requestBody.id,
        error: {
          code: -32602,
          message: `Unsupported protocol version. Supported versions: ${supportedVersions.join(
            ', '
          )}, Got: ${params.protocolVersion}`,
        },
      }

      return
    }

    // Create initialize response with server capabilities
    const response: MCPInitializeResponse = {
      protocolVersion: supportedVersion,
      capabilities: {
        tools: {
          listChanged: true,
        },
        resources: {
          subscribe: false,
          listChanged: true,
        },
      },
      serverInfo: {
        name: 'VTEX IO MCP Server',
        version: '1.0.0',
      },
    }

    const mcpResponse: MCPResponse = {
      jsonrpc: '2.0',
      id: requestBody.id,
      result: response,
    }

    ctx.status = 200
    ctx.body = mcpResponse

    // Log the initialization for monitoring
    await logToMasterData(ctx, 'mcpInitialize', 'middleware', 'info', {
      data: {
        clientInfo: params.clientInfo,
        clientCapabilities: params.capabilities,
        protocolVersion: params.protocolVersion,
      },
      message: 'MCP client initialized successfully',
    })

    return next()
  } catch (error) {
    await logToMasterData(ctx, 'mcpInitialize', 'middleware', 'error', {
      error,
      message: 'Failed to initialize MCP client',
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

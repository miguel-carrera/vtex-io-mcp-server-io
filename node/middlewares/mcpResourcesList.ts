import { json } from 'co-body'

import type {
  MCPRequest,
  MCPResponse,
  MCPResourcesListResponse,
} from '../types/mcp-protocol'
import { MasterDataService } from '../services/masterDataService'
import { logToMasterData } from '../utils/logging'
import { getValidMethodsForEndpoint } from '../utils/mcpUtils'

/**
 * MCP Resources/List endpoint
 * POST /_v/mcp_server/v0/mcp/resources/list
 */
export async function mcpResourcesList(
  ctx: Context,
  next: () => Promise<void>
) {
  let requestBody: MCPRequest | null = null

  try {
    const { req } = ctx

    // Prefer request body passed by upstream router to avoid re-reading the stream
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

    // Initialize MasterData service
    const masterDataService = new MasterDataService(ctx)

    // Get all API specifications
    const specsMetadata = await masterDataService.getAPISpecs()

    // Only include API specification resources; remove path resources
    const resources = specsMetadata.map((spec) => ({
      uri: `vtex://api-spec/${spec.apiGroup}`,
      name: `${spec.apiGroup} API Specification`,
      description:
        spec.description ?? `OpenAPI specification for ${spec.apiGroup} API`,
      mimeType: 'application/json',
    }))

    const response: MCPResourcesListResponse = {
      resources,
    }

    const mcpResponse: MCPResponse = {
      jsonrpc: '2.0',
      id: requestBody.id,
      result: response,
    }

    ctx.status = 200
    ctx.body = mcpResponse

    // Log the request for monitoring
    await logToMasterData(ctx, 'mcpResourcesList', 'middleware', 'info', {
      data: {
        resourcesCount: resources.length,
        apiGroups: specsMetadata.map((spec) => spec.apiGroup),
      },
      message: 'MCP resources list retrieved successfully',
    })

    return next()
  } catch (error) {
    await logToMasterData(ctx, 'mcpResourcesList', 'middleware', 'error', {
      error,
      message: 'Failed to retrieve MCP resources list',
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

import { json } from 'co-body'

import type {
  MCPRequest,
  MCPResponse,
  MCPToolsListResponse,
  MCPTool,
} from '../types/mcp-protocol'
import { MasterDataService } from '../services/masterDataService'
import { logToMasterData } from '../utils/logging'
import { getValidMethodsForEndpoint } from '../utils/mcpUtils'

/**
 * MCP Tools/List endpoint
 * POST /_v/mcp_server/v0/mcp/tools/list
 */
export async function mcpToolsList(ctx: Context, next: () => Promise<any>) {
  let requestBody: MCPRequest | null = null

  try {
    const {
      req,
      state: {
        body: { mcpConfig },
      },
    } = ctx

    requestBody =
      ((ctx.state as any)?.mcpRequest as MCPRequest | undefined) ||
      ((await json(req)) as MCPRequest)

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

    // Initialize MasterData service
    const masterDataService = new MasterDataService(ctx)

    // Get all API specifications
    const specsMetadata = await masterDataService.getAPISpecs()

    // Create MCP tools array
    const tools: MCPTool[] = []

    // Add a general VTEX API tool
    const generalTool: MCPTool = {
      name: 'vtex_api_call',
      description: 'Execute any VTEX API operation call dynamically',
      inputSchema: {
        type: 'object',
        properties: {
          apiGroup: {
            type: 'string',
            description: 'The API group (e.g., Orders, Catalog)',
            enum: specsMetadata.map((spec) => spec.apiGroup),
          },
          operationId: {
            type: 'string',
            description: 'The operation ID to execute (preferred)',
          },
          method: {
            type: 'string',
            description: 'HTTP method when using path-based execution',
            enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'],
          },
          path: {
            type: 'string',
            description:
              'OpenAPI path (e.g., /api/catalog/pvt/sku/{id}) when not using operationId',
          },
          parameters: {
            type: 'object',
            description: 'Parameters for the API call',
            additionalProperties: true,
          },
          body: {
            type: 'object',
            description: 'Request body for POST/PUT/PATCH operations',
            additionalProperties: true,
          },
        },
        required: ['apiGroup'],
      },
    }

    tools.push(generalTool)

    // Add a tool to retrieve API path specification for a given operation
    const specTool: MCPTool = {
      name: 'vtex_api_specification',
      description:
        'Retrieve the OpenAPI specification for a VTEX API operation',
      inputSchema: {
        type: 'object',
        properties: {
          apiGroup: {
            type: 'string',
            description: 'The API group (e.g., Orders, Catalog)',
            enum: specsMetadata.map((spec) => spec.apiGroup),
          },
          operationId: {
            type: 'string',
            description:
              'The operation ID to lookup (preferred, falls back to method+path)',
          },
          method: {
            type: 'string',
            description:
              'HTTP method when using path-based lookup (fallback if no operationId)',
            enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'],
          },
          path: {
            type: 'string',
            description:
              'OpenAPI path (e.g., /api/catalog/pvt/sku/{id}) when not using operationId',
          },
        },
        required: ['apiGroup'],
      },
    }

    tools.push(specTool)

    const response: MCPToolsListResponse = {
      tools,
    }

    const mcpResponse: MCPResponse = {
      jsonrpc: '2.0',
      id: requestBody.id,
      result: response,
    }

    ctx.status = 200
    ctx.body = mcpResponse

    // Log the request for monitoring
    await logToMasterData(ctx, 'mcpToolsList', 'middleware', 'info', {
      data: {
        toolsCount: tools.length,
        apiGroups: specsMetadata.map((spec) => spec.apiGroup),
      },
      message: 'MCP tools list retrieved successfully',
    })

    return next()
  } catch (error) {
    await logToMasterData(ctx, 'mcpToolsList', 'middleware', 'error', {
      error,
      message: 'Failed to retrieve MCP tools list',
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

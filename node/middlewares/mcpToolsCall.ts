import { json } from 'co-body'

import type {
  MCPRequest,
  MCPResponse,
  MCPToolsCallRequest,
  MCPToolsCallResponse,
} from '../types/mcp-protocol'
import { MasterDataService } from '../services/masterDataService'
import { APIExecutor } from '../utils/apiExecutor'
import { logToMasterData } from '../utils/logging'
import { getValidMethodsForEndpoint } from '../utils/mcpUtils'
import { categorizeParameters } from '../utils/parameterCategorizer'
import { mapHttpErrorToMCP } from '../utils/errorMapper'

/**
 * MCP Tools/Call endpoint
 * POST /_v/mcp_server/v0/mcp/tools/call
 */
export async function mcpToolsCall(ctx: Context, next: () => Promise<any>) {
  let requestBody: MCPRequest | null = null

  try {
    const { req } = ctx

    requestBody = (await json(req)) as MCPRequest

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

    // Validate params
    if (
      !requestBody.params ||
      !requestBody.params.name ||
      !requestBody.params.arguments
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

    const { name, arguments: args } = requestBody.params as MCPToolsCallRequest

    // Initialize services
    const masterDataService = new MasterDataService(ctx)
    const apiExecutor = new APIExecutor(ctx.clients.vtexApi)

    let apiGroup: string
    let operationId: string
    let parameters: Record<string, any> = {}
    let body: any

    // Handle tool call
    if (name === 'vtex_api_call') {
      // General VTEX API call
      apiGroup = args.apiGroup
      operationId = args.operationId
      parameters = args.parameters || {}
      body = args.body
    } else {
      ctx.status = 400
      ctx.body = {
        jsonrpc: '2.0',
        id: requestBody.id,
        error: {
          code: -32601,
          message: `Unknown tool: ${name}`,
        },
      }

      return
    }

    // Get API specification
    const specMetadata = await masterDataService.getAPISpecByGroup(apiGroup)

    if (!specMetadata) {
      ctx.status = 404
      ctx.body = {
        jsonrpc: '2.0',
        id: requestBody.id,
        error: {
          code: -32602,
          message: `API group '${apiGroup}' not found`,
        },
      }

      return
    }

    // Fetch the full OpenAPI specification
    const openApiSpec = await masterDataService.fetchSpecFromUrl(
      specMetadata.specUrl
    )

    // Categorize parameters based on OpenAPI specification
    const categorizedParams = categorizeParameters(
      openApiSpec,
      operationId,
      parameters
    )

    // Execute the API call
    const result = await apiExecutor.executeOperation(openApiSpec, {
      apiGroup,
      operationId,
      pathParams: categorizedParams.pathParams,
      queryParams: categorizedParams.queryParams,
      headers: categorizedParams.headers,
      body,
    })

    // Format response according to MCP specification
    const mcpResponse: MCPToolsCallResponse = {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
          mimeType: result.metadata?.contentType || 'application/json',
        },
      ],
      isError: false, // APIExecutor doesn't return success property, assume success unless exception
    }

    const response: MCPResponse = {
      jsonrpc: '2.0',
      id: requestBody.id,
      result: mcpResponse,
    }

    ctx.status = 200
    ctx.body = response

    // Log the request for monitoring
    await logToMasterData(ctx, 'mcpToolsCall', 'middleware', 'info', {
      data: {
        toolName: name,
        apiGroup,
        operationId,
        success: true, // APIExecutor doesn't return success property, assume success unless exception
      },
      message: 'MCP tool call executed successfully',
    })

    return next()
  } catch (error) {
    // Map HTTP error to MCP error format
    const mcpError = mapHttpErrorToMCP(error)

    await logToMasterData(ctx, 'mcpToolsCall', 'middleware', 'error', {
      error,
      mcpError,
      message: 'Failed to execute MCP tool call',
    })

    // Use the HTTP status code from the error, or default to 500
    const httpStatusCode = mcpError.data?.httpStatusCode || 500

    ctx.status = httpStatusCode

    ctx.body = {
      jsonrpc: '2.0',
      id: requestBody?.id as string | null,
      error: {
        code: mcpError.code,
        message: mcpError.message,
        data: mcpError.data,
      },
    }
  }
}

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
    let operationId: string | undefined
    let method: string | undefined
    let path: string | undefined
    let parameters: Record<string, any> = {}
    let body: any

    // Handle tool call
    if (name === 'vtex_api_call') {
      // General VTEX API call
      apiGroup = (args as any).apiGroup
      operationId = (args as any).operationId
      method = (args as any).method
      path = (args as any).path
      parameters = (args as any).parameters || {}
      body = (args as any).body

      if (!operationId && !(method && path)) {
        ctx.status = 400
        ctx.body = {
          jsonrpc: '2.0',
          id: requestBody.id,
          error: {
            code: -32602,
            message: 'You must provide either operationId or method and path',
          },
        }

        return
      }
    } else if (name === 'vtex_api_specification') {
      // Return OpenAPI path spec for the provided operation
      apiGroup = (args as any).apiGroup
      operationId = (args as any).operationId
      method = (args as any).method
      path = (args as any).path

      if (!operationId && !(method && path)) {
        ctx.status = 400
        ctx.body = {
          jsonrpc: '2.0',
          id: requestBody.id,
          error: {
            code: -32602,
            message: 'You must provide either operationId or method and path',
          },
        }

        return
      }
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

    let mcpResponse: MCPToolsCallResponse

    if (name === 'vtex_api_call') {
      // Categorize parameters based on OpenAPI specification
      const categorizedParams = categorizeParameters(
        openApiSpec,
        operationId || { method: method as string, path: path as string },
        parameters
      )

      // Execute the API call
      const result = await apiExecutor.executeOperation(openApiSpec, {
        apiGroup,
        operationId,
        method,
        path,
        pathParams: categorizedParams.pathParams,
        queryParams: categorizedParams.queryParams,
        headers: categorizedParams.headers,
        body,
      })

      mcpResponse = {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
            mimeType: result.metadata?.contentType || 'application/json',
          },
        ],
        isError: false,
      }
    } else {
      // vtex_api_specification: return same as resources/read for vtex://api-path/
      // Find the specific path spec
      let resolvedPath: string | undefined = path

      if (!resolvedPath && operationId) {
        // Resolve path by operationId
        for (const [p, pathItem] of Object.entries(openApiSpec.paths || {})) {
          const methods = [
            'get',
            'post',
            'put',
            'patch',
            'delete',
            'options',
            'head',
          ]

          for (const m of methods) {
            const op: any = (pathItem as any)[m]

            if (op && op.operationId === operationId) {
              resolvedPath = p
              method = (m as string).toUpperCase()
              break
            }
          }

          if (resolvedPath) break
        }
      }

      const pathSpec = resolvedPath
        ? (openApiSpec.paths as any)[resolvedPath]
        : undefined

      if (!resolvedPath || !pathSpec) {
        ctx.status = 404
        ctx.body = {
          jsonrpc: '2.0',
          id: requestBody.id,
          error: {
            code: -32602,
            message: 'Path not found for the given operation',
          },
        }

        return
      }

      const pathResponse = {
        group: specMetadata.apiGroup,
        version: specMetadata.version,
        path: resolvedPath,
        pathSpec,
        enabled: specMetadata.enabled,
        description: specMetadata.description,
      }

      mcpResponse = {
        content: [
          {
            type: 'text',
            text: JSON.stringify(pathResponse, null, 2),
            mimeType: 'application/json',
          },
        ],
        isError: false,
      }
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
        operationId: operationId || `${method} ${path}`,
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

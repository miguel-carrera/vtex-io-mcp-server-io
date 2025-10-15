import { Readable } from 'stream'

import { json } from 'co-body'

import type {
  MCPRequest,
  MCPInitializeRequest,
  MCPInitializeResponse,
  MCPTool,
} from '../types/mcp-protocol'
import { logToMasterData } from '../utils/logging'

/**
 * MCP Router endpoint - handles generic JSON-RPC requests
 * POST /_v/mcp_server/v1/mcp
 */
export async function mcpRouter(ctx: Context, next: () => Promise<void>) {
  // eslint-disable-next-line no-console
  console.log('**** mcpRouter', {
    url: ctx.req.url,
    method: ctx.req.method,
  })

  let requestBody: MCPRequest | null = null

  try {
    const { req } = ctx

    requestBody = (await json(req)) as MCPRequest

    // eslint-disable-next-line no-console
    console.log('**** requestBody', requestBody)

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
    await logToMasterData(ctx, 'mcpRouter', 'middleware', 'info', {
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

// Helper function to create a readable stream from parsed JSON
function createReadableStreamFromJSON(data: any): Readable {
  const jsonString = JSON.stringify(data)

  return new Readable({
    read() {
      this.push(jsonString)
      this.push(null) // End the stream
    },
  }) as any
}

// Handler functions that implement the logic directly
async function handleInitialize(ctx: Context, requestBody: MCPRequest) {
  try {
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

    ctx.status = 200
    ctx.body = {
      jsonrpc: '2.0',
      id: requestBody.id,
      result: response,
    }

    // Log the initialization for monitoring
    await logToMasterData(ctx, 'mcpRouter', 'middleware', 'info', {
      data: {
        clientInfo: params.clientInfo,
        clientCapabilities: params.capabilities,
        protocolVersion: params.protocolVersion,
      },
      message: 'MCP client initialized successfully via router',
    })
  } catch (error) {
    await logToMasterData(ctx, 'mcpRouter', 'middleware', 'error', {
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
    // eslint-disable-next-line no-console
    console.log('**** handleToolsList - requestBody:', requestBody)

    // Import required types and services
    const { MasterDataService } = await import('../services/masterDataService')
    const { getValidMethodsForEndpoint } = await import('../utils/mcpUtils')

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

    // Initialize services
    const masterDataService = new MasterDataService(ctx)

    // Get all API specifications
    const apiSpecs = await masterDataService.getAPISpecs()

    const tools: MCPTool[] = []

    // Create a general VTEX API call tool
    const generalTool: MCPTool = {
      name: 'vtex_api_call',
      description: 'Make a call to any VTEX API endpoint',
      inputSchema: {
        type: 'object',
        properties: {
          apiGroup: {
            type: 'string',
            description: 'The API group identifier',
          },
          operationId: {
            type: 'string',
            description: 'The operation ID to execute',
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
        required: ['apiGroup', 'operationId'],
      },
    }

    tools.push(generalTool)

    const response = {
      tools,
    }

    ctx.status = 200
    ctx.body = {
      jsonrpc: '2.0',
      id: requestBody.id,
      result: response,
    }

    // Log the tools list request for monitoring
    await logToMasterData(ctx, 'mcpRouter', 'middleware', 'info', {
      data: {
        toolsCount: tools.length,
        apiSpecsCount: apiSpecs.length,
      },
      message: 'MCP tools list requested via router',
    })
  } catch (error) {
    // eslint-disable-next-line no-console
    console.log('**** handleToolsList - error:', error)
    await logToMasterData(ctx, 'mcpRouter', 'middleware', 'error', {
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
    // eslint-disable-next-line no-console
    console.log('**** handleToolsCall - requestBody:', requestBody)

    // Import required types and services
    const { MasterDataService } = await import('../services/masterDataService')
    const { APIExecutor } = await import('../utils/apiExecutor')
    const { getValidMethodsForEndpoint } = await import('../utils/mcpUtils')
    const { categorizeParameters } = await import(
      '../utils/parameterCategorizer'
    )

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

    const { name, arguments: args } = requestBody.params

    // Initialize services
    const masterDataService = new MasterDataService(ctx)
    const apiExecutor = new APIExecutor(ctx.clients.vtexApi)

    let apiGroup: string
    let operationId: string
    let parameters: Record<string, unknown> = {}
    let body: unknown

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
    const mcpResponse = {
      content: [
        {
          type: 'text',
          text: JSON.stringify(result, null, 2),
          mimeType: result.metadata?.contentType || 'application/json',
        },
      ],
      isError: false, // APIExecutor doesn't return success property, assume success unless exception
    }

    const response = {
      jsonrpc: '2.0',
      id: requestBody.id,
      result: mcpResponse,
    }

    ctx.status = 200
    ctx.body = response

    // Log the request for monitoring
    await logToMasterData(ctx, 'mcpRouter', 'middleware', 'info', {
      data: {
        toolName: name,
        apiGroup,
        operationId,
        success: true, // APIExecutor doesn't return success property, assume success unless exception
      },
      message: 'MCP tool call executed successfully via router',
    })
  } catch (error) {
    // eslint-disable-next-line no-console
    console.log('**** handleToolsCall - error:', error)

    // Import error mapper and map HTTP error to MCP error format
    const { mapHttpErrorToMCP } = await import('../utils/errorMapper')
    const mcpError = mapHttpErrorToMCP(error)

    await logToMasterData(ctx, 'mcpRouter', 'middleware', 'error', {
      error,
      mcpError,
      message: 'Failed to execute MCP tool call via router',
    })

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
  const { mcpResourcesList } = await import('./mcpResourcesList')

  const newStream = createReadableStreamFromJSON(requestBody)
  const mockReq = {
    ...ctx.req,
    ...newStream,
    headers: ctx.req.headers,
    url: ctx.req.url,
    method: ctx.req.method,
  }

  const originalReq = ctx.req

  ctx.req = mockReq as any

  try {
    await mcpResourcesList(ctx, async () => {})
  } finally {
    ctx.req = originalReq
  }
}

async function handleResourcesRead(ctx: Context, requestBody: MCPRequest) {
  const { mcpResourcesRead } = await import('./mcpResourcesRead')

  const newStream = createReadableStreamFromJSON(requestBody)
  const mockReq = {
    ...ctx.req,
    ...newStream,
    headers: ctx.req.headers,
    url: ctx.req.url,
    method: ctx.req.method,
  }

  const originalReq = ctx.req

  ctx.req = mockReq as any

  try {
    await mcpResourcesRead(ctx, async () => {})
  } finally {
    ctx.req = originalReq
  }
}

async function handleInitialized(ctx: Context, requestBody: MCPRequest) {
  try {
    // For notifications, we don't send a response body
    ctx.status = 200

    // Log the initialization notification for monitoring
    await logToMasterData(ctx, 'mcpRouter', 'middleware', 'info', {
      data: {
        notification: 'initialized',
        method: requestBody.method,
      },
      message: 'MCP client sent initialized notification via router',
    })
  } catch (error) {
    await logToMasterData(ctx, 'mcpRouter', 'middleware', 'error', {
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
  const { mcpHandshake } = await import('./mcpHandshake')

  const newStream = createReadableStreamFromJSON(requestBody)
  const mockReq = {
    ...ctx.req,
    ...newStream,
    headers: ctx.req.headers,
    url: ctx.req.url,
    method: ctx.req.method,
  }

  const originalReq = ctx.req

  ctx.req = mockReq as any

  try {
    await mcpHandshake(ctx, async () => {})
  } finally {
    ctx.req = originalReq
  }
}

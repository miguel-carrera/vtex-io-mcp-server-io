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
  try {
    // eslint-disable-next-line no-console
    console.log('**** handleResourcesList - requestBody:', requestBody)

    // Import required types and services
    const { MasterDataService } = await import('../services/masterDataService')
    const { getValidMethodsForEndpoint } = await import('../utils/mcpUtils')

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

    // Add individual path resources for each API group
    const pathResourcePromises = specsMetadata.map(async (spec) => {
      try {
        // Fetch the OpenAPI spec to get paths
        const openApiSpec = await masterDataService.fetchSpecFromUrl(
          spec.specUrl
        )

        if (openApiSpec.paths) {
          return Object.keys(openApiSpec.paths).map((path) => {
            const pathItem = openApiSpec.paths[path]

            // Extract description from the first available operation (GET, POST, etc.)
            let pathDescription = `API path specification for ${path} in ${spec.apiGroup}`

            if (pathItem) {
              // Try to get description from the first available operation
              const operations = [
                'get',
                'post',
                'put',
                'patch',
                'delete',
                'head',
                'options',
              ]

              for (const method of operations) {
                const operation = pathItem[method as keyof typeof pathItem]

                if (
                  operation &&
                  typeof operation === 'object' &&
                  'summary' in operation
                ) {
                  const summary = operation.summary || ''
                  const description = operation.description || ''

                  // Combine summary and description if both exist
                  if (summary && description) {
                    pathDescription = `${summary}: ${description}`
                  } else if (summary) {
                    pathDescription = summary
                  } else if (description) {
                    pathDescription = description
                  }

                  break
                }
              }
            }

            return {
              uri: `vtex://api-path/${spec.apiGroup}${path}`,
              name: `${spec.apiGroup}:${path}`,
              description: pathDescription,
              mimeType: 'application/json',
            }
          })
        }

        return []
      } catch (error) {
        // Log error but continue with other resources
        await logToMasterData(ctx, 'mcpRouter', 'middleware', 'warn', {
          data: { apiGroup: spec.apiGroup },
          message: 'Failed to fetch paths for API group',
          error,
        })

        return []
      }
    })

    // Wait for all path resources to be fetched
    const pathResourceArrays = await Promise.all(pathResourcePromises)
    const pathResources = pathResourceArrays.flat()

    const response = {
      resources: pathResources,
    }

    const mcpResponse = {
      jsonrpc: '2.0',
      id: requestBody.id,
      result: response,
    }

    ctx.status = 200
    ctx.body = mcpResponse

    // Log the request for monitoring
    await logToMasterData(ctx, 'mcpRouter', 'middleware', 'info', {
      data: {
        resourcesCount: pathResources.length,
        apiGroups: specsMetadata.map((spec) => spec.apiGroup),
      },
      message: 'MCP resources list retrieved successfully via router',
    })
  } catch (error) {
    // eslint-disable-next-line no-console
    console.log('**** handleResourcesList - error:', error)

    await logToMasterData(ctx, 'mcpRouter', 'middleware', 'error', {
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
    // eslint-disable-next-line no-console
    console.log('**** handleResourcesRead - requestBody:', requestBody)

    // Import required types and services
    const { MasterDataService } = await import('../services/masterDataService')
    const { getValidMethodsForEndpoint } = await import('../utils/mcpUtils')

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

    // Validate params
    if (!requestBody.params || !requestBody.params.uri) {
      ctx.status = 400
      ctx.body = {
        jsonrpc: '2.0',
        id: requestBody.id,
        error: {
          code: -32602,
          message: 'Invalid params - uri is required',
        },
      }

      return
    }

    const { uri } = requestBody.params

    // Initialize MasterData service
    const masterDataService = new MasterDataService(ctx)

    let content: string
    let mimeType: string

    // Parse the URI to determine what to return
    if (uri.startsWith('vtex://api-spec/')) {
      // Full API specification
      const apiGroup = uri.replace('vtex://api-spec/', '')

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

      content = JSON.stringify(openApiSpec, null, 2)
      mimeType = 'application/json'
    } else if (uri.startsWith('vtex://api-path/')) {
      // Specific API path
      const pathPart = uri.replace('vtex://api-path/', '')
      const [apiGroup, ...pathParts] = pathPart.split('/')
      const path = `/${pathParts.join('/')}`

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

      // Find the specific path
      const pathSpec = openApiSpec.paths?.[path]

      if (!pathSpec) {
        ctx.status = 404
        ctx.body = {
          jsonrpc: '2.0',
          id: requestBody.id,
          error: {
            code: -32602,
            message: `Path '${path}' not found in API group '${apiGroup}'`,
          },
        }

        return
      }

      // Return the path specification with metadata
      const pathResponse = {
        group: specMetadata.apiGroup,
        version: specMetadata.version,
        path,
        pathSpec,
        enabled: specMetadata.enabled,
        description: specMetadata.description,
      }

      content = JSON.stringify(pathResponse, null, 2)
      mimeType = 'application/json'
    } else {
      ctx.status = 400
      ctx.body = {
        jsonrpc: '2.0',
        id: requestBody.id,
        error: {
          code: -32602,
          message: `Unsupported URI format: ${uri}`,
        },
      }

      return
    }

    const response = {
      contents: [
        {
          uri,
          mimeType,
          text: content,
        },
      ],
    }

    const mcpResponse = {
      jsonrpc: '2.0',
      id: requestBody.id,
      result: response,
    }

    ctx.status = 200
    ctx.body = mcpResponse

    // Log the request for monitoring
    await logToMasterData(ctx, 'mcpRouter', 'middleware', 'info', {
      data: {
        uri,
        mimeType,
      },
      message: 'MCP resource read successfully via router',
    })
  } catch (error) {
    // eslint-disable-next-line no-console
    console.log('**** handleResourcesRead - error:', error)

    await logToMasterData(ctx, 'mcpRouter', 'middleware', 'error', {
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
  try {
    // eslint-disable-next-line no-console
    console.log('**** handleHandshake - requestBody:', requestBody)

    // Import required services
    const { getValidMethodsForEndpoint } = await import('../utils/mcpUtils')

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
    await logToMasterData(ctx, 'mcpRouter', 'middleware', 'info', {
      data: {
        clientVersion,
        clientCapabilities,
        isVersionCompatible,
        serverCapabilities,
      },
      message: 'MCP handshake completed via router',
    })
  } catch (error) {
    // eslint-disable-next-line no-console
    console.log('**** handleHandshake - error:', error)

    await logToMasterData(ctx, 'mcpRouter', 'middleware', 'error', {
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

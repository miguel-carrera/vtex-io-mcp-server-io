import { json } from 'co-body'

import type {
  MCPRequest,
  MCPResponse,
  MCPResourcesReadRequest,
  MCPResourcesReadResponse,
} from '../types/mcp-protocol'
import { MasterDataService } from '../services/masterDataService'
import { logToMasterData } from '../utils/logging'

/**
 * MCP Resources/Read endpoint
 * POST /_v/mcp_server/v0/mcp/resources/read
 */
export async function mcpResourcesRead(ctx: Context, next: () => Promise<any>) {
  let requestBody: MCPRequest | null = null

  try {
    const { req } = ctx

    requestBody = (await json(req)) as MCPRequest

    // Validate JSON-RPC request
    if (!requestBody || requestBody.jsonrpc !== '2.0' || !requestBody.id) {
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

    // Validate method
    if (requestBody.method !== 'resources/read') {
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

    const { uri } = requestBody.params as MCPResourcesReadRequest

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

    const response: MCPResourcesReadResponse = {
      contents: [
        {
          uri,
          mimeType,
          text: content,
        },
      ],
    }

    const mcpResponse: MCPResponse = {
      jsonrpc: '2.0',
      id: requestBody.id,
      result: response,
    }

    ctx.status = 200
    ctx.body = mcpResponse

    // Log the request for monitoring
    await logToMasterData(ctx, 'mcpResourcesRead', 'middleware', 'info', {
      data: {
        uri,
        mimeType,
      },
      message: 'MCP resource read successfully',
    })

    return next()
  } catch (error) {
    await logToMasterData(ctx, 'mcpResourcesRead', 'middleware', 'error', {
      error,
      message: 'Failed to read MCP resource',
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

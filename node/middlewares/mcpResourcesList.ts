import { json } from 'co-body'

import type {
  MCPRequest,
  MCPResponse,
  MCPResourcesListResponse,
} from '../types/mcp-protocol'
import { MasterDataService } from '../services/masterDataService'
import { logToMasterData } from '../utils/logging'

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
    if (requestBody.method !== 'resources/list') {
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

    // Create MCP resources from API specifications
    /*
    const resources: MCPResource[] = specsMetadata.map((spec) => ({
      uri: `vtex://api-spec/${spec.apiGroup}`,
      name: `${spec.apiGroup} API Specification`,
      description:
        spec.description ?? `OpenAPI specification for ${spec.apiGroup} API`,
      mimeType: 'application/json',
    }))
    */

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
        await logToMasterData(ctx, 'mcpResourcesList', 'middleware', 'warn', {
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

    // resources.push(...pathResources)

    const response: MCPResourcesListResponse = {
      resources: pathResources,
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
        resourcesCount: pathResources.length,
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

import type { MCPApiPathSpecResponse } from '../types/mcp'
import { MasterDataService } from '../services/masterDataService'
import { logToMasterData } from '../utils/logging'

/**
 * Get specific API path specification endpoint
 * GET /_v/mcp_server/v0/api-spec/{group}/{path}
 */
export async function getApiPathSpec(ctx: Context, next: () => Promise<any>) {
  try {
    const { group, 'path*': path } = ctx.vtex.route.params

    if (!group) {
      ctx.status = 400
      ctx.body = {
        success: false,
        error: 'API group parameter is required',
      }

      return
    }

    if (!path) {
      ctx.status = 400
      ctx.body = {
        success: false,
        error: 'API path parameter is required',
      }

      return
    }

    // Initialize MasterData service
    const masterDataService = new MasterDataService(ctx)

    // Get specific API group metadata
    const specMetadata = await masterDataService.getAPISpecByGroup(
      group as string
    )

    if (!specMetadata) {
      ctx.status = 404
      ctx.body = {
        success: false,
        error: `API group '${group}' not found`,
      }

      return
    }

    // Fetch the full OpenAPI specification from the URL
    const openApiSpec = await masterDataService.fetchSpecFromUrl(
      specMetadata.specUrl
    )

    // Decode the path parameter (it might be URL encoded)
    const decodedPath = `/${decodeURIComponent(path as string)}`

    // Find the specific path in the OpenAPI spec
    const pathSpec = openApiSpec.paths?.[decodedPath]

    if (!pathSpec) {
      ctx.status = 404
      ctx.body = {
        success: false,
        error: `Path '${decodedPath}' not found in API group '${group}'`,
      }

      return
    }

    // Count operations for this specific path
    const operationCount = Object.keys(pathSpec).filter((method) =>
      ['get', 'post', 'put', 'patch', 'delete', 'head', 'options'].includes(
        method
      )
    ).length

    const response: MCPApiPathSpecResponse = {
      group: specMetadata.apiGroup,
      version: specMetadata.version,
      path: decodedPath,
      pathSpec,
      operationCount,
      enabled: specMetadata.enabled,
      description: specMetadata.description,
    }

    // Set cache headers
    ctx.set('Cache-Control', 'public, max-age=300') // 5 minutes
    ctx.set('ETag', `"${specMetadata.apiGroup}-${decodedPath}-${Date.now()}"`)

    ctx.status = 200
    ctx.body = {
      success: true,
      data: response,
    }

    // Log the request for monitoring
    await logToMasterData(ctx, 'getApiPathSpec', 'middleware', 'info', {
      data: {
        group,
        path: decodedPath,
        operationCount,
      },
      message: 'API path specification retrieved successfully',
    })

    return next()
  } catch (error) {
    await logToMasterData(ctx, 'getApiPathSpec', 'middleware', 'error', {
      error,
      message: 'Failed to retrieve API path specification',
    })

    ctx.status = 500
    ctx.body = {
      success: false,
      error: 'Internal server error while retrieving API path specification',
    }
  }
}

import type { MCPApiSpecResponse } from '../types/mcp'
import { MasterDataService } from '../services/masterDataService'
import { logToMasterData } from '../utils/logging'

/**
 * Get single API specification endpoint
 * GET /_v/mcp_server/v0/api-spec/{group}
 */
export async function getApiSpec(ctx: Context, next: () => Promise<any>) {
  try {
    const { group } = ctx.vtex.route.params

    if (!group) {
      ctx.status = 400
      ctx.body = {
        success: false,
        error: 'API group parameter is required',
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

    // Count operations in the specification
    const operationCount = masterDataService.countOperations(openApiSpec)

    const response: MCPApiSpecResponse = {
      group: specMetadata.apiGroup,
      version: specMetadata.version,
      spec: openApiSpec,
      operationCount,
      enabled: specMetadata.enabled,
      description: specMetadata.description,
    }

    // Set cache headers
    ctx.set('Cache-Control', 'public, max-age=300') // 5 minutes
    ctx.set(
      'ETag',
      `"${specMetadata.apiGroup}-${specMetadata.version}-${Date.now()}"`
    )

    ctx.status = 200
    ctx.body = {
      success: true,
      data: response,
    }

    // Log the request for monitoring
    await logToMasterData(ctx, 'getApiSpec', 'middleware', 'info', {
      data: {
        group,
        operationCount,
      },
      message: 'API specification retrieved successfully',
    })

    return next()
  } catch (error) {
    await logToMasterData(ctx, 'getApiSpec', 'middleware', 'error', {
      error,
      message: 'Failed to retrieve API specification',
    })

    ctx.status = 500
    ctx.body = {
      success: false,
      error: 'Internal server error while retrieving API specification',
    }
  }
}

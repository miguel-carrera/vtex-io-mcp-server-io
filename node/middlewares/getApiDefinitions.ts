import type { MCPApiDefinitionResponse, APIGroupMetadata } from '../types/mcp'
import { MasterDataService } from '../services/masterDataService'
import { logToMasterData } from '../utils/logging'

/**
 * Get API definitions endpoint
 * GET /_v/mcp_server/v0/api-definitions
 */
export async function getApiDefinitions(
  ctx: Context,
  next: () => Promise<any>
) {
  try {
    const { query } = ctx.request
    const { group } = query

    // Initialize MasterData service
    const masterDataService = new MasterDataService(ctx)

    let apiGroups: APIGroupMetadata[]

    if (group) {
      // Get specific API group
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

      apiGroups = [
        {
          group: specMetadata.apiGroup,
          version: specMetadata.version,
          operationCount: specMetadata.operationCount || 0,
          enabled: specMetadata.enabled,
          description: specMetadata.description,
        },
      ]
    } else {
      // Get all enabled API groups
      const specsMetadata = await masterDataService.getAPISpecs()

      apiGroups = specsMetadata.map((specMetadata) => ({
        group: specMetadata.apiGroup,
        version: specMetadata.version,
        operationCount: specMetadata.operationCount || 0,
        enabled: specMetadata.enabled,
        description: specMetadata.description,
      }))
    }

    // Calculate total number of operations across all specs
    const totalApis = apiGroups.reduce(
      (total, apiGroup) => total + apiGroup.operationCount,
      0
    )

    const response: MCPApiDefinitionResponse = {
      apiGroups,
      totalApis,
    }

    // Set cache headers
    ctx.set('Cache-Control', 'public, max-age=300') // 5 minutes
    ctx.set(
      'ETag',
      `"${Buffer.from(JSON.stringify(response))
        .toString('base64')
        .slice(0, 16)}"`
    )

    ctx.status = 200
    ctx.body = {
      success: true,
      data: response,
    }

    // Log the request for monitoring
    await logToMasterData(ctx, 'getApiDefinitions', 'middleware', 'info', {
      data: {
        group: group || 'all',
        totalGroups: apiGroups.length,
        totalApis,
      },
      message: 'API definitions retrieved successfully',
    })
  } catch (error) {
    await logToMasterData(ctx, 'getApiDefinitions', 'middleware', 'error', {
      error,
      message: 'Failed to retrieve API definitions',
    })

    ctx.status = 500
    ctx.body = {
      success: false,
      error: 'Internal server error while retrieving API definitions',
    }
  }

  return next()
}

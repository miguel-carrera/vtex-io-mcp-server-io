import type { MCPApiDefinitionResponse, APIGroup } from '../types/mcp'
import { MasterDataService } from '../services/masterDataService'

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

    let apiGroups: APIGroup[]

    if (group) {
      // Get specific API group
      const specMetadata = await masterDataService.getAPISpecByGroup(group as string)
      if (!specMetadata) {
        ctx.status = 404
        ctx.body = {
          success: false,
          error: `API group '${group}' not found`,
        }
        return
      }

      // Fetch the actual OpenAPI spec from URL
      const spec = await masterDataService.fetchSpecFromUrl(specMetadata.specUrl)
      
      apiGroups = [{
        group: specMetadata.apiGroup,
        version: specMetadata.version,
        spec: spec,
      }]
    } else {
      // Get all enabled API groups
      const specsMetadata = await masterDataService.getAPISpecs()
      apiGroups = await Promise.all(
        specsMetadata.map(async (specMetadata) => {
          const spec = await masterDataService.fetchSpecFromUrl(specMetadata.specUrl)
          return {
            group: specMetadata.apiGroup,
            version: specMetadata.version,
            spec: spec,
          }
        })
      )
    }

    // Calculate total number of operations across all specs
    const totalApis = apiGroups.reduce((total, group) => {
      const operations = Object.values(group.spec.paths || {}).reduce((pathTotal: number, pathItem: any) => {
        const methods = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options']
        return pathTotal + methods.filter(method => pathItem[method as keyof typeof pathItem]).length
      }, 0)
      return total + operations
    }, 0)

    // Get the most recent lastUpdated timestamp
    const lastUpdated = apiGroups.length > 0 
      ? new Date().toISOString() // In a real implementation, you'd get this from the specs
      : new Date().toISOString()

    const response: MCPApiDefinitionResponse = {
      apiGroups,
      totalApis,
      lastUpdated,
    }

    // Set cache headers
    ctx.set('Cache-Control', 'public, max-age=300') // 5 minutes
    ctx.set('ETag', `"${Buffer.from(JSON.stringify(response)).toString('base64').slice(0, 16)}"`)

    ctx.status = 200
    ctx.body = {
      success: true,
      data: response,
    }

    // Log the request for monitoring
    ctx.vtex.logger.info({
      data: {
        group: group || 'all',
        totalGroups: apiGroups.length,
        totalApis,
      },
      message: 'API definitions retrieved successfully',
    })

  } catch (error) {
    ctx.vtex.logger.error({
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

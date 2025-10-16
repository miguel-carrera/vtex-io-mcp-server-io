import { MasterDataService } from '../services/masterDataService'
import { logToMasterData } from '../utils/logging'

/**
 * Get API definitions filtered by path param `:group`
 * GET /_v/mcp_server/v1/api-definitions/:group
 */
export async function getApiDefinitionsGroup(
  ctx: Context,
  next: () => Promise<any>
) {
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

    const masterDataService = new MasterDataService(ctx)

    const specMetadata = await masterDataService.getAPISpecByGroup(
      String(group)
    )

    if (!specMetadata) {
      ctx.status = 404
      ctx.body = {
        success: false,
        error: `API group '${group}' not found`,
      }

      return
    }

    const openApiSpec = await masterDataService.fetchSpecFromUrl(
      specMetadata.specUrl
    )

    const endpoints: Array<{
      path: string
      method: string
      description?: string
    }> = []

    for (const [path, pathItem] of Object.entries(openApiSpec.paths)) {
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

        if (!op) continue

        // Prefer operation summary/description; fallback to path-level description
        const pathDescription: string | undefined = (pathItem as any)
          .description

        const description: string | undefined =
          op.summary || op.description || pathDescription

        endpoints.push({
          path,
          method: m.toUpperCase(),
          description,
        })
      }
    }

    // Set cache headers
    ctx.set('Cache-Control', 'public, max-age=300')
    ctx.set(
      'ETag',
      `"${specMetadata.apiGroup}-${specMetadata.version}-${endpoints.length}"`
    )

    ctx.status = 200
    ctx.body = {
      success: true,
      data: {
        group: specMetadata.apiGroup,
        version: specMetadata.version,
        endpoints,
      },
    }

    await logToMasterData(ctx, 'getApiDefinitionsGroup', 'middleware', 'info', {
      data: {
        group: specMetadata.apiGroup,
        version: specMetadata.version,
        endpointCount: endpoints.length,
      },
      message: 'API group endpoints listed successfully',
    })

    return next()
  } catch (error) {
    await logToMasterData(
      ctx,
      'getApiDefinitionsGroup',
      'middleware',
      'error',
      error
    )

    ctx.status = 500
    ctx.body = {
      success: false,
      error: 'Internal server error while retrieving API group endpoints',
    }
  }
}

import type { MCPExecuteApiResponse } from '../types/mcp'
import { MasterDataService } from '../services/masterDataService'
import { APIExecutor } from '../utils/apiExecutor'
import { RequestValidator } from '../utils/validator'

/**
 * Execute API endpoint
 * POST /_v/mcp_server/v0/execute-api
 */
export async function executeApi(
  ctx: Context,
  next: () => Promise<any>
) {
  try {
    // Validate request body
    const request = RequestValidator.validateExecuteApiRequest((ctx.request as any).body)

    // Initialize services
    const masterDataService = new MasterDataService(ctx)
    const apiExecutor = new APIExecutor(ctx.clients.vtexApi)

    // Get API specification metadata
    const specMetadata = await masterDataService.getAPISpecByGroup(request.apiGroup)
    if (!specMetadata) {
      ctx.status = 404
      ctx.body = {
        success: false,
        error: `API group '${request.apiGroup}' not found or disabled`,
      }
      return
    }

    // Fetch the actual OpenAPI spec from URL
    const spec = await masterDataService.fetchSpecFromUrl(specMetadata.specUrl)

    // Validate additional parameters
    const pathParams = RequestValidator.validatePathParams(request.pathParams)
    const queryParams = RequestValidator.validateQueryParams(request.queryParams)
    const headers = RequestValidator.validateHeaders(request.parameters)

    // Execute the API operation
    const result = await apiExecutor.executeOperation(spec, {
      apiGroup: request.apiGroup,
      operationId: request.operationId,
      pathParams,
      queryParams,
      headers,
      body: request.body,
    })

    const response: MCPExecuteApiResponse = {
      success: true,
      data: result.data,
      metadata: result.metadata,
    }

    ctx.status = 200
    ctx.body = response

    // Log the successful execution
    ctx.vtex.logger.info({
      data: {
        apiGroup: request.apiGroup,
        operationId: request.operationId,
        executionTime: result.metadata.executionTime,
      },
      message: 'API operation executed successfully',
    })

  } catch (error) {
    // Handle validation errors
    if (error.message && (
      error.message.includes('required') ||
      error.message.includes('must be') ||
      error.message.includes('not found')
    )) {
      ctx.status = 400
      ctx.body = {
        success: false,
        error: error.message,
      }
      return
    }

    // Handle API execution errors
    if (error.error && error.metadata) {
      ctx.status = 500
      ctx.body = {
        success: false,
        error: error.error,
        metadata: error.metadata,
      }
      return
    }

    // Handle unexpected errors
    ctx.vtex.logger.error({
      error,
      data: (ctx.request as any).body,
      message: 'Unexpected error during API execution',
    })

    ctx.status = 500
    ctx.body = {
      success: false,
      error: 'Internal server error during API execution',
    }
  }

  return next()
}

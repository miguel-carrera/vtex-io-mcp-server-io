import type { MCPUploadSpecResponse } from '../types/mcp'
import { MasterDataService } from '../services/masterDataService'
import { RequestValidator } from '../utils/validator'
import { logToMasterData } from '../utils/logging'

/**
 * Upload API specification endpoint (Admin only)
 * POST /_v/mcp_server/v0/admin/upload-spec
 */
export async function uploadApiSpec(ctx: Context, next: () => Promise<any>) {
  try {
    // Check if user has admin privileges
    if (!ctx.vtex.adminUserAuthToken) {
      ctx.status = 403
      ctx.body = {
        success: false,
        error: 'Admin privileges required to upload API specifications',
      }

      return
    }

    // Validate request body
    const request = RequestValidator.validateUploadSpecRequest(
      (ctx.request as any).body
    )

    // Additional validation for API group and version
    RequestValidator.validateApiGroup(request.apiGroup)
    RequestValidator.validateVersion(request.version)

    // Initialize MasterData service
    const masterDataService = new MasterDataService(ctx)

    // Save the API specification
    const result = await masterDataService.saveAPISpec({
      apiGroup: request.apiGroup,
      version: request.version,
      specUrl: request.specUrl,
      enabled: request.enabled || true,
      description: request.description,
    })

    const response: MCPUploadSpecResponse = {
      success: true,
      id: result.id,
      message: `API specification for group '${request.apiGroup}' version '${request.version}' uploaded successfully`,
    }

    ctx.status = 200
    ctx.body = response

    // Log the successful upload
    await logToMasterData(ctx, 'uploadApiSpec', 'middleware', 'info', {
      data: {
        apiGroup: request.apiGroup,
        version: request.version,
        specId: result.id,
        enabled: request.enabled,
        specUrl: request.specUrl,
      },
      message: 'API specification uploaded successfully',
    })
  } catch (error) {
    // Handle validation errors
    if (
      error.message &&
      (error.message.includes('required') ||
        error.message.includes('must be') ||
        error.message.includes('must have') ||
        error.message.includes('can only contain') ||
        error.message.includes('cannot exceed') ||
        error.message.includes('must follow'))
    ) {
      ctx.status = 400
      ctx.body = {
        success: false,
        error: error.message,
      }

      return
    }

    // Handle MasterData errors
    if (error.message && error.message.includes('Failed to save')) {
      ctx.status = 500
      ctx.body = {
        success: false,
        error: 'Failed to save API specification to MasterData',
      }

      return
    }

    // Handle unexpected errors
    await logToMasterData(ctx, 'uploadApiSpec', 'middleware', 'error', {
      error,
      data: (ctx.request as any).body,
      message: 'Unexpected error during API specification upload',
    })

    ctx.status = 500
    ctx.body = {
      success: false,
      error: 'Internal server error during API specification upload',
    }
  }

  return next()
}

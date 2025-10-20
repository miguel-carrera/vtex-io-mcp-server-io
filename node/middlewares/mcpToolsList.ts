import { json } from 'co-body'

import type {
  MCPRequest,
  MCPResponse,
  MCPToolsListResponse,
  MCPTool,
} from '../types/mcp-protocol'
import { MasterDataService } from '../services/masterDataService'
import { logToMasterData } from '../utils/logging'
import { getValidMethodsForEndpoint } from '../utils/mcpUtils'

/**
 * MCP Tools/List endpoint
 * POST /_v/mcp_server/v0/mcp/tools/list
 */
export async function mcpToolsList(ctx: Context, next: () => Promise<any>) {
  let requestBody: MCPRequest | null = null

  try {
    const {
      req,
      state: {
        body: { mcpConfig },
      },
    } = ctx

    requestBody =
      ((ctx.state as any)?.mcpRequest as MCPRequest | undefined) ||
      ((await json(req)) as MCPRequest)

    // Check MCP configuration
    if (!mcpConfig || !mcpConfig.enabled) {
      ctx.status = 403
      ctx.body = {
        jsonrpc: '2.0',
        id: requestBody?.id || null,
        error: {
          code: -32000,
          message: mcpConfig
            ? 'MCP server is disabled for this instance'
            : 'MCP server not found',
        },
      }

      return
    }

    // Validate JSON-RPC request
    if (
      !requestBody ||
      requestBody.jsonrpc !== '2.0' ||
      requestBody.id === undefined ||
      requestBody.id === null
    ) {
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

    // Initialize MasterData service
    const masterDataService = new MasterDataService(ctx)

    // Get all API specifications
    const specsMetadata = await masterDataService.getAPISpecs()

    // Create MCP tools array
    const tools: MCPTool[] = []

    // Add a general VTEX API tool
    const generalTool: MCPTool = {
      name: 'vtex_api_call',
      description: 'Execute any VTEX API operation call dynamically',
      inputSchema: {
        type: 'object',
        properties: {
          apiGroup: {
            type: 'string',
            description: 'The API group (e.g., Orders, Catalog)',
            enum: specsMetadata.map((spec) => spec.apiGroup),
          },
          operationId: {
            type: 'string',
            description: 'The operation ID to execute (preferred)',
          },
          method: {
            type: 'string',
            description: 'HTTP method when using path-based execution',
            enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'],
          },
          path: {
            type: 'string',
            description:
              'OpenAPI path (e.g., /api/catalog/pvt/sku/{id}) when not using operationId',
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
        required: ['apiGroup'],
      },
    }

    tools.push(generalTool)

    // Add a tool to retrieve API path specification for a given operation
    const specTool: MCPTool = {
      name: 'vtex_api_specification',
      description:
        'Retrieve the OpenAPI specification for a VTEX API operation',
      inputSchema: {
        type: 'object',
        properties: {
          apiGroup: {
            type: 'string',
            description: 'The API group (e.g., Orders, Catalog)',
            enum: specsMetadata.map((spec) => spec.apiGroup),
          },
          operationId: {
            type: 'string',
            description:
              'The operation ID to lookup (preferred, falls back to method+path)',
          },
          method: {
            type: 'string',
            description:
              'HTTP method when using path-based lookup (fallback if no operationId)',
            enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'],
          },
          path: {
            type: 'string',
            description:
              'OpenAPI path (e.g., /api/catalog/pvt/sku/{id}) when not using operationId',
          },
        },
        required: ['apiGroup'],
      },
    }

    tools.push(specTool)

    // Build a map of apiGroup -> spec metadata for quick lookup
    const groupToSpecMeta = new Map(
      specsMetadata.map((spec) => [spec.apiGroup, spec])
    )

    // Load favorites for this instance (include global)
    const instance = (ctx.state as any)?.body?.instance as string | undefined
    const favorites = await masterDataService.getFavorites(instance)

    // Helper to sanitize tool names
    const sanitizeName = (name: string) => name.replace(/[^A-Za-z0-9_:-]/g, '_')

    // Helper: map OpenAPI schema type to JSON Schema for tool inputs
    const mapType = (schema: any): any => {
      if (!schema || typeof schema !== 'object') return { type: 'string' }
      const t = (schema.type || '').toString()

      if (t === 'integer' || t === 'number') return { type: 'number' }
      if (t === 'boolean') return { type: 'boolean' }
      if (t === 'array') {
        const items = mapType(schema.items || { type: 'string' })

        return { type: 'array', items }
      }

      return { type: 'string' }
    }

    // Prefetch specs per apiGroup once
    const groupsToFetch = Array.from(
      new Set(favorites.map((f) => f.apiGroup))
    ).filter((g) => {
      const meta = groupToSpecMeta.get(g)

      return !!meta && !!meta.enabled && !!meta.specUrl
    })

    const groupToSpec = new Map<string, any>()

    await Promise.all(
      groupsToFetch.map(async (g) => {
        const meta = groupToSpecMeta.get(g)!

        try {
          const spec = await masterDataService.fetchSpecFromUrl(meta.specUrl)

          groupToSpec.set(g, spec)
        } catch (_) {
          // ignore individual group fetch failures; affected favorites will be skipped
        }
      })
    )

    // For each favorite, derive path/query parameters to build tool input schema
    for (const fav of favorites) {
      const meta = groupToSpecMeta.get(fav.apiGroup)

      if (!meta || !meta.enabled || !meta.specUrl) {
        continue
      }

      try {
        const spec = groupToSpec.get(fav.apiGroup)

        if (!spec) {
          continue
        }

        // Find the operation by operationId (preferred)
        let foundOperation: any = null
        let foundPath: string | null = null
        let foundMethod: string | null = null

        if (spec && spec.paths) {
          const lowerTarget = fav.operationId.toLowerCase()

          for (const [pathKey, pathItem] of Object.entries<any>(spec.paths)) {
            if (!pathItem) continue
            for (const method of [
              'get',
              'post',
              'put',
              'patch',
              'delete',
              'head',
              'options',
            ]) {
              const op = (pathItem as any)[method]

              if (
                op &&
                typeof op === 'object' &&
                'operationId' in op &&
                op.operationId &&
                (op.operationId as string).toLowerCase() === lowerTarget
              ) {
                foundOperation = op
                foundPath = pathKey
                foundMethod = method
                break
              }
            }

            if (foundOperation) break
          }
        }

        // Fallback by method+path if not found and favorite provides them
        if (
          !foundOperation &&
          fav.httpMethod &&
          fav.path &&
          spec?.paths?.[fav.path]
        ) {
          const op = (spec.paths as any)[fav.path][fav.httpMethod.toLowerCase()]

          if (op) {
            foundOperation = op
            foundPath = fav.path
            foundMethod = fav.httpMethod.toLowerCase()
          }
        }

        if (!foundOperation) {
          continue
        }

        const inputProperties: Record<string, any> = {}
        const required: string[] = []

        const params: any[] = Array.isArray(foundOperation.parameters)
          ? foundOperation.parameters
          : []

        for (const p of params) {
          if (!p || typeof p !== 'object' || !('in' in p) || !('name' in p)) {
            continue
          }

          if (p.in !== 'path' && p.in !== 'query') continue
          const propName = p.name as string
          const schema = (p as any).schema || { type: 'string' }
          const mapped = mapType(schema)
          const prop: any = {
            ...mapped,
          }

          if (p.description) prop.description = p.description
          if (schema.enum) prop.enum = schema.enum
          if (schema.format) prop.format = schema.format

          inputProperties[propName] = prop
          if (p.required || p.in === 'path') required.push(propName)
        }

        const toolName = sanitizeName(`${fav.apiGroup}_${fav.operationId}`)
        const description =
          fav.description ||
          `Execute ${fav.apiGroup}.${fav.operationId}${
            foundPath ? ` (${foundMethod?.toUpperCase()} ${foundPath})` : ''
          }`

        tools.push({
          name: toolName,
          description,
          inputSchema: {
            type: 'object',
            properties: inputProperties,
            ...(required.length > 0 ? { required } : {}),
          },
        })
      } catch (e) {
        // Skip on per-favorite errors; they are logged centrally when fetching specs
        continue
      }
    }

    const response: MCPToolsListResponse = {
      tools,
    }

    const mcpResponse: MCPResponse = {
      jsonrpc: '2.0',
      id: requestBody.id,
      result: response,
    }

    ctx.status = 200
    ctx.body = mcpResponse

    // Log the request for monitoring
    await logToMasterData(ctx, 'mcpToolsList', 'middleware', 'info', {
      data: {
        toolsCount: tools.length,
        apiGroups: specsMetadata.map((spec) => spec.apiGroup),
      },
      message: 'MCP tools list retrieved successfully',
    })

    return next()
  } catch (error) {
    await logToMasterData(ctx, 'mcpToolsList', 'middleware', 'error', {
      error,
      message: 'Failed to retrieve MCP tools list',
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

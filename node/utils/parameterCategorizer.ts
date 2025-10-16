import type { OpenAPISpec, OpenAPIOperation } from '../types/openapi'

/**
 * Utility to categorize parameters based on OpenAPI specification
 */

export interface CategorizedParameters {
  pathParams: Record<string, any>
  queryParams: Record<string, any>
  headers: Record<string, any>
}

/**
 * Categorizes parameters based on their location in the OpenAPI specification
 * @param openApiSpec - The OpenAPI specification
 * @param operationId - The operation ID to find parameters for
 * @param providedParams - The parameters provided by the user
 * @returns Categorized parameters
 */
export function categorizeParameters(
  openApiSpec: OpenAPISpec,
  operationOrLocator: string | { method: string; path: string },
  providedParams: Record<string, any>
): CategorizedParameters {
  const result: CategorizedParameters = {
    pathParams: {},
    queryParams: {},
    headers: {},
  }

  // Find the operation
  let operation: OpenAPIOperation | null = null

  if (typeof operationOrLocator === 'string') {
    operation = findOperation(openApiSpec, operationOrLocator)
  } else {
    operation = findOperationByPathAndMethod(
      openApiSpec,
      operationOrLocator.method,
      operationOrLocator.path
    )
  }

  if (!operation || !operation.parameters) {
    // If no operation found or no parameters defined, treat all as query params
    return {
      pathParams: {},
      queryParams: providedParams,
      headers: {},
    }
  }

  // Categorize each provided parameter
  for (const [paramName, paramValue] of Object.entries(providedParams)) {
    const paramDef = operation.parameters.find(
      (p) => 'name' in p && p.name === paramName
    )

    if (paramDef && 'in' in paramDef) {
      switch (paramDef.in) {
        case 'path':
          result.pathParams[paramName] = paramValue
          break

        case 'query':
          result.queryParams[paramName] = paramValue
          break

        case 'header':
          result.headers[paramName] = paramValue
          break

        default:
          // For any other location (like 'cookie'), treat as query param
          result.queryParams[paramName] = paramValue
          break
      }
    } else {
      // If parameter not found in spec, treat as query param
      result.queryParams[paramName] = paramValue
    }
  }

  return result
}

/**
 * Finds an operation by its operationId in the OpenAPI specification
 * @param spec - The OpenAPI specification
 * @param operationId - The operation ID to find
 * @returns The operation or null if not found
 */
function findOperation(
  spec: OpenAPISpec,
  operationId: string
): OpenAPIOperation | null {
  const targetId = operationId.toLowerCase()

  if (!spec.paths) {
    return null
  }

  for (const pathItem of Object.values(spec.paths)) {
    if (!pathItem) continue

    const methods = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options']

    for (const method of methods) {
      const operation = pathItem[method as keyof typeof pathItem]

      if (
        operation &&
        typeof operation === 'object' &&
        'operationId' in operation &&
        operation.operationId &&
        (operation.operationId as string).toLowerCase() === targetId
      ) {
        return operation as OpenAPIOperation
      }
    }
  }

  return null
}

/**
 * Finds an operation by explicit method and path
 */
function findOperationByPathAndMethod(
  spec: OpenAPISpec,
  method: string,
  path: string
): OpenAPIOperation | null {
  const pathItem = (spec.paths as any)[path]

  if (!pathItem) return null

  const op = pathItem[method.toLowerCase()]

  return (op || null) as OpenAPIOperation | null
}

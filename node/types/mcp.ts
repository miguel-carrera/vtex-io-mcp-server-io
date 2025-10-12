// MCP (Model Context Protocol) request/response types

export interface MCPApiDefinitionRequest {
  group?: string // Optional filter by API group
}

export interface MCPApiDefinitionResponse {
  apiGroups: APIGroupMetadata[]
  totalApis: number
}

export interface APIGroupMetadata {
  group: string
  version: string
  operationCount: number
  enabled: boolean
  description?: string
}

export interface APIGroup {
  group: string
  version: string
  spec: import('./openapi').OpenAPISpec
}

export interface MCPApiSpecResponse {
  group: string
  version: string
  spec: import('./openapi').OpenAPISpec
  operationCount: number
  enabled: boolean
  description?: string
}

export interface MCPApiPathSpecResponse {
  group: string
  version: string
  path: string
  pathSpec: import('./openapi').OpenAPIPathItem
  operationCount: number
  enabled: boolean
  description?: string
}

export interface MCPExecuteApiRequest {
  apiGroup: string
  operationId: string
  parameters?: Record<string, any>
  pathParams?: Record<string, any>
  queryParams?: Record<string, any>
  body?: any
}

export interface MCPExecuteApiResponse {
  success: boolean
  data?: any
  error?: string
  metadata: {
    executionTime: number
    apiGroup: string
    operationId: string
  }
}

export interface MCPUploadSpecRequest {
  apiGroup: string
  version: string
  specUrl: string
  enabled?: boolean
  description?: string
}

export interface MCPUploadSpecResponse {
  success: boolean
  id: string
  message: string
}

// Re-export OpenAPI types from the dedicated module
export type {
  OpenAPISpec,
  OpenAPIPathItem as PathItem,
  OpenAPIOperation as Operation,
  OpenAPIParameter as Parameter,
  OpenAPIRequestBody as RequestBody,
  OpenAPIMediaType as MediaType,
  OpenAPIResponse as Response,
} from './openapi'

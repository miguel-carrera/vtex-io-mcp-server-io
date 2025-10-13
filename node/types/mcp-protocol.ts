// Model Context Protocol (MCP) types and interfaces

export interface MCPRequest {
  jsonrpc: '2.0'
  id: string | number
  method: string
  params?: Record<string, any>
}

export interface MCPResponse {
  jsonrpc: '2.0'
  id: string | number
  result?: any
  error?: MCPError
}

export interface MCPError {
  code: number
  message: string
  data?: any
}

// MCP Standard Methods
export type MCPMethod =
  | 'tools/list'
  | 'tools/call'
  | 'resources/list'
  | 'resources/read'
  | 'initialize'
  | 'notifications/initialized'

// Tool Definition
export interface MCPTool {
  name: string
  description: string
  inputSchema: {
    type: 'object'
    properties: Record<string, any>
    required?: string[]
  }
}

// Resource Definition
export interface MCPResource {
  uri: string
  name: string
  description?: string
  mimeType?: string
}

// Tools/List Response
export interface MCPToolsListResponse {
  tools: MCPTool[]
}

// Tools/Call Request
export interface MCPToolsCallRequest {
  name: string
  arguments: Record<string, any>
}

// Tools/Call Response
export interface MCPToolsCallResponse {
  content: Array<{
    type: 'text' | 'image' | 'resource'
    text?: string
    data?: string
    mimeType?: string
  }>
  isError?: boolean
}

// Resources/List Response
export interface MCPResourcesListResponse {
  resources: MCPResource[]
}

// Resources/Read Request
export interface MCPResourcesReadRequest {
  uri: string
}

// Resources/Read Response
export interface MCPResourcesReadResponse {
  contents: Array<{
    uri: string
    mimeType: string
    text?: string
    blob?: string
  }>
}

// Initialize Request
export interface MCPInitializeRequest {
  protocolVersion: string
  capabilities: {
    tools?: Record<string, unknown>
    resources?: Record<string, unknown>
  }
  clientInfo: {
    name: string
    version: string
  }
}

// Initialize Response
export interface MCPInitializeResponse {
  protocolVersion: string
  capabilities: {
    tools?: Record<string, unknown>
    resources?: Record<string, unknown>
  }
  serverInfo: {
    name: string
    version: string
  }
}

/**
 * MCP Configuration interface for MasterData v2
 */
export interface MCPConfig {
  /** VTEX instance identifier (e.g., myaccount, myaccountvtexio) */
  instance: string
  /** Whether this MCP server configuration is active */
  enabled: boolean
  /** Human-readable description of this MCP server configuration */
  description?: string
  /** HTTP methods to disable for API publishing */
  disabledMethods?: HTTPMethod[]
  /** Whether to exclude favorite APIs from being published */
  excludeFavorites?: boolean
}

/**
 * HTTP methods that can be disabled
 */
export type HTTPMethod = 'GET' | 'POST' | 'PUT' | 'DELETE'

/**
 * MCP Configuration response from MasterData
 */
export interface MCPConfigResponse {
  /** Document ID from MasterData */
  id: string
  /** Configuration data */
  data: MCPConfig
  /** Document metadata */
  metadata?: {
    createdIn: string
    updatedIn: string
    createdBy: string
    updatedBy: string
  }
}

/**
 * Default MCP Configuration
 */
export const DEFAULT_MCP_CONFIG: MCPConfig = {
  instance: '',
  enabled: true,
  description: '',
  disabledMethods: [],
  excludeFavorites: false,
}

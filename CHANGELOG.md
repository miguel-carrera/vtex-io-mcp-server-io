# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/en/1.0.0/)
and this project adheres to [Semantic Versioning](http://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.3.0] - 2025-10-20

### Added

- Dynamic MCP tools generated from MasterData favorites
  - Tools are created for each enabled `vtex_mcp_favorites` document (global or per-instance)
  - Tool name format: `apiGroup_operationId`
  - Tool `inputSchema` is derived from the operation's OpenAPI parameters (path + query)
  - Required fields are enforced for path params and any parameter marked `required` in the spec
  - Supports fallback lookup by `httpMethod` + `path` if `operationId` matching is unavailable

### Changed

- `mcp/tools/list` now appends favorite-based tools after the general tools

### Technical Improvements

- Added `getFavorites(instance)` to `MasterDataService` (cached, schema `favorites`)
- Favorites fetched using filter `enabled=true AND (instance={instance} OR instance="")`

## [1.2.0] - 2025-10-18

### Added

- **Instance-Based Configuration**: Per-instance MCP server configuration through MasterData v2
  - New `vtex_mcp_configs` data entity for storing instance-specific configurations
  - Automatic instance detection from URL parameters (e.g., "myaccount" from `https://myaccount.myvtex.com/`)
  - HTTP method filtering per instance (disable GET, POST, PUT, DELETE methods)
  - Configuration validation across all MCP endpoints
  - Default configuration support when no instance-specific config exists
- **Favorites Management**: Mark and manage favorite API operations per instance
  - New `vtex_mcp_favorites` data entity for storing favorite operations
  - Instance-specific favorites with operation metadata
  - Option to exclude favorites from published API lists
- **Enhanced Configuration Validation**: All MCP endpoints now validate instance configuration
  - Returns "MCP server not found" when no configuration exists for the instance
  - Returns "MCP server is disabled for this instance" when configuration is disabled
  - Early validation after request parsing for better performance
- **MasterData Integration**: Enhanced MasterData v2 integration for configuration management
  - Automatic configuration loading in `initialLoad` middleware
  - Proper error handling and logging for configuration operations
  - Type-safe configuration interfaces and validation
- **Configuration Loading**:
  - MCP configuration is now loaded automatically from MasterData v2 based on instance
- **Method Filtering**:
  - HTTP methods are filtered based on instance configuration in `mcpResourcesRead`
- **Error Handling**:
  - Enhanced error responses with proper JSON-RPC error codes for configuration validation
- **Documentation**:
  - Updated README and API documentation to include instance-based configuration features

### Technical Improvements

- **Type Safety**: Added `MCPConfig` interface and related types for configuration management
- **Performance**: Configuration validation moved to early in request processing pipeline
- **Code Organization**: Improved middleware structure with consistent configuration validation patterns

## [1.1.0] - 2025-10-16

### Added

- Method+path fallback for MCP tools execution when `operationId` is unavailable.
- Extended `APIExecutor` to accept `operationId` or `{ method, path }` and added `findOperationByPathAndMethod`.
- Updated `parameterCategorizer` to resolve operation by `operationId` or `{ method, path }`.
- `mcpToolsCall` now accepts `method` and `path` when `operationId` is not provided and validates at least one approach is present.
- `mcpToolsList` tool input schema documents `method` and `path` alongside preferred `operationId`.
- Documentation updated to reflect operation selection flexibility and new examples.
- New MCP tool `vtex_api_specification` to return the OpenAPI path specification for an operation (accepts `operationId` or falls back to `method` + `path`).

### Changed

- `resources/read` response for `vtex://api-spec/` now returns endpoints with `path`, `method` (uppercase), and optional `operationId` instead of `uri`.

### Removed

- `resources/read` no longer supports `vtex://api-path/` URIs (use the `vtex_api_specification` tool instead).

## [1.0.1] - 2025-10-16

### Added

- Generic MCP route `/_v/mcp_server/v1/mcp` in `service.json` and `index.ts`.
- Central `mcpRouter` to dispatch JSON-RPC 2.0 MCP methods.
- Support for MCP protocol versions `2025-03-26` and `2025-06-18`.

### Fixed

- JSON-RPC `id` validation across middlewares to accept numeric ids (including `0`).
- Implemented `notifications/initialized` handling in `mcpRouter` (HTTP 200, no body).
- Resolved multiple stream consumption errors by implementing handlers directly in router:
  - `tools/list`
  - `tools/call`
  - `resources/list`
  - `resources/read`
  - `handshake`
- Eliminated "argument stream must be a stream" and "stream is not readable" errors caused by delegating to middlewares after body consumption.
- Fixed tools listing internal error and preserved required request properties when delegating.

## [1.0.0] - 2025-10-13

### Added

#### Core MCP Server Implementation

- **Model Context Protocol (MCP) Server**: Complete implementation of MCP server based on VTEX IO
- **REST API Endpoints**: 5 REST endpoints for API discovery and execution
- **MCP Protocol Endpoints**: 7 MCP-compliant endpoints for AI assistant integration
- **JSON-RPC 2.0 Support**: Full compliance with JSON-RPC 2.0 specification

#### API Management

- **API Specification Storage**: MasterData v2 integration for storing API specification URLs
- **Dynamic API Discovery**: Endpoint to discover available API groups and specifications
- **Individual API Spec Retrieval**: Endpoints to fetch specific API specifications by group and path
- **OpenAPI Specification Support**: Full support for OpenAPI 3.x specifications
- **URL-based Spec Storage**: Store OpenAPI specification URLs instead of full specs for efficiency

#### Authentication & Security

- **Dual Authentication System**: Support for both cookie-based and API key-based authentication
- **Role-Based Access Control**: Admin and store-user role management via Sphinx
- **VTEX ID Integration**: Complete VTEX ID authentication client
- **Secure API Execution**: All API calls require proper authentication

#### Dynamic API Execution

- **Generic API Client**: VTEXAPIClient for executing any VTEX API endpoint
- **Parameter Categorization**: Automatic categorization of path, query, and header parameters
- **OpenAPI Validation**: Request validation based on OpenAPI specifications
- **Content-Type Propagation**: Proper content type handling and propagation
- **Error Mapping**: HTTP errors mapped to MCP-compliant error responses

#### MCP Tools & Resources

- **MCP Tools**: `vtex_api_call` tool for dynamic API execution
- **MCP Resources**: API specifications exposed as MCP resources
- **Resource Discovery**: List available API specifications as MCP resources
- **Resource Reading**: Read specific API specifications via MCP protocol

#### Caching & Performance

- **IO Client Caching**: Leverages VTEX IO HTTP client caching for OpenAPI specs
- **Concurrent Processing**: Parallel fetching of multiple API specifications
- **Optimized Data Flow**: Efficient data retrieval and processing pipeline

#### Logging & Monitoring

- **Centralized Logging**: All operations logged to MasterData for monitoring
- **Error Tracking**: Comprehensive error logging and tracking
- **Performance Metrics**: Execution time and metadata tracking

#### Developer Experience

- **TypeScript Support**: Full TypeScript implementation with comprehensive type definitions
- **OpenAPI Types**: Complete TypeScript types for OpenAPI 3.x specifications
- **MCP Protocol Types**: Full TypeScript support for MCP protocol
- **Error Handling**: Robust error handling with descriptive error messages

#### Documentation

- **Comprehensive Documentation**: Complete API documentation with examples
- **Technical Architecture**: Detailed architecture documentation
- **Authentication Guide**: Complete authentication documentation

### Technical Details

#### Dependencies

- **Node.js**: Updated to version 20+ for compatibility
- **TypeScript**: Updated to version 4.9.5
- **VTEX IO**: Full integration with VTEX IO platform

#### MasterData Schema

- **Data Entity**: `vtex_mcp_api_specs` for storing API specification metadata
- **Schema Fields**: `apiGroup`, `version`, `specUrl`, `enabled`, `description`, `operationCount`
- **Indexing**: Optimized indexing for efficient queries

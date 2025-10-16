# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/en/1.0.0/)
and this project adheres to [Semantic Versioning](http://semver.org/spec/v2.0.0.html).

## [Unreleased]

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

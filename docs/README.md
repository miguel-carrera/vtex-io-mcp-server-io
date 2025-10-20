# VTEX IO MCP Server

A Model Context Protocol (MCP) server implementation for VTEX IO that enables LLMs to discover and execute VTEX APIs dynamically through OpenAPI specifications.

## Overview

This MCP server provides a standardized interface for Large Language Models (LLMs) to interact with VTEX APIs. It allows LLMs to:

1. **Discover** available VTEX API endpoints through OpenAPI specifications
2. **Execute** any VTEX API call dynamically based on stored specifications
3. **Manage** API specifications through admin endpoints

## Features

- 🔍 **API Discovery**: Retrieve structured API definitions for LLM consumption
- ⚡ **Dynamic Execution**: Execute any VTEX API call based on OpenAPI specs
- 📝 **Specification Management**: Upload and manage OpenAPI specification URLs
- 🏢 **Instance-Based Configuration**: Per-instance MCP server configuration with method filtering
- ⭐ **Favorites Management**: Mark and manage favorite API operations per instance
  - Dynamic MCP tools are generated from favorites: each favorite becomes a tool named `apiGroup_operationId` with input schema matching path and query parameters
- 🔐 **Secure Authentication**: Built-in VTEX IO authentication and authorization
- 📊 **Centralized Logging**: All operations logged to MasterData for monitoring
- 🚀 **High Performance**: Built-in caching and optimized data retrieval

## Architecture

The server is built on VTEX IO and consists of:

- **HTTP Endpoints**: REST API for MCP client communication
- **Authentication Layer**: Dual authentication (cookie-based and API key-based)
- **Instance-Based Configuration**: Per-instance MCP server settings and method filtering
- **MasterData Integration**: Stores API specification metadata and configurations
- **Dynamic API Client**: Executes external API calls with caching
- **OpenAPI Parser**: Validates and processes OpenAPI specifications
- **Centralized Logging**: Comprehensive logging system

## Authentication

The server supports two authentication methods:

### User Authentication (Cookie-based)

- **Header**: `vtexidclientautcookie`
- **Purpose**: Authenticates store users and admins
- **User Roles**:
  - `admin`: Full access to all endpoints
  - `store-user`: Standard user access

### App Authentication (API Key-based)

- **Headers**: `x-vtex-api-appkey` and `x-vtex-api-apptoken`
- **Purpose**: Authenticates applications using API keys
- **Access Level**: Admin-level access

## API Endpoints

### 1. Get API Definitions

```
GET /_v/mcp_server/v1/api-definitions
```

Retrieve all available API definitions for LLM consumption.

**Query Parameters:**

- `group` (optional): Filter by specific API group

### 2. Execute API

```
POST /_v/mcp_server/v1/execute-api
```

Dynamically execute any VTEX API call based on OpenAPI specifications.

**Request Body:**

```json
{
  "apiGroup": "OMS",
  "operationId": "getOrders",
  "pathParams": { "orderId": "v123456-01" },
  "queryParams": { "page": 1, "per_page": 10 },
  "headers": { "Accept": "application/json" },
  "body": { "status": "invoiced" }
}
```

### 3. Upload API Specification (Admin)

```
POST /_v/mcp_server/v1/admin/upload-spec
```

Upload or update OpenAPI specification URLs to MasterData.

**Request Body:**

```json
{
  "apiGroup": "OMS",
  "version": "1.0",
  "specUrl": "https://developers.vtex.com/api/openapi/orders-api",
  "description": "Order Management System API",
  "tags": ["orders", "oms", "commerce"],
  "enabled": true
}
```

## Instance-Based Configuration

The MCP server supports per-instance configuration through MasterData v2, allowing you to customize the server behavior for different VTEX instances.

### Configuration Features

- **Instance-Specific Settings**: Each VTEX instance can have its own MCP server configuration
- **HTTP Method Filtering**: Disable specific HTTP methods (GET, POST, PUT, DELETE) per instance
- **Favorites Management**: Mark and manage favorite API operations per instance
- **Default Configuration**: Fallback configuration when no instance-specific config exists

### Configuration Schema

The `vtex_mcp_configs` data entity stores instance configurations:

- `instance`: VTEX instance identifier (e.g., "myaccount", "myaccountvtexio"). Empty for default configuration
- `enabled`: Whether this MCP server configuration is active
- `description`: Human-readable description of the configuration
- `disabledMethods`: Array of HTTP methods to disable (GET, POST, PUT, DELETE)
- `excludeFavorites`: Whether to exclude favorite APIs from being published

### Example Configuration

```json
{
  "instance": "myaccount",
  "enabled": true,
  "description": "Production MCP server configuration for myaccount instance",
  "disabledMethods": ["DELETE"],
  "excludeFavorites": false
}
```

### URL Structure

The MCP server automatically detects the instance from the URL:

```
https://myaccount.myvtex.com/_v/mcp_server/v1/mcp/tools/list
```

The instance "myaccount" is extracted and used to load the appropriate configuration.

## Data Storage

### API Specifications

API specification metadata is stored in MasterData v2 using the `vtex_mcp_api_specs` data entity:

- `apiGroup`: Category/group name (e.g., "OMS", "Catalog")
- `version`: API version (e.g., "1.0", "2.0")
- `specUrl`: URL to the OpenAPI 3.0 specification
- `description`: Human-readable description
- `tags`: Array of tags for categorization
- `enabled`: Whether the API group is active
- `lastUpdated`: ISO timestamp of last update

### Favorites

Favorite API operations are stored in MasterData v2 using the `vtex_mcp_favorites` data entity:

- `instance`: VTEX instance identifier
- `apiGroup`: API group name (e.g., "Orders", "Catalog")
- `operationId`: Unique identifier for the API operation
- `enabled`: Whether this favorite is active
- `description`: Human-readable description
- `httpMethod`: HTTP method for the operation
- `path`: API endpoint path

## Installation

### Prerequisites

- Node.js 20+
- VTEX CLI
- VTEX account with IO development access

### Setup

1. **Clone the repository:**

   ```bash
   git clone <repository-url>
   cd vtex-io-mcp-server-io
   ```

2. **Install dependencies:**

   ```bash
   npm install
   ```

3. **Configure VTEX CLI:**

   ```bash
   vtex login
   vtex use <workspace>
   ```

4. **Deploy to development:**
   ```bash
   vtex link
   ```

## Configuration

### Environment Variables

The server uses VTEX IO's built-in configuration system. No additional environment variables are required.

### MasterData Schema

The server automatically creates the required MasterData schema (`vtex_mcp_api_specs`) during deployment.

## Usage Examples

### 1. Upload an API Specification

```bash
curl -X POST "https://myaccount.myvtex.com/_v/mcp_server/v1/admin/upload-spec" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "apiGroup": "OMS",
    "version": "1.0",
    "specUrl": "https://developers.vtex.com/api/openapi/orders-api",
    "description": "Order Management System API",
    "tags": ["orders", "oms", "commerce"],
    "enabled": true
  }'
```

### 2. Get API Definitions

```bash
curl -X GET "https://myaccount.myvtex.com/_v/mcp_server/v1/api-definitions" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 3. Execute an API Call

```bash
curl -X POST "https://myaccount.myvtex.com/_v/mcp_server/v1/execute-api" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "apiGroup": "OMS",
    "operationId": "getOrders",
    "queryParams": {
      "page": 1,
      "per_page": 10
    }
  }'
```

## Integration with LLMs

This MCP server is designed to work with LLMs that support the Model Context Protocol:

1. **Discovery Phase**: LLM calls `getApiDefinitions` to understand available APIs
2. **Execution Phase**: LLM calls `executeApi` with specific parameters to perform actions
3. **Management Phase**: Admins can upload new API specification URLs via `uploadApiSpec`

The OpenAPI specifications provide the LLM with:

- Available operations and their descriptions
- Required and optional parameters
- Expected request/response formats
- Authentication requirements

## Security

- **Authentication**: All endpoints require VTEX IO authentication
- **Authorization**: Admin endpoints require additional privileges
- **Validation**: All inputs are validated and sanitized
- **Logging**: All operations are logged for audit purposes
- **Rate Limiting**: Respects VTEX IO's built-in rate limiting

## Caching

- **OpenAPI Specifications**: Cached by VTEX IO's HTTP client when fetched from URLs
- **API Definitions**: Cached for 5 minutes to improve performance
- **Cache Invalidation**: Automatic cache clearing when specifications are updated

## Monitoring and Logging

All operations are logged to MasterData using the centralized logging system:

- **Success Operations**: Logged with execution details
- **Error Operations**: Logged with error context and stack traces
- **Performance Metrics**: Execution times and response sizes
- **Audit Trail**: Complete history of all API operations

## Development

### Project Structure

```
├── docs/                    # Documentation
├── masterdata/             # MasterData schemas
├── node/                   # Main application code
│   ├── clients/           # HTTP clients
│   ├── middlewares/       # API endpoints
│   ├── services/          # Business logic
│   ├── types/             # TypeScript definitions
│   └── utils/             # Utility functions
├── manifest.json          # VTEX IO manifest
└── package.json           # Dependencies
```

### Running Tests

```bash
npm test
```

### Linting

```bash
npm run lint
```

### Formatting

```bash
npm run format
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the UNLICENSED license.

## Support

For support and questions:

- Create an issue in the repository
- Contact the development team
- Check the VTEX IO documentation

## Changelog

See [CHANGELOG.md](../CHANGELOG.md) for version history and updates.

---

**Built with ❤️ for the VTEX ecosystem**

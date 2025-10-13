# IO MCP SERVER Endpoints

This document describes the available API endpoints for the MCP (Model Context Protocol) server implementation in VTEX IO.

## Overview

The MCP server provides two sets of endpoints:

**REST API Endpoints (5 endpoints):**

1. Discover available VTEX API endpoints through OpenAPI specifications
2. Retrieve individual API group specifications in detail
3. Retrieve specific API path specifications for granular access
4. Execute any VTEX API call dynamically based on stored specifications
5. Upload and manage API specifications (admin only)

**MCP Protocol Endpoints (7 endpoints):** 6. MCP handshake for connection verification 7. Initialize MCP connection and negotiate capabilities 8. Handle MCP initialization notification 9. List available tools for AI assistant integration 10. Execute tools via MCP protocol 11. List available resources (API specifications) 12. Read specific resources (API specifications)

## Base URL

All endpoints are available at: `https://{account}.myvtex.com/_v/mcp_server/v0/`

## Authentication

All endpoints require VTEX authentication. The server supports two authentication methods:

### 1. User Authentication (Cookie-based)

- **Header**: `vtexidclientautcookie`
- **Purpose**: Authenticates store users and admins
- **User Roles**:
  - `admin`: Full access to all endpoints
  - `store-user`: Standard user access

### 2. App Authentication (API Key-based)

- **Headers**: `x-vtex-api-appkey` and `x-vtex-api-apptoken`
- **Purpose**: Authenticates applications using API keys
- **Access Level**: Admin-level access

### Authentication Flow

1. **Cookie Authentication**: Validates user session and determines role (admin/store-user)
2. **API Key Authentication**: Validates app credentials and grants admin access
3. **Authorization**: At least one authentication method must be valid to proceed
4. **Error Handling**: Returns 401 Authentication Error if no valid authentication is provided

## Recent Improvements

### Content Type Handling

- **Automatic Content-Type Detection**: API responses now properly capture and propagate `Content-Type` headers
- **MCP Response Format**: MCP tools/call responses include `mimeType` field indicating the original response format
- **Flexible Header Support**: Handles both `content-type` and `Content-Type` header formats

### Header Management

- **Mandatory Headers**: Automatically adds `Accept: */*` and `Content-Type: application/json` to all API requests
- **Smart Validation**: Skips validation for mandatory headers that are automatically handled by the system
- **Header Priority**: Custom headers can override defaults when needed

### MCP Protocol Compliance

- **JSON-RPC 2.0**: Full compliance with JSON-RPC 2.0 specification
- **Standard Methods**: Implements all standard MCP methods (`tools/list`, `tools/call`, `resources/list`, `resources/read`)
- **Error Handling**: Proper MCP error codes and message formatting
- **Content Types**: Correct `type: 'text'` with `mimeType` for structured data responses

### API Execution Improvements

- **Relative URLs**: VTEXAPIClient now uses relative URLs (paths only) as required by VTEX IO
- **Enhanced Error Handling**: HTTP status codes and error messages are now properly mapped to MCP error responses using consistent JSON-RPC 2.0 error codes
- **Promise Handling**: Proper promise return patterns for HTTP client methods
- **Response Metadata**: Enhanced metadata including execution time, content type, and response headers

## Endpoints

### 1. Get API Definitions

**Endpoint:** `GET /_v/mcp_server/v0/api-definitions`

**Purpose:** Discover available API groups and their metadata (for detailed specs, use the individual API spec endpoint)

**Query Parameters:**

- `group` (optional): Filter by specific API group (e.g., "OMS", "Catalog")

**Response:**

```json
{
  "success": true,
  "data": {
    "apiGroups": [
      {
        "group": "OMS",
        "version": "1.0",
        "operationCount": 45,
        "enabled": true,
        "description": "Order Management System API"
      },
      {
        "group": "Catalog",
        "version": "2.0",
        "operationCount": 32,
        "enabled": true,
        "description": "Product Catalog API"
      }
    ],
    "totalApis": 77
  }
}
```

**Example Usage:**

```bash
# Get all API definitions
curl -X GET "https://myaccount.myvtex.com/_v/mcp_server/v0/api-definitions" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Get specific API group
curl -X GET "https://myaccount.myvtex.com/_v/mcp_server/v0/api-definitions?group=OMS" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 2. Get Single API Specification

**Endpoint:** `GET /_v/mcp_server/v0/api-spec/{group}`

**Purpose:** Retrieve a specific API group's complete OpenAPI specification

**Path Parameters:**

- `group` (required): The API group name (e.g., "OMS", "Catalog")

**Response:**

```json
{
  "success": true,
  "data": {
    "group": "OMS",
    "version": "1.0",
    "spec": {
      "openapi": "3.0.0",
      "info": {
        "title": "OMS API",
        "version": "1.0.0",
        "description": "Order Management System API"
      },
      "servers": [
        {
          "url": "https://{account}.vtexcommercestable.com.br",
          "description": "VTEX Commerce API"
        }
      ],
      "paths": {
        "/api/oms/pvt/orders": {
          "get": {
            "operationId": "getOrders",
            "summary": "Get orders",
            "parameters": [
              {
                "name": "page",
                "in": "query",
                "required": false,
                "schema": {
                  "type": "integer",
                  "default": 1
                }
              }
            ],
            "responses": {
              "200": {
                "description": "Success",
                "content": {
                  "application/json": {
                    "schema": {
                      "type": "object",
                      "properties": {
                        "list": {
                          "type": "array",
                          "items": {
                            "type": "object"
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    "operationCount": 45,
    "enabled": true,
    "description": "Order Management System API"
  }
}
```

**Example Usage:**

```bash
# Get specific API group specification
curl -X GET "https://myaccount.myvtex.com/_v/mcp_server/v0/api-spec/OMS" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 3. Get API Path Specification

**Endpoint:** `GET /_v/mcp_server/v0/api-spec/{group}/{path}`

**Purpose:** Retrieve a specific API path's OpenAPI specification for granular access

**Path Parameters:**

- `group` (required): The API group name (e.g., "OMS", "Catalog")
- `path` (required): The specific API path (e.g., "/api/oms/pvt/orders", "/api/catalog/pvt/product")

**Response:**

```json
{
  "success": true,
  "data": {
    "group": "OMS",
    "version": "1.0",
    "path": "/api/oms/pvt/orders",
    "pathSpec": {
      "get": {
        "operationId": "getOrders",
        "summary": "Get orders",
        "parameters": [
          {
            "name": "page",
            "in": "query",
            "schema": { "type": "integer" }
          }
        ],
        "responses": {
          "200": {
            "description": "Success",
            "content": {
              "application/json": {
                "schema": { "type": "object" }
              }
            }
          }
        }
      },
      "post": {
        "operationId": "createOrder",
        "summary": "Create a new order",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": { "type": "object" }
            }
          }
        },
        "responses": {
          "201": {
            "description": "Order created successfully"
          }
        }
      }
    },
    "operationCount": 2,
    "enabled": true,
    "description": "Order Management System API"
  }
}
```

**Example Usage:**

```bash
# Get specific API path specification
curl -X GET "https://myaccount.myvtex.com/_v/mcp_server/v0/api-spec/OMS/api%2Foms%2Fpvt%2Forders" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Note: The path parameter should be URL encoded
# "/api/oms/pvt/orders" becomes "api%2Foms%2Fpvt%2Forders"
```

### 4. Execute API

**Endpoint:** `POST /_v/mcp_server/v0/execute-api`

**Purpose:** Dynamically execute any VTEX API call based on OpenAPI specifications

**Request Body:**

```json
{
  "apiGroup": "OMS",
  "operationId": "getOrders",
  "pathParams": {
    "orderId": "v123456-01"
  },
  "queryParams": {
    "page": 1,
    "per_page": 10
  },
  "headers": {
    "Accept": "application/json"
  },
  "body": {
    "status": "invoiced"
  }
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "list": [
      {
        "orderId": "v123456-01",
        "status": "invoiced",
        "creationDate": "2025-01-12T10:00:00Z"
      }
    ],
    "paging": {
      "total": 1,
      "pages": 1,
      "currentPage": 1,
      "perPage": 10
    }
  },
  "metadata": {
    "executionTime": 234,
    "apiGroup": "OMS",
    "operationId": "getOrders",
    "method": "GET",
    "path": "/api/oms/pvt/orders"
  }
}
```

**Example Usage:**

```bash
curl -X POST "https://myaccount.myvtex.com/_v/mcp_server/v0/execute-api" \
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

### 5. Upload API Specification (Admin Only)

**Endpoint:** `POST /_v/mcp_server/v0/admin/upload-spec`

**Purpose:** Upload or update OpenAPI specification URLs to MasterData

**Authentication:** Requires admin privileges

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

**Response:**

```json
{
  "success": true,
  "id": "doc_123456",
  "message": "API specification URL for group 'OMS' version '1.0' uploaded successfully"
}
```

**Example Usage:**

```bash
curl -X POST "https://myaccount.myvtex.com/_v/mcp_server/v0/admin/upload-spec" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -d '{
    "apiGroup": "OMS",
    "version": "1.0",
    "specUrl": "https://developers.vtex.com/api/openapi/orders-api",
    "description": "Order Management System API",
    "tags": ["orders", "oms", "commerce"],
    "enabled": true
  }'
```

## Error Responses

All endpoints return consistent error responses:

```json
{
  "success": false,
  "error": "Error description"
}
```

**Common HTTP Status Codes:**

- `200`: Success
- `400`: Bad Request (validation errors)
- `403`: Forbidden (insufficient privileges)
- `404`: Not Found (API group or operation not found)
- `500`: Internal Server Error

## Data Storage

API specification metadata is stored in MasterData v2 using the data entity `vtex_mcp_api_specs` with the following schema:

- `apiGroup`: String - Category/group name (e.g., "OMS", "Catalog")
- `version`: String - API version (e.g., "1.0", "2.0")
- `specUrl`: String - URL to the OpenAPI 3.0 specification (e.g., "https://developers.vtex.com/api/openapi/orders-api")
- `description`: String - Human-readable description of the API group
- `tags`: Array of Strings - Tags for categorization and filtering
- `enabled`: Boolean - Whether this API group is active
- `lastUpdated`: String - ISO timestamp of last update

The actual OpenAPI specifications are fetched dynamically from the provided URLs using VTEX IO's HTTP client, which includes built-in caching capabilities.

## Caching

- OpenAPI specifications are cached by VTEX IO's HTTP client when fetched from URLs
- Cache duration follows the HTTP cache headers from the source URLs
- API definitions are fetched dynamically, ensuring always up-to-date specifications
- Use `Cache-Control` and `ETag` headers for client-side caching

## Rate Limiting

The server respects VTEX IO's built-in rate limiting mechanisms. Consider implementing additional rate limiting per API group if needed.

## Security Considerations

1. All endpoints require proper VTEX IO authentication
2. Admin endpoints require additional admin token validation
3. API specification URLs are validated before storage
4. OpenAPI specifications are validated when fetched from URLs
5. Request parameters are sanitized and validated
6. All API calls are logged for audit purposes
7. External URL access is controlled by VTEX IO's outbound access policies

## MCP Protocol Endpoints

The following endpoints implement the Model Context Protocol (MCP) specification for AI assistant integration:

**Method Flexibility**: All MCP endpoints accept both standard method names (e.g., `"method": "initialize"`) and prefixed method names (e.g., `"method": "mcp/initialize"`) for maximum compatibility.

### 6. MCP Handshake

**Endpoint:** `POST /_v/mcp_server/v0/mcp/handshake`

**Purpose:** Used at the very beginning of the connection to verify that:

- Both sides speak MCP
- The protocol versions are compatible
- Capabilities can be safely negotiated

**Request Body:**

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "handshake",
  "params": {
    "version": "1.0.0",
    "capabilities": ["resources", "tools"]
  }
}
```

**Alternative Method Format:**

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "mcp/handshake",
  "params": {
    "version": "1.0.0",
    "capabilities": ["resources", "tools"]
  }
}
```

**Response:**

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "version": "1.0.0",
    "capabilities": ["resources", "tools", "logging"],
    "compatible": true,
    "serverInfo": {
      "name": "VTEX IO MCP Server",
      "version": "1.0.0",
      "description": "Model Context Protocol server for VTEX IO API integration"
    }
  }
}
```

**Notes:**

- This is a lightweight connection verification endpoint
- Can be called before the full `initialize` process
- Returns `compatible: true/false` to indicate version compatibility
- Lists available server capabilities
- Think of it as: "Hello, are you an MCP server? What can you do?"
- **Method Flexibility**: Accepts both `"method": "handshake"` and `"method": "mcp/handshake"`

### 7. MCP Initialize

**Endpoint:** `POST /_v/mcp_server/v0/mcp/initialize`

**Purpose:** Initialize MCP connection and negotiate capabilities between client and server

**Request Body:**

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "initialize",
  "params": {
    "protocolVersion": "2024-11-05",
    "capabilities": {
      "tools": {},
      "resources": {}
    },
    "clientInfo": {
      "name": "MCP Client",
      "version": "1.0.0"
    }
  }
}
```

**Response:**

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "protocolVersion": "2024-11-05",
    "capabilities": {
      "tools": {
        "listChanged": true
      },
      "resources": {
        "subscribe": false,
        "listChanged": true
      }
    },
    "serverInfo": {
      "name": "VTEX IO MCP Server",
      "version": "1.0.0"
    }
  }
}
```

**Notes:**

- This is the first endpoint that must be called to establish an MCP connection
- The client must send this request before using any other MCP endpoints
- Protocol version must match exactly: `2024-11-05`
- After receiving this response, the client should send a `notifications/initialized` notification

### 8. MCP Initialized Notification

**Endpoint:** `POST /_v/mcp_server/v0/mcp/notifications/initialized`

**Purpose:** Notification sent by the client after successful initialization

**Request Body:**

```json
{
  "jsonrpc": "2.0",
  "method": "notifications/initialized",
  "params": {}
}
```

**Response:** No response body (HTTP 200 status)

**Notes:**

- This is a notification (no `id` field required)
- Must be sent after receiving a successful `initialize` response
- After this notification, the client can use all other MCP endpoints

### 9. MCP Tools/List

**Endpoint:** `POST /_v/mcp_server/v0/mcp/tools/list`

**Purpose:** List available tools for AI assistant integration

**Request Body:**

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/list",
  "params": {}
}
```

**Response:**

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "tools": [
      {
        "name": "vtex_api_call",
        "description": "Execute any VTEX API call dynamically",
        "inputSchema": {
          "type": "object",
          "properties": {
            "apiGroup": {
              "type": "string",
              "description": "The API group (e.g., OMS, Catalog)",
              "enum": ["OMS", "Catalog"]
            },
            "operationId": {
              "type": "string",
              "description": "The operation ID to execute"
            },
            "parameters": {
              "type": "object",
              "description": "Parameters for the API call",
              "additionalProperties": true
            },
            "body": {
              "type": "object",
              "description": "Request body for POST/PUT/PATCH operations",
              "additionalProperties": true
            }
          },
          "required": ["apiGroup", "operationId"]
        }
      }
    ]
  }
}
```

### 10. MCP Tools/Call

**Endpoint:** `POST /_v/mcp_server/v0/mcp/tools/call`

**Purpose:** Execute a tool via MCP protocol

**Request Body:**

```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/call",
  "params": {
    "name": "vtex_api_call",
    "arguments": {
      "apiGroup": "Orders",
      "operationId": "GetOrder",
      "parameters": {
        "orderId": "1172452900788-01"
      }
    }
  }
}
```

**Alternative Example with Query Parameters:**

```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "method": "tools/call",
  "params": {
    "name": "vtex_api_call",
    "arguments": {
      "apiGroup": "OMS",
      "operationId": "getOrders",
      "parameters": {
        "page": 1,
        "per_page": 10
      }
    }
  }
}
```

**Response:**

```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "{\n  \"success\": true,\n  \"data\": { /* API response */ }\n}",
        "mimeType": "application/json"
      }
    ],
    "isError": false
  }
}
```

**Error Response Example (404 Not Found):**

```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "error": {
    "code": -32602,
    "message": "Order not found",
    "data": {
      "httpStatusCode": 404,
      "originalError": {
        /* original error details */
      }
    }
  }
}
```

**Notes:**

- This endpoint executes the specified tool with the provided arguments
- The `vtex_api_call` tool allows dynamic execution of any VTEX API
- **Parameter Categorization**: Parameters are automatically categorized based on the OpenAPI specification:
  - `path` parameters (like `orderId` in `/api/oms/pvt/orders/{orderId}`) are used in the URL path
  - `query` parameters are added to the URL query string
  - `header` parameters are added to the request headers
- **Error Handling**: HTTP status codes and error messages are properly mapped to MCP error responses:
  - 404 errors return `"code": -32602` (Invalid params) with the actual error message
  - 400 errors return `"code": -32602` (Invalid params)
  - 401/403 errors return `"code": -32600` (Invalid Request)
  - 500+ errors return `"code": -32603` (Internal error)
  - All errors maintain MCP protocol consistency using JSON-RPC 2.0 error codes
- The response includes the API result with proper content type

### 11. MCP Resources/List

**Endpoint:** `POST /_v/mcp_server/v0/mcp/resources/list`

**Purpose:** List available resources (API specifications)

**Request Body:**

```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "method": "resources/list",
  "params": {}
}
```

**Response:**

```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "result": {
    "resources": [
      {
        "uri": "vtex://api-spec/OMS",
        "name": "OMS API Specification",
        "description": "OpenAPI specification for OMS API",
        "mimeType": "application/json"
      },
      {
        "uri": "vtex://api-path/OMS/api/oms/pvt/orders",
        "name": "OMS /api/oms/pvt/orders API Path",
        "description": "API path specification for /api/oms/pvt/orders in OMS",
        "mimeType": "application/json"
      }
    ]
  }
}
```

### 12. MCP Resources/Read

**Endpoint:** `POST /_v/mcp_server/v0/mcp/resources/read`

**Purpose:** Read a specific resource (API specification)

**Request Body:**

```json
{
  "jsonrpc": "2.0",
  "id": 4,
  "method": "resources/read",
  "params": {
    "uri": "vtex://api-spec/OMS"
  }
}
```

**Response:**

```json
{
  "jsonrpc": "2.0",
  "id": 4,
  "result": {
    "contents": [
      {
        "uri": "vtex://api-spec/OMS",
        "mimeType": "application/json",
        "text": "{\n  \"openapi\": \"3.0.0\",\n  \"info\": { /* OpenAPI spec */ }\n}"
      }
    ]
  }
}
```

## Integration with LLMs

This MCP server is designed to work with LLMs that support the Model Context Protocol:

**REST API Integration:**

1. **Discovery**: LLM calls `getApiDefinitions` to understand available APIs
2. **Execution**: LLM calls `executeApi` with specific parameters to perform actions
3. **Management**: Admins can upload new API specification URLs via `uploadApiSpec`

**MCP Protocol Integration:**

1. **Tool Discovery**: LLM calls `tools/list` to discover available tools
2. **Tool Execution**: LLM calls `tools/call` to execute specific operations with proper content type handling
3. **Resource Discovery**: LLM calls `resources/list` to find available API specifications
4. **Resource Reading**: LLM calls `resources/read` to get detailed API specifications

**Enhanced Capabilities:**

- **Content Type Awareness**: MCP responses include `mimeType` field for proper content interpretation
- **Automatic Headers**: All API calls include mandatory headers (`Accept`, `Content-Type`)
- **Response Metadata**: Full response metadata including execution time and headers
- **Error Handling**: Comprehensive error handling with proper MCP error codes

The OpenAPI specifications provide the LLM with:

- Available operations and their descriptions
- Required and optional parameters
- Expected request/response formats
- Authentication requirements
- Content type information for proper response parsing

## Technical Architecture

### Component Overview

**VTEXAPIClient**

- Handles HTTP communication with VTEX APIs
- Automatically adds mandatory headers (`Accept: */*`, `Content-Type: application/json`)
- Uses relative URLs (paths only) as required by VTEX IO
- Returns full response objects with headers and data

**OpenAPIClient**

- Fetches and validates OpenAPI specifications from URLs
- Handles JSON and YAML format parsing
- Includes URL validation and accessibility checks
- Leverages VTEX IO HTTP client caching

**ReturnApp Client**

- Handles return app specific functionality
- Manages return-related operations and data

**VtexId Client**

- Handles VTEX ID authentication operations
- Validates app keys and tokens via `/api/vtexid/apptoken/login`
- Retrieves authenticated user information
- Manages user session validation

**Sphinx Client**

- Provides role-based access control
- Determines admin privileges for authenticated users
- Integrates with VTEX ID for authorization

**Authentication Middleware**

- Validates both cookie-based and API key-based authentication
- Determines user roles (admin/store-user)
- Sets appropriate auth tokens in context
- Enforces authentication requirements for all endpoints

**APIExecutor**

- Parses OpenAPI specifications and executes operations
- Validates required parameters from OpenAPI specs
- Skips validation for mandatory headers (handled by VTEXAPIClient)
- Returns enhanced metadata including content type and execution time

**MasterDataService**

- Manages API specification metadata in MasterData v2
- Fetches OpenAPI specs from URLs with caching
- Handles CRUD operations for API specifications

**MCP Protocol Handlers**

- Implement JSON-RPC 2.0 specification
- Provide tools and resources for AI assistant integration
- Handle proper content type propagation in responses

### Data Flow

1. **Authentication**: Request validated via cookie or API key authentication
2. **Authorization**: User role determined (admin/store-user) and appropriate tokens set
3. **API Specification Storage**: URLs stored in MasterData v2 (`vtex_mcp_api_specs`)
4. **Spec Retrieval**: OpenAPIClient fetches OpenAPI specs from URLs with IO client caching
5. **Parameter Resolution**: OpenAPI parameters validated and resolved by APIExecutor
6. **API Execution**: VTEXAPIClient executes requests with proper headers
7. **Response Processing**: Content type and metadata extracted and propagated
8. **MCP Formatting**: Responses formatted according to MCP specification

### Error Handling

- **Authentication Errors**: 401 errors for invalid or missing authentication
- **Authorization Errors**: Role-based access control with appropriate error messages
- **Validation Errors**: Proper parameter validation with descriptive error messages
- **API Errors**: HTTP errors propagated with original status codes
- **MCP Errors**: JSON-RPC 2.0 compliant error responses with standard error codes
- **Logging**: Centralized logging to MasterData for monitoring and debugging

# IO MCP SERVER Endpoints

This document describes the available API endpoints for the MCP (Model Context Protocol) server implementation in VTEX IO.

## Overview

The MCP server provides three main endpoints that allow LLMs to:
1. Discover available VTEX API endpoints through OpenAPI specifications
2. Execute any VTEX API call dynamically based on stored specifications
3. Upload and manage API specifications (admin only)

## Base URL

All endpoints are available at: `https://{account}.myvtex.com/_v/mcp_server/v0/`

## Authentication

All endpoints require VTEX IO authentication. The server uses the app's built-in authentication tokens and policies.

## Endpoints

### 1. Get API Definitions

**Endpoint:** `GET /_v/mcp_server/v0/api-definitions`

**Purpose:** Retrieve all available API definitions for LLM consumption

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
        "spec": {
          "openapi": "3.0.0",
          "info": {
            "title": "OMS API",
            "version": "1.0.0"
          },
          "paths": {
            "/api/oms/pvt/orders": {
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
              }
            }
          }
        }
      }
    ],
    "totalApis": 150,
    "lastUpdated": "2025-01-12T00:00:00Z"
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

### 2. Execute API

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

### 3. Upload API Specification (Admin Only)

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

## Integration with LLMs

This MCP server is designed to work with LLMs that support the Model Context Protocol:

1. **Discovery**: LLM calls `getApiDefinitions` to understand available APIs
2. **Execution**: LLM calls `executeApi` with specific parameters to perform actions
3. **Management**: Admins can upload new API specification URLs via `uploadApiSpec`

The OpenAPI specifications provide the LLM with:
- Available operations and their descriptions
- Required and optional parameters
- Expected request/response formats
- Authentication requirements 
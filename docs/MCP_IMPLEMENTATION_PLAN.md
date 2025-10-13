# MCP Server Implementation for VTEX IO

## Overview

Build an MCP server as VTEX IO HTTP endpoints that:

1. Stores and retrieves OpenAPI specifications from MasterData v2
2. Provides a dynamic API execution layer that can call any VTEX endpoint
3. Uses VTEX IO's built-in authentication and policies

## Architecture

### Core Components

**1. Generic VTEX API Client** (`node/clients/VTEXAPIClient.ts`)

- Extends `JanusClient` or `ExternalClient` from `@vtex/api`
- Accepts dynamic endpoint configuration (method, path, headers, body, query params)
- Handles authentication via VTEX tokens
- Supports all HTTP methods (GET, POST, PUT, PATCH, DELETE)

**2. MasterData Service** (`node/services/masterDataService.ts`)

- Data entity: `vtex_api_specs` to store OpenAPI specifications
- Schema fields:
  - `apiGroup` (string): Category/group name (e.g., "OMS", "Catalog", "Pricing")
  - `version` (string): API version
  - `spec` (JSON): Full OpenAPI 3.0 specification
  - `enabled` (boolean): Whether this API group is active
  - `lastUpdated` (datetime): Timestamp of last update
- Methods:
  - `getAPISpecs()`: Retrieve all enabled API specifications
  - `getAPISpecByGroup(group: string)`: Get specific API group
  - `saveAPISpec(data)`: Store/update API specification
  - `deleteAPISpec(id: string)`: Remove API specification

**3. MCP Endpoints**

#### Endpoint 1: `GET /_v/mcp_server/v0/api-definitions`

**Purpose**: Return all available API definitions for LLM consumption

**Response Format**:

```json
{
  "apiGroups": [
    {
      "group": "OMS",
      "version": "1.0",
      "spec": {
        /* OpenAPI 3.0 spec */
      }
    }
  ],
  "totalApis": 150,
  "lastUpdated": "2025-10-12T00:00:00Z"
}
```

**Implementation** (`node/middlewares/getApiDefinitions.ts`):

- Fetch all enabled specs from MasterData
- Optional query params: `?group=OMS` to filter by API group
- Cache results with LRU cache (5-minute TTL)
- Return consolidated OpenAPI specs

#### Endpoint 2: `POST /_v/mcp_server/v0/execute-api`

**Purpose**: Dynamically execute any VTEX API call

**Request Body**:

```json
{
  "apiGroup": "OMS",
  "operationId": "getOrder",
  "parameters": {
    "orderId": "v123456-01"
  },
  "pathParams": {
    "orderId": "v123456-01"
  },
  "queryParams": {
    "fields": "orderId,status"
  },
  "body": {
    /* for POST/PUT/PATCH */
  }
}
```

**Implementation** (`node/middlewares/executeApi.ts`):

1. Validate request body
2. Fetch API spec from MasterData by `apiGroup`
3. Locate operation by `operationId` in OpenAPI spec
4. Extract endpoint details (method, path, required headers)
5. Build request using `VTEXAPIClient`
6. Execute and return response with metadata

**Response**:

```json
{
  "success": true,
  "data": {
    /* API response */
  },
  "metadata": {
    "executionTime": 234,
    "apiGroup": "OMS",
    "operationId": "getOrder"
  }
}
```

#### Endpoint 3: `POST /_v/mcp_server/v0/admin/upload-spec` (Admin only)

**Purpose**: Upload/update OpenAPI specifications to MasterData

**Request Body**:

```json
{
  "apiGroup": "OMS",
  "version": "1.0",
  "spec": {
    /* OpenAPI 3.0 spec */
  },
  "enabled": true
}
```

**Implementation** (`node/middlewares/uploadApiSpec.ts`):

- Validate OpenAPI spec structure
- Save to MasterData
- Clear cache
- Return confirmation

## File Structure

```
node/
├── clients/
│   ├── index.ts (updated with current clients)
│   ├── VTEXAPIClient.ts (dynamic HTTP client)
│   ├── OpenAPIClient.ts (OpenAPI spec fetcher)
│   ├── ReturnApp.ts (return app client)
│   └── vtexId.ts (VTEX ID authentication client)
├── middlewares/
│   ├── auth.ts (authentication middleware)
│   ├── errorHandler.ts (error handling middleware)
│   ├── initialLoad.ts (initialization middleware)
│   ├── getApiDefinitions.ts (new)
│   ├── executeApi.ts (new)
│   └── uploadApiSpec.ts (new)
├── services/
│   └── masterDataService.ts (new)
├── types/
│   ├── mcp.ts (new - MCP request/response types)
│   └── openapi.ts (new - OpenAPI schema types)
├── utils/
│   ├── apiExecutor.ts (new - OpenAPI operation executor)
│   └── validator.ts (new - request validation)
└── index.ts (update routes)
```

## Key Implementation Details

### Authentication Layer

- **VtexId Client**: Handles VTEX ID authentication operations
  - Validates app keys and tokens via `/api/vtexid/apptoken/login`
  - Retrieves authenticated user information
  - Manages user session validation
- **Sphinx Client**: Provides role-based access control
  - Determines admin privileges for authenticated users
  - Integrates with VTEX ID for authorization
- **Auth Middleware**: Validates authentication for all endpoints
  - Supports cookie-based user authentication
  - Supports API key-based app authentication
  - Determines user roles (admin/store-user)
  - Sets appropriate auth tokens in context

### VTEXAPIClient

- Use `JanusClient` as base for internal VTEX APIs
- Support dynamic base URLs for different VTEX services
- Handle authentication headers automatically
- Support request/response interceptors for logging

### API Execution Flow

1. Parse OpenAPI spec to extract operation details
2. Resolve path parameters (e.g., `/orders/{orderId}` → `/orders/v123456-01`)
3. Merge query parameters
4. Set required headers from spec + auth headers
5. Execute request via `VTEXAPIClient`
6. Handle errors with proper HTTP status codes

### Security & Policies

- All endpoints require VTEX IO authentication
- Admin endpoint requires additional admin token validation
- Leverage existing policies in `manifest.json`
- Add rate limiting via VTEX IO's built-in mechanisms

### Error Handling

- Validate OpenAPI specs on upload
- Return descriptive errors for missing operations
- Handle VTEX API errors gracefully
- Log all executions for debugging

## Configuration Updates

### `manifest.json`

- Add MasterData policy for `vtex_api_specs` entity
- Ensure outbound-access policies cover all potential VTEX APIs
- Add new routes to `service.json`

### `service.json`

```json
{
  "routes": {
    "getApiDefinitions": {
      "path": "/_v/mcp_server/v0/api-definitions",
      "public": true
    },
    "executeApi": {
      "path": "/_v/mcp_server/v0/execute-api",
      "public": true
    },
    "uploadApiSpec": {
      "path": "/_v/mcp_server/v0/admin/upload-spec",
      "public": false
    }
  }
}
```

## Testing Strategy

- Unit tests for API executor utility
- Integration tests for MasterData service
- E2E tests for each endpoint
- Test with sample OMS OpenAPI spec

## Future Enhancements

- Webhook support for API spec updates
- GraphQL endpoint support
- Request/response transformation rules
- API usage analytics
- Rate limiting per API group

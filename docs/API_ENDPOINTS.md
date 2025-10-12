# Agent API Endpoints

This document describes the available API endpoints for the Agent service.

## Base URL

All endpoints are prefixed with: `/_v/agent/v0/`

## Endpoints

### 1. Chat Interface

**Endpoint:** `POST /_v/agent/v0/chat`

A simplified chat interface for conversational interactions with the agent.

**Request Body:**

```json
{
  "message": "I want to return order #12345",
  "session_id": "session_123",
  "user_id": "user_456"
}
```

**Response:**

```json
{
  "message": "I'll help you process that return request...",
  "sessionId": "session_123",
  "timestamp": "2024-01-15T10:30:00Z",
  "action": {
    "type": "create_return_request",
    "status": "completed",
    "message": "Return request created successfully"
  }
}
```

### 2. Orchestrator Interface

**Endpoint:** `POST /_v/agent/v0/orchestrator`

Full-featured orchestrator interface with complete request/response details.

**Request Body:**

```json
{
  "message": "I want to return order #12345",
  "sessionId": "session_123",
  "userId": "user_456",
  "context": {
    "currentOrder": "12345",
    "conversationHistory": []
  }
}
```

**Response:**

```json
{
  "message": "I'll help you process that return request...",
  "action": {
    "type": "create_return_request",
    "status": "completed",
    "data": {
      "returnRequestId": "ret_789",
      "status": "new",
      "message": "Return request created successfully"
    }
  },
  "sessionId": "session_123",
  "timestamp": "2024-01-15T10:30:00Z",
  "metadata": {
    "confidence": 0.9,
    "reasoning": "User clearly wants to return an order",
    "followUpQuestions": ["What's the reason for the return?"]
  }
}
```

### 3. Health Check

**Endpoint:** `GET /_v/agent/v0/health`

Check the health status of the orchestrator service.

**Response:**

```json
{
  "status": "healthy",
  "service": "orchestrator",
  "timestamp": "2024-01-15T10:30:00Z",
  "version": "1.0.0"
}
```

### 4. Legacy Prompt (Deprecated)

**Endpoint:** `POST /_v/agent/v0/prompt`

Legacy endpoint for basic prompt processing. Use `/chat` or `/orchestrator` instead.

## Error Responses

All endpoints return standardized error responses:

```json
{
  "error": "ERROR_CODE",
  "message": "Human-readable error message",
  "timestamp": "2024-01-15T10:30:00Z",
  "errorId": "error_1234567890_abc123"
}
```

### Common Error Codes

- `INVALID_REQUEST` (400): Request validation failed
- `ORDER_NOT_FOUND` (404): Order not found
- `RETURN_NOT_ALLOWED` (403): Return not allowed for this order
- `OPENAI_API_ERROR` (502): AI service temporarily unavailable
- `OMS_API_ERROR` (502): Order management service unavailable
- `RETURN_APP_ERROR` (502): Return service unavailable
- `RATE_LIMIT_EXCEEDED` (429): Too many requests
- `INTERNAL_ERROR` (500): Unexpected server error

## Usage Examples

### Basic Chat

```bash
curl -X POST https://your-domain.com/_v/agent/v0/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Hello, I need help with my order",
    "session_id": "session_123"
  }'
```

### Return Request

```bash
curl -X POST https://your-domain.com/_v/agent/v0/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "I want to return order #12345 because it arrived damaged",
    "session_id": "session_123",
    "user_id": "user_456"
  }'
```

### Health Check

```bash
curl -X GET https://your-domain.com/_v/agent/v0/health
```

## Session Management

- Sessions are automatically created if not provided
- Session IDs are returned in responses for continuity
- Conversation context is maintained within sessions
- Sessions expire after inactivity (configurable)

## Rate Limiting

- Default rate limit: 100 requests per minute per IP
- Rate limit headers are included in responses
- Exceeded requests return 429 status code

## Configuration

The service requires the following settings to be configured in the VTEX App Store:

### OpenAI Settings

- **API Key**: Required OpenAI API key for AI functionality
- **Model**: OpenAI model to use (default: gpt-4o-mini)
- **Max Tokens**: Maximum response length (default: 1000)
- **Temperature**: Response randomness (default: 0.7)

### Logging Settings

- **Logging Type**: Test/Development or Production
- **Log Levels**: Error, Warning, Info, Debug

## Authentication

Currently, all endpoints are public. Authentication can be added by:

1. Adding authentication middleware
2. Configuring routes as private in `service.json`
3. Implementing token validation in middleware

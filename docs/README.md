# IO Agent

An intelligent customer service agent built with VTEX IO that provides conversational AI capabilities for order management, return processing, and customer support.

## 🏗️ Architecture

The IO Agent follows a modern architecture pattern:

```
[Agent UI] ↔ [LLM (OpenAI)] ↔ [REST API Orchestrator (Node.js)]
```

### Core Components

- **Agent UI**: User interface for chat interactions
- **LLM (OpenAI)**: GPT-4o-mini model for natural language processing
- **REST API Orchestrator**: Node.js service coordinating between UI, LLM, and external APIs
- **OMS Client**: Integration with VTEX Order Management System
- **Return App Client**: Integration with return processing system

## 🚀 Features

- **Conversational AI**: Natural language interactions with context awareness
- **Order Management**: Retrieve order information, status, and details
- **Return Processing**: Handle return requests and status updates
- **Session Management**: Maintain conversation context across multiple requests
- **Iterative Processing**: LLM can call tools and receive results before providing final answers
- **Error Handling**: Comprehensive error handling with user-friendly messages

## 📡 API Endpoints

### Chat Endpoint (User-Friendly)

**POST** `/_v/agent/v0/chat`

Simplified interface for chat applications.

#### Request

```json
{
  "message": "I want to get information from order 1566130656119-02",
  "session_id": "session_123",
  "user_id": "user_456",
  "context": {}
}
```

#### Response

```json
{
  "message": "The order 1566130656119-02 has the status 'invoiced' and contains 2 items with a total value of $109.97.",
  "sessionId": "session_123",
  "timestamp": "2025-01-10T12:00:00Z",
  "action": {
    "type": "get_order_info",
    "status": "completed",
    "message": "Action completed successfully",
    "data": {
      "orderId": "1566130656119-02",
      "status": "invoiced",
      "items": [...],
      "total": 109.97
    }
  }
}
```

### Orchestrator Endpoint (Developer-Friendly)

**POST** `/_v/agent/v0/orchestrator`

Full-featured API with complete metadata and debugging information.

#### Request

```json
{
  "message": "I want to get information from order 1566130656119-02",
  "sessionId": "session_123",
  "userId": "user_456",
  "context": {}
}
```

#### Response

```json
{
  "message": "The order 1566130656119-02 has the status 'invoiced'...",
  "action": {
    "type": "get_order_info",
    "status": "completed",
    "message": "Action completed successfully",
    "data": {...}
  },
  "sessionId": "session_123",
  "timestamp": "2025-01-10T12:00:00Z",
  "metadata": {
    "confidence": 0.9,
    "reasoning": "...",
    "followUpQuestions": [...],
    "iterations": 2,
    "processingTimeMs": 1500
  }
}
```

### Health Check

**GET** `/_v/agent/v0/health`

Check service health and status.

## 🔄 Session Management

The IO Agent maintains conversation context through session management:

### Session ID

- **Purpose**: Links multiple requests to maintain conversation context
- **Format**: `session_${timestamp}_${randomString}` (auto-generated) or custom
- **Persistence**: In-memory storage during service uptime

### Conversation Context

Each session maintains:

```typescript
interface Session {
  id: string // Session ID
  userId?: string // Optional user identifier
  context: AgentContext // Conversation history and context
  createdAt: string // Session creation timestamp
  lastActivity: string // Last interaction timestamp
  isActive: boolean // Session status
}
```

### Conversation History

The system maintains a complete conversation history including:

- **User Messages**: All user inputs
- **Assistant Responses**: LLM responses (including JSON function calls)
- **Function Results**: Tool execution results (order data, etc.)

### Example Session Flow

#### Request 1 (New Session)

```json
{
  "message": "I want to get information from order 123",
  "session_id": "session_123"
}
```

**Session Created with Context:**

```typescript
{
  id: "session_123",
  context: {
    conversationHistory: [
      { role: "user", content: "I want to get information from order 123" },
      { role: "assistant", content: "I'll retrieve that information..." },
      { role: "function", name: "getOrderInfo", content: "{...order data...}" },
      { role: "assistant", content: "Here's your order information..." }
    ]
  }
}
```

#### Request 2 (Same Session)

```json
{
  "message": "What about the shipping status?",
  "session_id": "session_123"
}
```

**LLM Receives Full Context:**
The LLM gets the complete conversation history, enabling natural follow-up questions and context-aware responses.

## 🤖 LLM Integration

### Function Calling Approach

The system uses OpenAI's function calling pattern:

#### LLM Response Format

```json
{
  "action": "call" | "answer",
  "tool": "getOrderInfo",
  "parameters": { "orderId": "...", "fields": ["..."] },
  "finalAnswer": "..."
}
```

#### Action Types

- **`call`**: LLM needs to retrieve information (execute tool)
- **`answer`**: LLM has the information and provides final response

### Iterative Processing

The orchestrator iterates with the LLM until a final answer is received:

1. **LLM Call**: LLM responds with `action: "call"` to get order data
2. **Tool Execution**: Orchestrator calls OMS API and retrieves order information
3. **Context Update**: Tool result is added to conversation history
4. **LLM Call**: LLM receives order data and responds with `action: "answer"`
5. **Final Response**: User receives comprehensive answer with real data

## 🛠️ Configuration

### OpenAI Settings

Configure OpenAI integration in `manifest.json`:

```json
{
  "settingsSchema": {
    "properties": {
      "openai": {
        "properties": {
          "apiKey": {
            "title": "OpenAI API Key",
            "type": "string",
            "minLength": 1
          },
          "model": {
            "title": "Model",
            "type": "string",
            "enum": ["gpt-4o-mini", "gpt-4o", "gpt-4-turbo", "gpt-3.5-turbo"],
            "default": "gpt-4o-mini"
          },
          "maxTokens": {
            "title": "Max Tokens",
            "type": "number",
            "minimum": 1,
            "maximum": 4000,
            "default": 1000
          },
          "temperature": {
            "title": "Temperature",
            "type": "number",
            "minimum": 0.0,
            "maximum": 2.0,
            "default": 0.7
          }
        },
        "required": ["apiKey"]
      }
    }
  }
}
```

### Required Policies

The service requires the following VTEX IO policies:

```json
{
  "policies": [
    {
      "name": "outbound-access",
      "attrs": {
        "host": "api.openai.com",
        "path": "/v1/*"
      }
    }
  ]
}
```

## 📊 Usage Examples

### Basic Order Inquiry

```bash
curl -X POST https://your-app.vtex.io/_v/agent/v0/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "I want to get information from order 1566130656119-02",
    "session_id": "session_123"
  }'
```

### Follow-up Question

```bash
curl -X POST https://your-app.vtex.io/_v/agent/v0/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What about the shipping status?",
    "session_id": "session_123"
  }'
```

### Return Request

```bash
curl -X POST https://your-app.vtex.io/_v/agent/v0/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "I want to return order 1566130656119-02",
    "session_id": "session_123"
  }'
```

## 🔧 Development

### Project Structure

```
node/
├── clients/           # External API clients
│   ├── openAI.ts     # OpenAI integration
│   └── oms.ts        # Order Management System client
├── middlewares/       # HTTP request handlers
│   ├── chat.ts       # Chat endpoint
│   └── orchestrator.ts # Orchestrator endpoint
├── services/          # Business logic
│   └── orchestrator.ts # Core orchestrator service
├── types/            # TypeScript type definitions
│   ├── orchestrator.ts
│   └── openai.ts
└── utils/            # Utility functions
    └── logging.ts    # Logging utilities
```

### Key Components

- **OrchestratorService**: Core business logic and LLM coordination
- **OpenAIClient**: Handles OpenAI API communication
- **OMSCustom**: VTEX OMS integration for order data
- **Session Management**: In-memory session storage and context management

## 🚨 Error Handling

The system provides comprehensive error handling:

### Error Types

- **INVALID_REQUEST**: Malformed or missing request data
- **ORDER_NOT_FOUND**: Order ID not found in OMS
- **OPENAI_API_ERROR**: Issues with OpenAI API
- **OMS_API_ERROR**: Issues with OMS integration
- **RATE_LIMIT_EXCEEDED**: Too many requests

### Error Responses

#### Chat Endpoint (User-Friendly)

```json
{
  "error": "ORDER_NOT_FOUND",
  "message": "I couldn't find that order. Please check the order number and try again.",
  "timestamp": "2025-01-10T12:00:00Z"
}
```

#### Orchestrator Endpoint (Technical)

```json
{
  "error": "ORDER_NOT_FOUND",
  "message": "Order 1566130656119-02 not found",
  "timestamp": "2025-01-10T12:00:00Z",
  "errorId": "error_123456789"
}
```

## 📈 Monitoring & Logging

The system includes comprehensive logging:

- **Request/Response Logging**: All API interactions
- **Session Tracking**: Session creation and activity
- **Error Logging**: Detailed error information
- **Performance Metrics**: Processing times and iteration counts
- **LLM Interactions**: Complete conversation history

## 🔒 Security

- **API Key Management**: OpenAI API keys stored securely in app settings
- **Input Validation**: Comprehensive request validation
- **Rate Limiting**: Built-in protection against abuse
- **Error Sanitization**: User-friendly error messages without sensitive data

## 📝 License

This project is part of the ODP (Order Data Platform) and is proprietary software.

## 🤝 Contributing

For internal development and contributions, please follow the established coding standards and ensure all tests pass before submitting changes.

---

**Version**: 0.3.0  
**Last Updated**: January 2025

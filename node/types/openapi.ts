// OpenAPI 3.0 schema types for validation and processing

export interface OpenAPISpec {
  openapi: string
  info: OpenAPIInfo
  servers?: OpenAPIServer[]
  paths: Record<string, OpenAPIPathItem>
  components?: OpenAPIComponents
}

export interface OpenAPIInfo {
  title: string
  version: string
  description?: string
  contact?: OpenAPIContact
  license?: OpenAPILicense
}

export interface OpenAPIContact {
  name?: string
  url?: string
  email?: string
}

export interface OpenAPILicense {
  name: string
  url?: string
}

export interface OpenAPIServer {
  url: string
  description?: string
  variables?: Record<string, OpenAPIServerVariable>
}

export interface OpenAPIServerVariable {
  enum?: string[]
  default: string
  description?: string
}

export interface OpenAPIPathItem {
  summary?: string
  description?: string
  get?: OpenAPIOperation
  post?: OpenAPIOperation
  put?: OpenAPIOperation
  patch?: OpenAPIOperation
  delete?: OpenAPIOperation
  head?: OpenAPIOperation
  options?: OpenAPIOperation
  parameters?: (OpenAPIParameter | OpenAPIReference)[]
}

export interface OpenAPIOperation {
  tags?: string[]
  summary?: string
  description?: string
  operationId: string
  parameters?: (OpenAPIParameter | OpenAPIReference)[]
  requestBody?: OpenAPIRequestBody | OpenAPIReference
  responses: OpenAPIResponses
  callbacks?: Record<string, OpenAPICallback | OpenAPIReference>
  deprecated?: boolean
  security?: OpenAPISecurityRequirement[]
  servers?: OpenAPIServer[]
}

export interface OpenAPIParameter {
  name: string
  in: 'query' | 'header' | 'path' | 'cookie'
  description?: string
  required?: boolean
  deprecated?: boolean
  allowEmptyValue?: boolean
  style?: 'matrix' | 'label' | 'form' | 'simple' | 'spaceDelimited' | 'pipeDelimited' | 'deepObject'
  explode?: boolean
  allowReserved?: boolean
  schema?: OpenAPISchema | OpenAPIReference
  example?: any
  examples?: Record<string, OpenAPIExample | OpenAPIReference>
  content?: Record<string, OpenAPIMediaType>
}

export interface OpenAPIRequestBody {
  description?: string
  content: Record<string, OpenAPIMediaType>
  required?: boolean
}

export interface OpenAPIMediaType {
  schema?: OpenAPISchema | OpenAPIReference
  example?: any
  examples?: Record<string, OpenAPIExample | OpenAPIReference>
  encoding?: Record<string, OpenAPIEncoding>
}

export interface OpenAPIEncoding {
  contentType?: string
  headers?: Record<string, OpenAPIHeader | OpenAPIReference>
  style?: 'form' | 'spaceDelimited' | 'pipeDelimited' | 'deepObject'
  explode?: boolean
  allowReserved?: boolean
}

export interface OpenAPIHeader {
  description?: string
  required?: boolean
  deprecated?: boolean
  allowEmptyValue?: boolean
  style?: 'simple'
  explode?: boolean
  allowReserved?: boolean
  schema?: OpenAPISchema | OpenAPIReference
  example?: any
  examples?: Record<string, OpenAPIExample | OpenAPIReference>
  content?: Record<string, OpenAPIMediaType>
}

export interface OpenAPIExample {
  summary?: string
  description?: string
  value?: any
  externalValue?: string
}

export interface OpenAPISchema {
  type?: 'string' | 'number' | 'integer' | 'boolean' | 'array' | 'object'
  format?: string
  title?: string
  description?: string
  default?: any
  example?: any
  examples?: any[]
  enum?: any[]
  const?: any
  multipleOf?: number
  maximum?: number
  exclusiveMaximum?: number
  minimum?: number
  exclusiveMinimum?: number
  maxLength?: number
  minLength?: number
  pattern?: string
  maxItems?: number
  minItems?: number
  uniqueItems?: boolean
  maxProperties?: number
  minProperties?: number
  required?: string[]
  items?: OpenAPISchema | OpenAPIReference
  additionalItems?: OpenAPISchema | OpenAPIReference
  properties?: Record<string, OpenAPISchema | OpenAPIReference>
  additionalProperties?: OpenAPISchema | OpenAPIReference | boolean
  patternProperties?: Record<string, OpenAPISchema | OpenAPIReference>
  dependencies?: Record<string, OpenAPISchema | OpenAPIReference | string[]>
  propertyNames?: OpenAPISchema | OpenAPIReference
  if?: OpenAPISchema | OpenAPIReference
  then?: OpenAPISchema | OpenAPIReference
  else?: OpenAPISchema | OpenAPIReference
  allOf?: (OpenAPISchema | OpenAPIReference)[]
  oneOf?: (OpenAPISchema | OpenAPIReference)[]
  anyOf?: (OpenAPISchema | OpenAPIReference)[]
  not?: OpenAPISchema | OpenAPIReference
  discriminator?: OpenAPIDiscriminator
  readOnly?: boolean
  writeOnly?: boolean
  xml?: OpenAPIXML
  externalDocs?: OpenAPIExternalDocumentation
  deprecated?: boolean
}

export interface OpenAPIDiscriminator {
  propertyName: string
  mapping?: Record<string, string>
}

export interface OpenAPIXML {
  name?: string
  namespace?: string
  prefix?: string
  attribute?: boolean
  wrapped?: boolean
}

export interface OpenAPIExternalDocumentation {
  description?: string
  url: string
}

export interface OpenAPIReference {
  $ref: string
}

export interface OpenAPIResponses {
  [statusCode: string]: OpenAPIResponse | OpenAPIReference
}

export interface OpenAPIResponse {
  description: string
  headers?: Record<string, OpenAPIHeader | OpenAPIReference>
  content?: Record<string, OpenAPIMediaType>
  links?: Record<string, OpenAPILink | OpenAPIReference>
}

export interface OpenAPILink {
  operationRef?: string
  operationId?: string
  parameters?: Record<string, any>
  requestBody?: any
  description?: string
  server?: OpenAPIServer
}

export interface OpenAPICallback {
  [expression: string]: OpenAPIPathItem
}

export interface OpenAPIComponents {
  schemas?: Record<string, OpenAPISchema | OpenAPIReference>
  responses?: Record<string, OpenAPIResponse | OpenAPIReference>
  parameters?: Record<string, OpenAPIParameter | OpenAPIReference>
  examples?: Record<string, OpenAPIExample | OpenAPIReference>
  requestBodies?: Record<string, OpenAPIRequestBody | OpenAPIReference>
  headers?: Record<string, OpenAPIHeader | OpenAPIReference>
  securitySchemes?: Record<string, OpenAPISecurityScheme | OpenAPIReference>
  links?: Record<string, OpenAPILink | OpenAPIReference>
  callbacks?: Record<string, OpenAPICallback | OpenAPIReference>
}

export interface OpenAPISecurityScheme {
  type: 'apiKey' | 'http' | 'oauth2' | 'openIdConnect'
  description?: string
  name?: string
  in?: 'query' | 'header' | 'cookie'
  scheme?: string
  bearerFormat?: string
  flows?: OpenAPIOAuthFlows
  openIdConnectUrl?: string
}

export interface OpenAPIOAuthFlows {
  implicit?: OpenAPIOAuthFlow
  password?: OpenAPIOAuthFlow
  clientCredentials?: OpenAPIOAuthFlow
  authorizationCode?: OpenAPIOAuthFlow
}

export interface OpenAPIOAuthFlow {
  authorizationUrl?: string
  tokenUrl?: string
  refreshUrl?: string
  scopes: Record<string, string>
}

export interface OpenAPISecurityRequirement {
  [name: string]: string[]
}

// Utility types for API execution
export interface APIExecutionContext {
  apiGroup: string
  operationId: string
  method: string
  path: string
  baseUrl?: string
  parameters: OpenAPIParameter[]
  requestBody?: OpenAPIRequestBody
  responses: OpenAPIResponses
}

export interface ResolvedParameters {
  pathParams: Record<string, any>
  queryParams: Record<string, any>
  headers: Record<string, any>
  body?: any
}

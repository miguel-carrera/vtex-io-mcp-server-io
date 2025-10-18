import type {
  ClientsConfig,
  ServiceContext,
  RecorderState,
  EventContext,
} from '@vtex/api'
import { LRUCache, method, Service } from '@vtex/api'

import { Clients } from './clients'
import { initialLoad } from './middlewares/initialLoad'
import { getApiDefinitions } from './middlewares/getApiDefinitions'
import { getApiDefinitionsGroup } from './middlewares/getApiDefinitionsGroup'
import { getApiSpec } from './middlewares/getApiSpec'
import { getApiPathSpec } from './middlewares/getApiPathSpec'
import { executeApi } from './middlewares/executeApi'
import { uploadApiSpec } from './middlewares/uploadApiSpec'
import { mcpToolsList } from './middlewares/mcpToolsList'
import { mcpToolsCall } from './middlewares/mcpToolsCall'
import { mcpResourcesList } from './middlewares/mcpResourcesList'
import { mcpResourcesRead } from './middlewares/mcpResourcesRead'
import { mcpHandshake } from './middlewares/mcpHandshake'
import { mcpInitialize } from './middlewares/mcpInitialize'
import { mcpInitialized } from './middlewares/mcpInitialized'
import { mcpRouter } from './middlewares/mcpRouter'
import { auth } from './middlewares/auth'
import { errorHandler } from './middlewares/errorHandler'

const TIMEOUT_MS = 10 * 1000

// Create a LRU memory cache for the Status client.
// The 'max' parameter sets the size of the cache.
// The @vtex/api HttpClient respects Cache-Control headers and uses the provided cache.
// Note that the response from the API being called must include an 'etag' header
// or a 'cache-control' header with a 'max-age' value. If neither exist, the response will not be cached.
// To force responses to be cached, consider adding the `forceMaxAge` option to your client methods.
const memoryCache = new LRUCache<string, any>({ max: 5000 })

// This is the configuration for clients available in `ctx.clients`.
const clients: ClientsConfig<Clients> = {
  // We pass our custom implementation of the clients bag, containing the Status client.
  implementation: Clients,
  options: {
    // All IO Clients will be initialized with these options, unless otherwise specified.
    default: {
      retries: 0,
      timeout: TIMEOUT_MS,
    },
    // This key will be merged with the default options and add this cache to our Status client.
    status: {
      memoryCache,
    },
  },
}

declare global {
  // We declare a global Context type just to avoid re-writing ServiceContext<Clients, State> in every handler and resolver
  type Context = ServiceContext<Clients, State>
  type EvtContext = EventContext<Clients>

  // The shape of our State object found in `ctx.state`. This is used as state bag to communicate between middlewares.
  interface State extends RecorderState {
    // Added in the state via graphql directive or auth middleware when request has vtexidclientautcookie
    userProfile?: any
    // Added in the state via auth middleware when request has appkey and apptoken.
    appkey?: string
  }
}

// Export a service that defines route handlers and client options.
export default new Service({
  clients,
  routes: {
    getApiDefinitions: method({
      GET: [errorHandler, auth, initialLoad, getApiDefinitions],
    }),
    getApiDefinitionsGroup: method({
      GET: [errorHandler, auth, initialLoad, getApiDefinitionsGroup],
    }),
    getApiSpec: method({
      GET: [errorHandler, auth, initialLoad, getApiSpec],
    }),
    getApiPathSpec: method({
      GET: [errorHandler, auth, initialLoad, getApiPathSpec],
    }),
    executeApi: method({
      POST: [errorHandler, auth, initialLoad, executeApi],
    }),
    uploadApiSpec: method({
      POST: [errorHandler, auth, initialLoad, uploadApiSpec],
    }),
    mcpToolsList: method({
      POST: [errorHandler, auth, initialLoad, mcpToolsList],
    }),
    mcpToolsCall: method({
      POST: [errorHandler, auth, initialLoad, mcpToolsCall],
    }),
    mcpResourcesList: method({
      POST: [errorHandler, auth, initialLoad, mcpResourcesList],
    }),
    mcpResourcesRead: method({
      POST: [errorHandler, auth, initialLoad, mcpResourcesRead],
    }),
    mcpHandshake: method({
      POST: [errorHandler, auth, initialLoad, mcpHandshake],
    }),
    mcpInitialize: method({
      POST: [errorHandler, auth, initialLoad, mcpInitialize],
    }),
    mcpInitialized: method({
      POST: [errorHandler, auth, initialLoad, mcpInitialized],
    }),
    mcp: method({
      POST: [errorHandler, auth, initialLoad, mcpRouter],
    }),
    mcpInstance: method({
      POST: [errorHandler, auth, initialLoad, mcpRouter],
    }),
  },
})

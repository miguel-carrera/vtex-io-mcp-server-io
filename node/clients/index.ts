import { IOClients, Sphinx } from '@vtex/api'

import { ReturnApp } from './ReturnApp'
import { VTEXAPIClient } from './VTEXAPIClient'
import OpenAPIClient from './OpenAPIClient'
import { VtexId } from './vtexId'

// Extend the default IOClients implementation with our own custom clients.
export class Clients extends IOClients {
  public get returnApp() {
    return this.getOrSet('returnApp', ReturnApp)
  }

  public get vtexApi() {
    return this.getOrSet('vtexApi', VTEXAPIClient)
  }

  public get openApi() {
    return this.getOrSet('openApi', OpenAPIClient)
  }

  public get vtexId() {
    return this.getOrSet('vtexId', VtexId)
  }

  public get sphinx() {
    return this.getOrSet('sphinx', Sphinx)
  }
}

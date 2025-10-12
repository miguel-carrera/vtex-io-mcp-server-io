import { IOClients } from '@vtex/api'

import { ReturnApp } from './ReturnApp'
import { OMSCustom } from './OMSCustom'
import KiboAPIClient from './KiboAPIClient'
import { VTEXAPIClient } from './VTEXAPIClient'
import OpenAPIClient from './OpenAPIClient'

// Extend the default IOClients implementation with our own custom clients.
export class Clients extends IOClients {
  public get returnApp() {
    return this.getOrSet('returnApp', ReturnApp)
  }

  public get omsCustom() {
    return this.getOrSet('omsCustom', OMSCustom)
  }

  public get kibo() {
    return this.getOrSet('kibo', KiboAPIClient)
  }

  public get vtexApi() {
    return this.getOrSet('vtexApi', VTEXAPIClient)
  }

  public get openApi() {
    return this.getOrSet('openApi', OpenAPIClient)
  }
}

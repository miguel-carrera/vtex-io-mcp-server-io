import type { MCPConfig } from '../types'
import { logToMasterData } from '../utils/logging'

// get the request Order information and load initial apps settings
export async function initialLoad(
  ctx: Context | EvtContext,
  next: () => Promise<any>
) {
  const {
    clients: { apps, masterData },
  } = ctx

  // Get instance from URL parameters
  const { instance } = ctx.vtex.route.params
  const instanceValue = (instance as string) ?? 'default'

  // Load the app Settings
  const appId = process.env.VTEX_APP_ID as string
  const appSettings = await apps.getAppSettings(appId)

  // Load MCP configuration from MasterData v2
  let mcpConfig: MCPConfig | undefined

  if (instanceValue) {
    try {
      const configResponse = await masterData.searchDocuments({
        dataEntity: 'vtex_mcp_configs',
        fields: [
          'instance',
          'enabled',
          'description',
          'disabledMethods',
          'excludeFavorites',
        ],
        where: `instance=${instanceValue} AND enabled=true`,
        pagination: {
          page: 1,
          pageSize: 1,
        },
        schema: 'configs',
      })

      if (configResponse.length > 0) {
        mcpConfig = configResponse[0] as MCPConfig
      }
    } catch (error) {
      await logToMasterData(ctx, 'initialLoad', instanceValue, 'error', error)
    }
  }

  // Set the state body for next middlewares
  ctx.state.body = {
    appSettings,
    instance: instanceValue,
    mcpConfig,
  }

  return next()
}

import type { OpenAPISpec } from '../types/openapi'
import { logToMasterData } from '../utils/logging'

export interface APISpecData {
  apiGroup: string
  version: string
  specUrl: string
  enabled: boolean
  description?: string
  operationCount?: number
}

export interface APISpecDocument extends APISpecData {
  id: string
}

export class MasterDataService {
  private readonly dataEntity = 'vtex_mcp_api_specs'
  private readonly schema = 'api_specs'
  private readonly cache = new Map<string, APISpecDocument>()
  private readonly cacheTTL = 5 * 60 * 1000 // 5 minutes
  private readonly cacheTimestamps = new Map<string, number>()

  constructor(private ctx: Context) {}

  /**
   * Retrieve all enabled API specifications
   */
  public async getAPISpecs(): Promise<APISpecDocument[]> {
    const cacheKey = 'all_specs'

    // Check cache first
    if (this.isCacheValid(cacheKey)) {
      const cached = this.cache.get(cacheKey)

      if (cached) {
        return [cached]
      }
    }

    try {
      const response = await this.ctx.clients.masterdata.searchDocuments({
        dataEntity: this.dataEntity,
        fields: [
          'id',
          'apiGroup',
          'version',
          'specUrl',
          'enabled',
          'description',
          'operationCount',
        ],
        where: 'enabled=true',
        pagination: {
          page: 1,
          pageSize: 100,
        },
        schema: this.schema,
      })

      const specs = response.map((doc: any) => ({
        id: doc.id,
        apiGroup: doc.apiGroup,
        version: doc.version,
        specUrl: doc.specUrl,
        enabled: doc.enabled,
        description: doc.description,
        operationCount: doc.operationCount,
      }))

      // Cache the results
      this.setCache(cacheKey, specs as any)

      return specs
    } catch (error) {
      await logToMasterData(
        this.ctx,
        'getAPISpecs',
        'masterDataService',
        'error',
        error
      )
      throw new Error('Failed to retrieve API specifications')
    }
  }

  /**
   * Get a specific API group's specification
   */
  public async getAPISpecByGroup(
    group: string
  ): Promise<APISpecDocument | null> {
    const cacheKey = `group_${group}`

    // Check cache first
    if (this.isCacheValid(cacheKey)) {
      const cached = this.cache.get(cacheKey)

      if (cached) {
        return cached
      }
    }

    try {
      const response = await this.ctx.clients.masterdata.searchDocuments({
        dataEntity: this.dataEntity,
        fields: [
          'id',
          'apiGroup',
          'version',
          'specUrl',
          'enabled',
          'description',
          'operationCount',
        ],
        where: `apiGroup=${group} AND enabled=true`,
        pagination: {
          page: 1,
          pageSize: 1,
        },
        schema: this.schema,
      })

      if (response.length === 0) {
        return null
      }

      const doc = response[0] as any
      const spec: APISpecDocument = {
        id: doc.id,
        apiGroup: doc.apiGroup,
        version: doc.version,
        specUrl: doc.specUrl,
        enabled: doc.enabled,
        description: doc.description,
        operationCount: doc.operationCount,
      }

      // Cache the result
      this.setCache(cacheKey, spec)

      return spec
    } catch (error) {
      await logToMasterData(
        this.ctx,
        'getAPISpecByGroup',
        'masterDataService',
        'error',
        error
      )
      throw new Error(
        `Failed to retrieve API specification for group: ${group}`
      )
    }
  }

  /**
   * Save or update an API specification
   */
  public async saveAPISpec(data: APISpecData): Promise<APISpecDocument> {
    try {
      const existing = await this.findExistingSpec(data.apiGroup, data.version)

      const specData = {
        ...data,
      }

      // Create or update existing spec
      const result =
        await this.ctx.clients.masterdata.createOrUpdateEntireDocument({
          dataEntity: this.dataEntity,
          fields: specData,
          id: existing?.id,
          schema: this.schema,
        })

      // Always clear the "all specs" cache when data changes
      this.clearCache('all_specs')

      if (existing) {
        // Update cache for the specific group
        this.setCache(`group_${data.apiGroup}`, {
          id: existing.id,
          ...specData,
        })
      }

      return {
        id: result.DocumentId || existing?.id || result.Id,
        ...specData,
      }
    } catch (error) {
      await logToMasterData(
        this.ctx,
        'saveAPISpec',
        'masterDataService',
        'error',
        error
      )
      throw new Error('Failed to save API specification')
    }
  }

  /**
   * Delete an API specification
   */
  public async deleteAPISpec(id: string): Promise<void> {
    try {
      await this.ctx.clients.masterdata.deleteDocument({
        dataEntity: this.dataEntity,
        id,
      })

      // Clear all caches since we don't know which group was deleted
      this.clearAllCache()
    } catch (error) {
      await logToMasterData(
        this.ctx,
        'deleteAPISpec',
        'masterDataService',
        'error',
        error
      )
      throw new Error('Failed to delete API specification')
    }
  }

  /**
   * Disable an API specification (soft delete)
   */
  public async disableAPISpec(id: string): Promise<void> {
    try {
      await this.ctx.clients.masterdata.updatePartialDocument({
        dataEntity: this.dataEntity,
        id,
        fields: {
          enabled: false,
        },
        schema: this.schema,
      })

      // Clear all caches
      this.clearAllCache()
    } catch (error) {
      await logToMasterData(
        this.ctx,
        'disableAPISpec',
        'masterDataService',
        'error',
        error
      )
      throw new Error('Failed to disable API specification')
    }
  }

  /**
   * Find existing specification by group and version
   */
  private async findExistingSpec(
    apiGroup: string,
    version: string
  ): Promise<APISpecDocument | null> {
    try {
      const response = await this.ctx.clients.masterdata.searchDocuments({
        dataEntity: this.dataEntity,
        fields: [
          'id',
          'apiGroup',
          'version',
          'specUrl',
          'enabled',
          'description',
          'operationCount',
        ],
        where: `apiGroup=${apiGroup} AND version=${version}`,
        pagination: {
          page: 1,
          pageSize: 1,
        },
        schema: this.schema,
      })

      if (response.length === 0) {
        return null
      }

      return {
        id: (response[0] as any).id,
        apiGroup: (response[0] as any).apiGroup,
        version: (response[0] as any).version,
        specUrl: (response[0] as any).specUrl,
        enabled: (response[0] as any).enabled,
        description: (response[0] as any).description,
        operationCount: (response[0] as any).operationCount,
      }
    } catch (error) {
      await logToMasterData(
        this.ctx,
        'findExistingAPISpec',
        'masterDataService',
        'error',
        error
      )

      return null
    }
  }

  /**
   * Check if cache entry is still valid
   */
  private isCacheValid(key: string): boolean {
    const timestamp = this.cacheTimestamps.get(key)

    if (!timestamp) {
      return false
    }

    return Date.now() - timestamp < this.cacheTTL
  }

  /**
   * Set cache entry with timestamp
   */
  private setCache(
    key: string,
    value: APISpecDocument | APISpecDocument[]
  ): void {
    this.cache.set(key, value as any)
    this.cacheTimestamps.set(key, Date.now())
  }

  /**
   * Clear specific cache entry
   */
  private clearCache(key: string): void {
    this.cache.delete(key)
    this.cacheTimestamps.delete(key)
  }

  /**
   * Clear all cache entries
   */
  private clearAllCache(): void {
    this.cache.clear()
    this.cacheTimestamps.clear()
  }

  /**
   * Get cache statistics for debugging
   */
  public getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    }
  }

  /**
   * Fetch OpenAPI specification from URL using dedicated OpenAPI client
   */
  public async fetchSpecFromUrl(specUrl: string): Promise<OpenAPISpec> {
    try {
      return await this.ctx.clients.openApi.fetchSpecFromUrl(specUrl)
    } catch (error) {
      await logToMasterData(
        this.ctx,
        'fetchSpecFromUrl',
        'masterDataService',
        'error',
        error
      )
      throw new Error(`Failed to fetch specification from ${specUrl}`)
    }
  }

  /**
   * Count operations in an OpenAPI specification
   */
  public countOperations(spec: OpenAPISpec): number {
    let count = 0

    for (const pathItem of Object.values(spec.paths)) {
      const methods = [
        'get',
        'post',
        'put',
        'patch',
        'delete',
        'head',
        'options',
      ]

      for (const method of methods) {
        if (pathItem[method as keyof typeof pathItem]) {
          count++
        }
      }
    }

    return count
  }
}

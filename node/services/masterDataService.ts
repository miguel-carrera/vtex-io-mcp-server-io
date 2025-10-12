import type { OpenAPISpec } from '../types/openapi'

export interface APISpecData {
  apiGroup: string
  version: string
  specUrl: string
  enabled: boolean
  lastUpdated: string
  description?: string
  tags?: string[]
  operationCount?: number
  uploadedBy?: string
  uploadedAt?: string
}

export interface APISpecDocument extends APISpecData {
  id: string
}

export class MasterDataService {
  private readonly dataEntity = 'vtex_mcp_api_specs'
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
        fields: ['id', 'apiGroup', 'version', 'spec', 'enabled', 'lastUpdated'],
        where: 'enabled=true',
        pagination: {
          page: 1,
          pageSize: 100,
        },
      })

      const specs = response.map((doc: any) => ({
        id: doc.id,
        apiGroup: doc.apiGroup,
        version: doc.version,
        specUrl: doc.specUrl,
        enabled: doc.enabled,
        lastUpdated: doc.lastUpdated,
        description: doc.description,
        tags: doc.tags,
        operationCount: doc.operationCount,
        uploadedBy: doc.uploadedBy,
        uploadedAt: doc.uploadedAt,
      }))

      // Cache the results
      this.setCache(cacheKey, specs as any)
      
      return specs
    } catch (error) {
      this.ctx.vtex.logger.error({
        error,
        message: 'Failed to retrieve API specifications from MasterData',
      })
      throw new Error('Failed to retrieve API specifications')
    }
  }

  /**
   * Get a specific API group's specification
   */
  public async getAPISpecByGroup(group: string): Promise<APISpecDocument | null> {
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
        fields: ['id', 'apiGroup', 'version', 'specUrl', 'enabled', 'lastUpdated', 'description', 'tags', 'operationCount', 'uploadedBy', 'uploadedAt'],
        where: `apiGroup=${group} AND enabled=true`,
        pagination: {
          page: 1,
          pageSize: 1,
        },
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
        lastUpdated: doc.lastUpdated,
        description: doc.description,
        tags: doc.tags,
        operationCount: doc.operationCount,
        uploadedBy: doc.uploadedBy,
        uploadedAt: doc.uploadedAt,
      }

      // Cache the result
      this.setCache(cacheKey, spec)
      
      return spec
    } catch (error) {
      this.ctx.vtex.logger.error({
        error,
        data: { group },
        message: 'Failed to retrieve API specification by group from MasterData',
      })
      throw new Error(`Failed to retrieve API specification for group: ${group}`)
    }
  }

  /**
   * Save or update an API specification
   */
  public async saveAPISpec(data: APISpecData): Promise<APISpecDocument> {
    try {
      // Check if spec already exists
      const existing = await this.findExistingSpec(data.apiGroup, data.version)
      
      const specData = {
        ...data,
        lastUpdated: new Date().toISOString(),
      }

      let result: any

      if (existing) {
        // Update existing spec
        result = await (this.ctx.clients.masterdata as any).updateDocument({
          dataEntity: this.dataEntity,
          id: existing.id,
          fields: specData,
        })
        
        // Update cache
        this.setCache(`group_${data.apiGroup}`, {
          id: existing.id,
          ...specData,
        })
      } else {
        // Create new spec
        result = await this.ctx.clients.masterdata.createDocument({
          dataEntity: this.dataEntity,
          fields: specData,
        })
      }

      // Clear the "all specs" cache since it's now outdated
      this.clearCache('all_specs')

      return {
        id: result.DocumentId || existing?.id || result.id,
        ...specData,
      }
    } catch (error) {
      this.ctx.vtex.logger.error({
        error,
        data,
        message: 'Failed to save API specification to MasterData',
      })
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
      this.ctx.vtex.logger.error({
        error,
        data: { id },
        message: 'Failed to delete API specification from MasterData',
      })
      throw new Error('Failed to delete API specification')
    }
  }

  /**
   * Disable an API specification (soft delete)
   */
  public async disableAPISpec(id: string): Promise<void> {
    try {
      await (this.ctx.clients.masterdata as any).updateDocument({
        dataEntity: this.dataEntity,
        id,
        fields: {
          enabled: false,
          lastUpdated: new Date().toISOString(),
        },
      })

      // Clear all caches
      this.clearAllCache()
    } catch (error) {
      this.ctx.vtex.logger.error({
        error,
        data: { id },
        message: 'Failed to disable API specification in MasterData',
      })
      throw new Error('Failed to disable API specification')
    }
  }

  /**
   * Find existing specification by group and version
   */
  private async findExistingSpec(apiGroup: string, version: string): Promise<APISpecDocument | null> {
    try {
      const response = await this.ctx.clients.masterdata.searchDocuments({
        dataEntity: this.dataEntity,
        fields: ['id', 'apiGroup', 'version'],
        where: `apiGroup=${apiGroup} AND version=${version}`,
        pagination: {
          page: 1,
          pageSize: 1,
        },
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
        lastUpdated: (response[0] as any).lastUpdated,
        description: (response[0] as any).description,
        tags: (response[0] as any).tags,
        operationCount: (response[0] as any).operationCount,
        uploadedBy: (response[0] as any).uploadedBy,
        uploadedAt: (response[0] as any).uploadedAt,
      }
    } catch (error) {
      this.ctx.vtex.logger.error({
        error,
        data: { apiGroup, version },
        message: 'Failed to find existing API specification',
      })
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
  private setCache(key: string, value: APISpecDocument | APISpecDocument[]): void {
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
   * Fetch OpenAPI specification from URL using IO client with built-in caching
   */
  public async fetchSpecFromUrl(specUrl: string): Promise<OpenAPISpec> {
    try {
      const response = await this.ctx.clients.vtexApi.get(specUrl)
      
      // Validate that it's a valid OpenAPI spec
      if (!response.openapi || !response.info || !response.paths) {
        throw new Error('Invalid OpenAPI specification format')
      }

      return response as OpenAPISpec
    } catch (error) {
      this.ctx.vtex.logger.error({
        error,
        data: { specUrl },
        message: 'Failed to fetch OpenAPI specification from URL',
      })
      throw new Error(`Failed to fetch specification from ${specUrl}`)
    }
  }

  /**
   * Count operations in an OpenAPI specification
   */
  public countOperations(spec: OpenAPISpec): number {
    let count = 0
    for (const pathItem of Object.values(spec.paths)) {
      const methods = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options']
      for (const method of methods) {
        if (pathItem[method as keyof typeof pathItem]) {
          count++
        }
      }
    }
    return count
  }
}

'use client'

import crypto from 'crypto'

export interface CacheEntry<T> {
  key: string
  value: T
  timestamp: number
  accessCount: number
  lastAccessed: number
  size: number
  ttl?: number
}

export interface CacheStats {
  totalEntries: number
  totalSize: number
  hitRate: number
  missRate: number
  memoryUsage: number
}

export interface CacheConfig {
  maxSize: number // Max memory in bytes
  maxEntries: number
  defaultTTL: number // milliseconds
  cleanupInterval: number
}

class DesktopCache<T> {
  private cache: Map<string, CacheEntry<T>> = new Map()
  private config: CacheConfig
  private stats = {
    hits: 0,
    misses: 0,
    totalSize: 0
  }
  private cleanupTimer?: NodeJS.Timeout

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      maxSize: 50 * 1024 * 1024, // 50MB default
      maxEntries: 1000,
      defaultTTL: 60 * 60 * 1000, // 1 hour
      cleanupInterval: 5 * 60 * 1000, // 5 minutes
      ...config
    }

    this.startCleanup()
  }

  set(key: string, value: T, ttl?: number): void {
    const size = this.calculateSize(value)
    const entry: CacheEntry<T> = {
      key,
      value,
      timestamp: Date.now(),
      accessCount: 0,
      lastAccessed: Date.now(),
      size,
      ttl: ttl || this.config.defaultTTL
    }

    // Remove existing entry if it exists
    if (this.cache.has(key)) {
      const existingEntry = this.cache.get(key)!
      this.stats.totalSize -= existingEntry.size
    }

    // Check if we need to make room
    this.ensureSpace(size)

    this.cache.set(key, entry)
    this.stats.totalSize += size
  }

  get(key: string): T | undefined {
    const entry = this.cache.get(key)
    
    if (!entry) {
      this.stats.misses++
      return undefined
    }

    // Check TTL
    if (entry.ttl && Date.now() - entry.timestamp > entry.ttl) {
      this.delete(key)
      this.stats.misses++
      return undefined
    }

    // Update access stats
    entry.lastAccessed = Date.now()
    entry.accessCount++
    this.stats.hits++

    return entry.value
  }

  delete(key: string): boolean {
    const entry = this.cache.get(key)
    if (entry) {
      this.stats.totalSize -= entry.size
      return this.cache.delete(key)
    }
    return false
  }

  clear(): void {
    this.cache.clear()
    this.stats.totalSize = 0
    this.stats.hits = 0
    this.stats.misses = 0
  }

  has(key: string): boolean {
    const entry = this.cache.get(key)
    if (!entry) return false

    // Check TTL
    if (entry.ttl && Date.now() - entry.timestamp > entry.ttl) {
      this.delete(key)
      return false
    }

    return true
  }

  keys(): string[] {
    return Array.from(this.cache.keys())
  }

  values(): T[] {
    return Array.from(this.cache.values()).map(entry => entry.value)
  }

  size(): number {
    return this.cache.size
  }

  getStats(): CacheStats {
    const totalRequests = this.stats.hits + this.stats.misses
    return {
      totalEntries: this.cache.size,
      totalSize: this.stats.totalSize,
      hitRate: totalRequests > 0 ? this.stats.hits / totalRequests : 0,
      missRate: totalRequests > 0 ? this.stats.misses / totalRequests : 0,
      memoryUsage: this.stats.totalSize / this.config.maxSize
    }
  }

  private ensureSpace(requiredSize: number): void {
    // If the single item is larger than max size, reject it
    if (requiredSize > this.config.maxSize * 0.5) {
      throw new Error('Item too large for cache')
    }

    // Clean up expired entries first
    this.cleanupExpired()

    // If still not enough space, use LRU eviction
    while (
      this.stats.totalSize + requiredSize > this.config.maxSize ||
      this.cache.size >= this.config.maxEntries
    ) {
      this.evictLRU()
    }
  }

  private evictLRU(): void {
    let oldestEntry: [string, CacheEntry<T>] | undefined
    let oldestTime = Date.now()

    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed
        oldestEntry = [key, entry]
      }
    }

    if (oldestEntry) {
      this.delete(oldestEntry[0])
    }
  }

  private cleanupExpired(): void {
    const now = Date.now()
    const expiredKeys: string[] = []

    for (const [key, entry] of this.cache.entries()) {
      if (entry.ttl && now - entry.timestamp > entry.ttl) {
        expiredKeys.push(key)
      }
    }

    for (const key of expiredKeys) {
      this.delete(key)
    }
  }

  private calculateSize(value: T): number {
    // Rough size calculation for JavaScript objects
    const json = JSON.stringify(value)
    return new Blob([json]).size
  }

  private startCleanup(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanupExpired()
    }, this.config.cleanupInterval)
  }

  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer)
    }
    this.clear()
  }
}

// Specialized cache for analysis results
export class AnalysisCache extends DesktopCache<any> {
  constructor() {
    super({
      maxSize: 100 * 1024 * 1024, // 100MB for analysis results
      maxEntries: 500,
      defaultTTL: 24 * 60 * 60 * 1000, // 24 hours
      cleanupInterval: 10 * 60 * 1000 // 10 minutes
    })
  }

  // Generate cache key based on content hash and analysis type
  generateKey(content: string, analysisType: string, options?: any): string {
    const hash = crypto.createHash('sha256')
    hash.update(content)
    hash.update(analysisType)
    if (options) {
      hash.update(JSON.stringify(options))
    }
    return hash.digest('hex')
  }

  // Store analysis result with content-based key
  storeAnalysis(
    content: string,
    analysisType: string,
    result: any,
    options?: any
  ): void {
    const key = this.generateKey(content, analysisType, options)
    this.set(key, result)
  }

  // Retrieve analysis result
  getAnalysis(
    content: string,
    analysisType: string,
    options?: any
  ): any | undefined {
    const key = this.generateKey(content, analysisType, options)
    return this.get(key)
  }

  // Check if analysis exists in cache
  hasAnalysis(
    content: string,
    analysisType: string,
    options?: any
  ): boolean {
    const key = this.generateKey(content, analysisType, options)
    return this.has(key)
  }

  // Store partial results for incremental analysis
  storePartialResult(
    chunkId: string,
    result: any,
    ttl?: number
  ): void {
    const key = `partial_${chunkId}`
    this.set(key, result, ttl || 60 * 60 * 1000) // 1 hour TTL for partial results
  }

  getPartialResult(chunkId: string): any | undefined {
    const key = `partial_${chunkId}`
    return this.get(key)
  }

  // Clean up all partial results
  clearPartialResults(): void {
    const partialKeys = this.keys().filter(key => key.startsWith('partial_'))
    for (const key of partialKeys) {
      this.delete(key)
    }
  }
}

// Specialized cache for manuscript data
export class ManuscriptCache extends DesktopCache<any> {
  constructor() {
    super({
      maxSize: 200 * 1024 * 1024, // 200MB for manuscript data
      maxEntries: 100, // Fewer entries but larger size
      defaultTTL: 7 * 24 * 60 * 60 * 1000, // 7 days
      cleanupInterval: 30 * 60 * 1000 // 30 minutes
    })
  }

  // Store manuscript with version tracking
  storeManuscript(
    manuscriptId: string,
    content: any,
    version: number
  ): void {
    const key = `manuscript_${manuscriptId}_v${version}`
    this.set(key, content)
    
    // Also store latest version pointer
    this.set(`latest_${manuscriptId}`, { version, key })
  }

  getLatestManuscript(manuscriptId: string): any | undefined {
    const latest = this.get(`latest_${manuscriptId}`)
    if (!latest) return undefined

    return this.get(latest.key)
  }

  getManuscriptVersion(
    manuscriptId: string,
    version: number
  ): any | undefined {
    const key = `manuscript_${manuscriptId}_v${version}`
    return this.get(key)
  }

  // Clean up old versions, keeping only the latest N versions
  cleanupOldVersions(manuscriptId: string, keepVersions = 5): void {
    const keys = this.keys().filter(key => 
      key.startsWith(`manuscript_${manuscriptId}_v`)
    )
    
    // Sort by version number
    keys.sort((a, b) => {
      const versionA = parseInt(a.split('_v')[1])
      const versionB = parseInt(b.split('_v')[1])
      return versionB - versionA // Descending order
    })

    // Delete old versions
    for (let i = keepVersions; i < keys.length; i++) {
      this.delete(keys[i])
    }
  }
}

// Memory-efficient cache for large text processing
export class ChunkCache extends DesktopCache<string> {
  constructor() {
    super({
      maxSize: 50 * 1024 * 1024, // 50MB for text chunks
      maxEntries: 2000,
      defaultTTL: 30 * 60 * 1000, // 30 minutes
      cleanupInterval: 5 * 60 * 1000 // 5 minutes
    })
  }

  storeChunk(
    manuscriptId: string,
    chunkIndex: number,
    content: string
  ): void {
    const key = `chunk_${manuscriptId}_${chunkIndex}`
    this.set(key, content)
  }

  getChunk(manuscriptId: string, chunkIndex: number): string | undefined {
    const key = `chunk_${manuscriptId}_${chunkIndex}`
    return this.get(key)
  }

  getChunks(manuscriptId: string): string[] {
    const chunks: { index: number; content: string }[] = []
    
    for (const key of this.keys()) {
      if (key.startsWith(`chunk_${manuscriptId}_`)) {
        const index = parseInt(key.split('_')[2])
        const content = this.get(key)
        if (content) {
          chunks.push({ index, content })
        }
      }
    }

    // Sort by index and return content
    return chunks.sort((a, b) => a.index - b.index).map(chunk => chunk.content)
  }

  clearManuscriptChunks(manuscriptId: string): void {
    const keys = this.keys().filter(key => key.startsWith(`chunk_${manuscriptId}_`))
    for (const key of keys) {
      this.delete(key)
    }
  }
}

// Global cache instances
export const analysisCache = new AnalysisCache()
export const manuscriptCache = new ManuscriptCache()
export const chunkCache = new ChunkCache()

export default {
  analysisCache,
  manuscriptCache,
  chunkCache,
  DesktopCache
}
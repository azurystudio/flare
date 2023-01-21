import ms from 'https://esm.sh/ms@2.1.3'
import type { Namespace } from './Namespace.d.ts'

type GetWithOrWithoutMetadata = { metadata: true } | undefined
type Partialize<T, K extends keyof T> = Partial<Pick<T, K>> & Omit<T, K>
type PartialKey<T> = Partialize<T, keyof T>

class flare<Schema extends Record<string, unknown> | string> {
  private namespace: Namespace

  constructor(namespace: Namespace) {
    this.namespace = namespace
  }

  async set(key: string, value: Schema, options?: { expiresIn?: string, expiresAt?: Date, metadata?: Record<string, unknown> }) {
    await this.namespace.put(
      key,
      typeof value === 'string' ? value : JSON.stringify(value),
      options ? {
        ...(options.expiresIn && { expirationTtl: ms(options.expiresIn) / 1000 }),
        ...(options.expiresAt && { expiration: Math.round(options.expiresAt.getTime() / 1000) }),
        ...(options.metadata && { metadata: options.metadata })
      } : undefined
    )
  }

  async get<T extends GetWithOrWithoutMetadata = undefined>(key: string, options?: T): Promise<(T extends { metadata: true } ? { value: Schema, metadata: { [key: string]: any } | undefined } : Schema) | undefined> {
    if (options?.metadata) {
      const raw = await this.namespace.getWithMetadata(key)

      if (!raw.value) return
  
      if (raw.value.startsWith('{'))
        // @ts-ignore
        return {
          value: JSON.parse(raw.value),
          // deno-lint-ignore no-explicit-any
          metadata: raw.metadata as { [key: string]: any } | undefined
        }
    } else {
      const raw = await this.namespace.get(key)

      if (!raw) return
  
      if (raw.startsWith('{'))
        return JSON.parse(raw)
    }
  }

  async has(key: string) {
    return await this.namespace.get(key) !== null
  }

  async update(key: string, value: Schema extends object ? PartialKey<Schema> : string): Promise<Schema | undefined> {
    const raw = await this.namespace.get(key)
  
    if (!raw) return

    let updated: Schema
    , updatedString

    if (raw.startsWith('{') && typeof value === 'object') {
      const original = JSON.parse(raw)

      updated = Object.assign({}, original, value)
      updatedString = JSON.stringify(updated)
    } else if (typeof value === 'object') {
      // @ts-ignore
      updated = value
      updatedString = JSON.stringify(value)
    } else {
      // @ts-ignore
      updated = value
    }

    // @ts-ignore
    await namespace.put(key, updatedString ?? updated)

    return updated
  }

  // deno-lint-ignore no-explicit-any
  async list(options?: { prefix?: string, limit?: number, cursor?: string }): Promise<{ keys: { [key: string]: { expiresAt?: Date, metadata?: { [key: string]: any } }}, cursor: undefined, isComplete: true } | { keys: { [key: string]: { expiresAt?: number, metadata?: { [key: string]: any } }}, cursor: string, isComplete: false }> {
    const result = await this.namespace.list(
      options ? {
        ...(options.prefix && { prefix: options.prefix }),
        ...(options.limit && { limit: options.limit }),
        ...(options.cursor && { cursor: options.cursor })
      } : undefined
    )

    if (result.keys.length === 0)
      return {
        keys: {},
        cursor: undefined,
        isComplete: true
      }

    const keys: { [key: string]: { expiresAt?: Date, metadata?: { [key: string]: any } }} = {}

    for (let i = 0; i < result.keys.length; i++) {
      const item = result.keys[i]

      keys[item.name] = {
        ...(item.expiration && { expiresAt: new Date(item.expiration * 1000) }),
        // @ts-ignore
        ...(item.metadata && { metadata: item.metadata })
      }
    }

    // @ts-ignore
    return {
      keys,
      // @ts-ignore
      cursor: result.cursor,
      isComplete: result.list_complete
    }
  }

  async delete(key: string) {
    await this.namespace.delete(key)
  }
}

export default flare

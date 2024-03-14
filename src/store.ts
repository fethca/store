import { Redis, RedisOptions } from 'ioredis'

export class Store {
  localInstance: Map<string, { value: string; expire: number }>
  redisInstance?: Redis
  expirationTime = 3600

  constructor() {
    //Local fallback in case my redis is down. Use redis sentinel and replication in real world projects
    this.localInstance = new Map()
  }

  initClient(redisOptions: RedisOptions & { cacheDuration?: number }): Promise<void> {
    this.redisInstance = new Redis({ ...redisOptions, lazyConnect: true })
    if (redisOptions.cacheDuration) this.expirationTime = redisOptions.cacheDuration
    return this.redisInstance.connect()
  }

  get(key: string): Promise<string | null> {
    if (this.redisInstance) {
      return this.redisInstance.get(key).catch(() => this.getLocal(key))
    }
    return this.getLocal(key)
  }

  getLocal(key: string): Promise<string | null> {
    return new Promise((resolve) => {
      const local = this.localInstance.get(key)
      if (local && local.expire > Date.now()) resolve(local.value)
      else resolve(null)
    })
  }

  async set(key: string, value: string, time?: number): Promise<void> {
    if (this.redisInstance) {
      await this.redisInstance.set(key, value, 'EX', time || this.expirationTime).catch(() => undefined)
    }
    const expire = Date.now() + this.expirationTime
    this.localInstance.set(key, { value, expire })
  }

  async incr(key: string, time = 3600): Promise<number> {
    let count = 0
    if (this.redisInstance) {
      count = await this.redisInstance.incr(key).catch(() => this.incrLocal(key))
    } else {
      count = await this.incrLocal(key)
    }
    if (count === 1) {
      await this.expire(key, time)
    }
    return count
  }

  incrLocal(key: string): Promise<number> {
    return new Promise((resolve) => {
      const local = this.localInstance.get(key)
      const count = local ? parseInt(local.value) + 1 : 1
      const expire = Date.now() + this.expirationTime
      this.localInstance.set(key, { value: count.toString(), expire })
      resolve(count)
    })
  }

  expire(key: string, time: number): Promise<number> {
    if (this.redisInstance) {
      return this.redisInstance.expire(key, time).catch(() => this.expireLocal(key, time))
    }
    return this.expireLocal(key, time)
  }

  expireLocal(key: string, time: number): Promise<number> {
    return new Promise((resolve) => {
      const expire = Date.now() + time
      const value = this.localInstance.get(key)?.value || ''
      this.localInstance.set(key, { value, expire })
      resolve(expire)
    })
  }
}

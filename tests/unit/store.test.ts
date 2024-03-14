import { Redis } from 'ioredis'
import { Store } from '../../src/store.js'

vi.mock('ioredis')

describe('Store', () => {
  it('should init local instance', () => {
    const store = new Store()
    expect(store.localInstance).toBeInstanceOf(Map)
  })

  describe('queries', () => {
    const redisInstance = {
      connect: vi.fn().mockResolvedValue(''),
      get: vi.fn(),
      set: vi.fn(),
      incr: vi.fn(),
      expire: vi.fn(),
    }

    beforeEach(() => {
      vi.mocked(Redis).mockImplementation(() => redisInstance as never)
    })

    it('should get keys from redis server', async () => {
      redisInstance.get.mockResolvedValue('keyData')
      const store = new Store()
      await store.initClient({})

      const data = await store.get('key')
      expect(data).toBe('keyData')
    })

    it('should get keys from redis mock instance on redis error', async () => {
      redisInstance.get.mockRejectedValue('Failed')
      const store = new Store()
      await store.initClient({})

      store.localInstance.set('key', { value: 'mockInstanceData', expire: Infinity })
      const data = await store.get('key')
      expect(redisInstance.get).toHaveBeenCalled()
      expect(data).toBe('mockInstanceData')
    })

    it('should set keys in redis mock instance and redis server', async () => {
      redisInstance.set.mockResolvedValue('OK')
      const store = new Store()
      await store.initClient({})

      await store.set('key', 'value')

      expect(redisInstance.set).toHaveBeenCalled()
      expect(store.localInstance.get('key')?.value).toBe('value')
    })

    it('should set keys in redis mock instance and redis server with options', async () => {
      redisInstance.set.mockResolvedValue('OK')
      const store = new Store()
      await store.initClient({})

      await store.set('key', 'value', 3600)

      expect(redisInstance.set).toHaveBeenCalledWith('key', 'value', 'EX', 3600)
      const local = store.localInstance.get('key')
      expect(local?.value).toBe('value')
      expect(local?.expire).toBe(Date.now() + 3600)
    })

    it('should increment redis server key', async () => {
      redisInstance.incr.mockResolvedValue(2)
      const store = new Store()
      await store.initClient({})

      const data = await store.incr('key')

      expect(data).toBe(2)
    })

    it('should set expiration time if it is the first increment', async () => {
      redisInstance.incr.mockResolvedValue(1)
      redisInstance.expire.mockResolvedValue(1)
      const store = new Store()
      await store.initClient({})

      const data = await store.incr('key', 60)

      expect(redisInstance.expire).toHaveBeenCalledWith('key', 60)
      expect(data).toBe(1)
    })

    it('should increment key from redis mock instance on redis error', async () => {
      redisInstance.incr.mockRejectedValue('Failed')
      redisInstance.expire.mockRejectedValue('Failed')
      const store = new Store()
      await store.initClient({})

      const data = await store.incr('key')

      expect(redisInstance.incr).toHaveBeenCalled()
      expect(store.localInstance.get('key')?.value).toBe('1')
      expect(data).toBe(1)
    })
  })
})

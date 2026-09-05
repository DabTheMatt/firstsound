import { describe, expect, it, vi } from 'vitest'
import { reloadInstalledApp } from './reloadApp'

describe('reloadInstalledApp', () => {
  it('unregisters workers, clears caches, then reloads', async () => {
    const unregister = vi.fn(async () => true)
    const deleteCache = vi.fn(async () => true)
    const reload = vi.fn()
    await reloadInstalledApp({
      location: { reload },
      caches: {
        keys: async () => ['workbox-precache', 'runtime'],
        delete: deleteCache,
      },
      serviceWorker: {
        getRegistrations: async () => [{ unregister }],
      },
    })
    expect(unregister).toHaveBeenCalledOnce()
    expect(deleteCache).toHaveBeenCalledTimes(2)
    expect(reload).toHaveBeenCalledOnce()
  })

  it('still reloads when cache APIs throw', async () => {
    const reload = vi.fn()
    await reloadInstalledApp({
      location: { reload },
      caches: {
        keys: async () => {
          throw new Error('denied')
        },
        delete: async () => true,
      },
    })
    expect(reload).toHaveBeenCalledOnce()
  })
})

export type ServiceWorkerRegistrationLike = {
  unregister: () => Promise<boolean>
}

export type ReloadHost = {
  location: { reload: () => void }
  caches?: {
    keys: () => Promise<string[]>
    delete: (key: string) => Promise<boolean>
  }
  serviceWorker?: {
    getRegistrations: () => Promise<readonly ServiceWorkerRegistrationLike[]>
  }
}

/** Drop stale PWA caches, then reload so an installed app picks up a new Pages build. */
export async function reloadInstalledApp(host: ReloadHost): Promise<void> {
  try {
    const registrations = await host.serviceWorker?.getRegistrations()
    if (registrations?.length) {
      await Promise.all(registrations.map((registration) => registration.unregister()))
    }
  } catch {
    /* keep going — reload still helps */
  }
  try {
    const keys = await host.caches?.keys()
    if (keys?.length && host.caches) {
      await Promise.all(keys.map((key) => host.caches!.delete(key)))
    }
  } catch {
    /* keep going */
  }
  host.location.reload()
}

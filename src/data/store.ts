import { useSyncExternalStore } from 'react'
import { createLocalRepository } from './localRepository'
import type { Database } from './types'

// Ponto único de troca: quando o Supabase entrar, substitua
// createLocalRepository por createSupabaseRepository aqui.
let snapshot: Database
const listeners = new Set<() => void>()

export const repo = createLocalRepository((db) => {
  snapshot = db
  listeners.forEach((l) => l())
})


function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

const getSnapshot = () => snapshot

export function useDB(): Database {
  return useSyncExternalStore(subscribe, getSnapshot)
}

/** Carrega os dados antes do primeiro render. */
export async function initStore() {
  snapshot = await repo.load()
}

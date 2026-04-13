/**
 * Offline Score Queue — IndexedDB Utility
 * 
 * Stores scores locally when offline, syncs when connection returns.
 * Uses IndexedDB for persistence across page refreshes.
 */

const DB_NAME = 'eventrank_offline'
const DB_VERSION = 1
const SCORES_STORE = 'pending_scores'
const PENALTIES_STORE = 'pending_penalties'

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)

    request.onupgradeneeded = (event) => {
      const db = event.target.result

      if (!db.objectStoreNames.contains(SCORES_STORE)) {
        db.createObjectStore(SCORES_STORE, { keyPath: 'key' })
      }
      if (!db.objectStoreNames.contains(PENALTIES_STORE)) {
        db.createObjectStore(PENALTIES_STORE, { keyPath: 'key' })
      }
    }
  })
}

/**
 * Queue a score for later sync
 */
export async function queueScore({ participantId, criteriaId, judgeId, score }) {
  const db = await openDB()
  const key = `${participantId}_${criteriaId}_${judgeId}`

  return new Promise((resolve, reject) => {
    const tx = db.transaction(SCORES_STORE, 'readwrite')
    const store = tx.objectStore(SCORES_STORE)

    store.put({
      key,
      participantId,
      criteriaId,
      judgeId,
      score: Number(score),
      queuedAt: new Date().toISOString(),
    })

    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

/**
 * Queue a penalty for later sync
 */
export async function queuePenalty({ eventId, participantId, judgeId, penalty }) {
  const db = await openDB()
  const key = `${participantId}_${judgeId}`

  return new Promise((resolve, reject) => {
    const tx = db.transaction(PENALTIES_STORE, 'readwrite')
    const store = tx.objectStore(PENALTIES_STORE)

    store.put({
      key,
      eventId,
      participantId,
      judgeId,
      penalty: Number(penalty),
      queuedAt: new Date().toISOString(),
    })

    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

/**
 * Get all pending scores
 */
export async function getPendingScores() {
  const db = await openDB()

  return new Promise((resolve, reject) => {
    const tx = db.transaction(SCORES_STORE, 'readonly')
    const store = tx.objectStore(SCORES_STORE)
    const request = store.getAll()

    request.onsuccess = () => resolve(request.result || [])
    request.onerror = () => reject(request.error)
  })
}

/**
 * Get all pending penalties
 */
export async function getPendingPenalties() {
  const db = await openDB()

  return new Promise((resolve, reject) => {
    const tx = db.transaction(PENALTIES_STORE, 'readonly')
    const store = tx.objectStore(PENALTIES_STORE)
    const request = store.getAll()

    request.onsuccess = () => resolve(request.result || [])
    request.onerror = () => reject(request.error)
  })
}

/**
 * Clear all pending scores after successful sync
 */
export async function clearPendingScores() {
  const db = await openDB()

  return new Promise((resolve, reject) => {
    const tx = db.transaction(SCORES_STORE, 'readwrite')
    const store = tx.objectStore(SCORES_STORE)
    store.clear()

    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

/**
 * Clear all pending penalties after successful sync
 */
export async function clearPendingPenalties() {
  const db = await openDB()

  return new Promise((resolve, reject) => {
    const tx = db.transaction(PENALTIES_STORE, 'readwrite')
    const store = tx.objectStore(PENALTIES_STORE)
    store.clear()

    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error)
  })
}

/**
 * Get the total count of all pending items
 */
export async function getPendingCount() {
  const [scores, penalties] = await Promise.all([
    getPendingScores(),
    getPendingPenalties(),
  ])
  return scores.length + penalties.length
}

'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  queueScore,
  queuePenalty,
  getPendingScores,
  getPendingPenalties,
  clearPendingScores,
  clearPendingPenalties,
  getPendingCount,
} from '@/lib/offlineQueue'
import { upsertScoresBatch, upsertPenalty } from '@/lib/actions/scores'

/**
 * Sync status states:
 * - 'online'   → 🟢 All scores synced
 * - 'syncing'  → 🟡 Syncing...
 * - 'offline'  → 🔴 Offline — N scores pending
 */
export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(true)
  const [syncStatus, setSyncStatus] = useState('online') // 'online' | 'syncing' | 'offline'
  const [pendingCount, setPendingCount] = useState(0)
  const syncingRef = useRef(false)

  // Track browser online/offline events
  useEffect(() => {
    // Set initial state
    setIsOnline(navigator.onLine)
    if (!navigator.onLine) setSyncStatus('offline')

    function handleOnline() {
      setIsOnline(true)
      // Auto-sync when back online
      syncPending()
    }

    function handleOffline() {
      setIsOnline(false)
      setSyncStatus('offline')
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Initial pending count
    refreshPendingCount()

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  async function refreshPendingCount() {
    try {
      const count = await getPendingCount()
      setPendingCount(count)
      return count
    } catch {
      return 0
    }
  }

  // Sync all pending scores and penalties to the server
  const syncPending = useCallback(async () => {
    if (syncingRef.current) return
    syncingRef.current = true

    try {
      const currentCount = await refreshPendingCount()
      if (currentCount === 0) {
        setSyncStatus('online')
        syncingRef.current = false
        return
      }

      setSyncStatus('syncing')

      // Sync scores
      const pendingScores = await getPendingScores()
      if (pendingScores.length > 0) {
        const batch = pendingScores.map(s => ({
          participantId: s.participantId,
          criteriaId: s.criteriaId,
          judgeId: s.judgeId,
          score: s.score,
        }))

        const { error } = await upsertScoresBatch(batch)
        if (!error) {
          await clearPendingScores()
        } else {
          // Stay in offline mode if sync fails
          setSyncStatus('offline')
          syncingRef.current = false
          return
        }
      }

      // Sync penalties
      const pendingPenaltiesData = await getPendingPenalties()
      if (pendingPenaltiesData.length > 0) {
        let allPenaltiesOk = true
        for (const p of pendingPenaltiesData) {
          const { error } = await upsertPenalty(p.eventId, p.participantId, p.judgeId, p.penalty)
          if (error) {
            allPenaltiesOk = false
            break
          }
        }
        if (allPenaltiesOk) {
          await clearPendingPenalties()
        } else {
          setSyncStatus('offline')
          syncingRef.current = false
          return
        }
      }

      // All synced!
      await refreshPendingCount()
      setSyncStatus('online')
    } catch {
      setSyncStatus('offline')
    } finally {
      syncingRef.current = false
    }
  }, [])

  // Queue a score (stores locally if offline, or just locally always and sync later)
  const saveScoreOffline = useCallback(async (scoreData) => {
    await queueScore(scoreData)
    const count = await refreshPendingCount()
    if (!navigator.onLine) {
      setSyncStatus('offline')
    }
    return count
  }, [])

  // Queue a penalty
  const savePenaltyOffline = useCallback(async (penaltyData) => {
    await queuePenalty(penaltyData)
    const count = await refreshPendingCount()
    if (!navigator.onLine) {
      setSyncStatus('offline')
    }
    return count
  }, [])

  return {
    isOnline,
    syncStatus,
    pendingCount,
    syncPending,
    saveScoreOffline,
    savePenaltyOffline,
    refreshPendingCount,
  }
}

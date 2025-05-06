import { atom } from 'jotai'
import { type Schedule } from '@/types'
import { getCurrentTime, scheduleEnd } from '@/utils'
import { SCHEDULE_URL } from '@/constants'

const scheduleDataAtom = atom<Schedule | null>(null)
export const scheduleAtom = atom(
  async (get) => {
    const prev = get(scheduleDataAtom)
    if (prev !== null) {
      const now = getCurrentTime()
      if (now < scheduleEnd(prev)) {
        return Promise.resolve(prev)
      }
    }
    const response = await fetch(SCHEDULE_URL)
    if (!response.ok) {
      throw new Error('Failed to fetch schedule')
    }
    return await response.json() as Schedule
  },
  async (get, set) => {
    const prev = get(scheduleDataAtom)
    if (prev !== null) {
      const now = getCurrentTime()
      if (now < scheduleEnd(prev)) {
        return
      }
    }
    const response = await fetch(SCHEDULE_URL)
    if (!response.ok) {
      throw new Error('Failed to fetch schedule')
    }
    const newSchedule = await response.json() as Schedule
    set(scheduleDataAtom, newSchedule)
  }
)



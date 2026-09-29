import { useCallback } from 'react'

/** Returns a pointermove handler that writes the cursor position into --mx / --my. */
export function usePointerGlow() {
  return useCallback((event) => {
    const el = event.currentTarget
    const rect = el.getBoundingClientRect()
    el.style.setProperty('--mx', `${event.clientX - rect.left}px`)
    el.style.setProperty('--my', `${event.clientY - rect.top}px`)
  }, [])
}

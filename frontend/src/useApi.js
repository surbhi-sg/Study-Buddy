import { useCallback, useEffect, useState } from 'react'

// Runs an api.js call for a page and tracks loading / error / data.
// reload() runs it again (e.g. after joining a group).
export default function useApi(fn, deps = []) {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)
  const [tick, setTick] = useState(0)
  const reload = useCallback(() => setTick((t) => t + 1), [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    fn()
      .then((d) => { if (!cancelled) setData(d) })
      .catch((e) => { if (!cancelled) setError(e.message) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [...deps, tick]) // eslint-disable-line react-hooks/exhaustive-deps

  return { data, error, loading, reload, setData }
}

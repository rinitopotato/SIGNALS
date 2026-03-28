/**
 * Shared fetch utilities — timeout wrapper + GraphQL helper
 */

export async function fetchWithTimeout(url, options = {}, timeoutMs = 12000) {
  const controller = new AbortController()
  const id = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, { ...options, signal: controller.signal })
    clearTimeout(id)
    if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText} — ${url}`)
    return res
  } catch (err) {
    clearTimeout(id)
    throw err
  }
}

export async function fetchJSON(url, options = {}) {
  const res = await fetchWithTimeout(url, options)
  return res.json()
}

export async function postGraphQL(url, query, variables = {}) {
  const res = await fetchWithTimeout(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  })
  const json = await res.json()
  if (json.errors) {
    console.warn('GraphQL errors:', json.errors)
  }
  return json.data ?? {}
}

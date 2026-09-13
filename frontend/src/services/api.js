async function request(path, options = {}) {
  const response = await fetch(path, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  })

  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    throw new Error(body.error || `Zahtev nije uspeo (${response.status})`)
  }

  if (response.status === 204) return null
  return response.json()
}

export const locationsApi = {
  list: () => request('/api/locations'),
  create: (location) => request('/api/locations', {
    method: 'POST',
    body: JSON.stringify(location),
  }),
  remove: (locationId) => request(`/api/locations/${locationId}`, { method: 'DELETE' }),
}

export const analysesApi = {
  list: () => request('/api/analyses'),
  create: (analysis) => request('/api/analyses', {
    method: 'POST',
    body: JSON.stringify(analysis),
  }),
  result: (analysisId) => request(`/api/analyses/${analysisId}/result`),
  remove: (analysisId) => request(`/api/analyses/${analysisId}`, { method: 'DELETE' }),
}

export const healthApi = {
  status: () => request('/health'),
}

import { useEffect, useState } from 'react'
import MapSelector from './components/MapSelector'
import { analysesApi, healthApi, locationsApi } from './services/api'
import './App.css'

const initialBounds = {
  min_lat: 44.45,
  min_lon: 20.55,
  max_lat: 44.46,
  max_lon: 20.56,
}

function roundCoordinate(value) {
  return Number(Number(value).toFixed(6))
}

function toInputDate(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function daysAgo(numberOfDays) {
  const date = new Date()
  date.setDate(date.getDate() - numberOfDays)
  return toInputDate(date)
}

function initialForm() {
  return {
    name: 'Nova oblast',
    date_from: daysAgo(37),
    date_to: daysAgo(7),
    max_cloud_percentage: 20,
  }
}

function formatIndex(value) {
  return value == null ? '--' : Number(value).toFixed(3)
}

function indexLabel(ndvi) {
  if (ndvi == null) return 'Nema rezultata'
  if (ndvi >= 0.5) return 'Zdrava vegetacija'
  if (ndvi >= 0.2) return 'Slaba ili suva vegetacija'
  return 'Degradirana povrsina'
}

function App() {
  const [locations, setLocations] = useState([])
  const [analyses, setAnalyses] = useState([])
  const [bounds, setBounds] = useState(initialBounds)
  const [selectedLocationId, setSelectedLocationId] = useState(null)
  const [form, setForm] = useState(initialForm)
  const [latestResult, setLatestResult] = useState(null)
  const [filters, setFilters] = useState({ locationId: 'ALL', status: 'ALL' })
  const [serviceStatus, setServiceStatus] = useState('checking')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function loadData() {
    try {
      setError('')
      const [locationData, analysisData] = await Promise.all([
        locationsApi.list(),
        analysesApi.list(),
      ])
      setLocations(locationData.items)
      setAnalyses(analysisData.items)
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let cancelled = false

    Promise.all([locationsApi.list(), analysesApi.list()])
      .then(([locationData, analysisData]) => {
        if (cancelled) return
        setLocations(locationData.items)
        setAnalyses(analysisData.items)
      })
      .catch((requestError) => {
        if (!cancelled) setError(requestError.message)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    function checkService() {
      healthApi.status()
        .then(() => {
          if (!cancelled) setServiceStatus('online')
        })
        .catch(() => {
          if (!cancelled) setServiceStatus('offline')
        })
    }

    checkService()
    const intervalId = window.setInterval(checkService, 30000)
    return () => {
      cancelled = true
      window.clearInterval(intervalId)
    }
  }, [])

  function updateForm(event) {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  function updateCoordinate(event) {
    const { name, value } = event.target
    setSelectedLocationId(null)
    setLatestResult(null)
    setBounds((current) => ({ ...current, [name]: Number(value) }))
  }

  function handleBoundsChange(nextBounds) {
    setSelectedLocationId(null)
    setLatestResult(null)
    setBounds(nextBounds)
  }

  function resetArea() {
    setBounds(initialBounds)
    setSelectedLocationId(null)
    setLatestResult(null)
    setForm((current) => ({ ...current, name: 'Nova oblast' }))
  }

  function selectLocation(location, keepResult = false) {
    setSelectedLocationId(location.id)
    if (!keepResult) setLatestResult(null)
    setForm((current) => ({ ...current, name: location.name }))
    setBounds({
      min_lat: roundCoordinate(location.min_lat),
      min_lon: roundCoordinate(location.min_lon),
      max_lat: roundCoordinate(location.max_lat),
      max_lon: roundCoordinate(location.max_lon),
    })
  }

  async function showAnalysis(analysis) {
    try {
      setError('')
      const result = await analysesApi.result(analysis.id)
      const location = locations.find((item) => item.id === result.location_id)
      setLatestResult(result)
      if (location) selectLocation(location, true)
      document.querySelector('.workspace')?.scrollIntoView({ behavior: 'smooth' })
    } catch (requestError) {
      setError(requestError.message)
    }
  }

  async function deleteAnalysis(analysis) {
    if (!window.confirm(`Obrisati analizu #${analysis.id}?`)) return

    try {
      setError('')
      await analysesApi.remove(analysis.id)
      if (latestResult?.id === analysis.id) setLatestResult(null)
      await loadData()
    } catch (requestError) {
      setError(requestError.message)
    }
  }

  async function deleteLocation(location) {
    if (!window.confirm(`Obrisati lokaciju "${location.name}" i sve njene analize?`)) return

    try {
      setError('')
      await locationsApi.remove(location.id)
      if (selectedLocationId === location.id) resetArea()
      if (latestResult?.location_id === location.id) setLatestResult(null)
      await loadData()
    } catch (requestError) {
      setError(requestError.message)
    }
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setSubmitting(true)
    setError('')

    try {
      let locationId = selectedLocationId

      if (!locationId) {
        const location = await locationsApi.create({ ...bounds, name: form.name })
        locationId = location.id
        setSelectedLocationId(location.id)
      }

      const analysis = await analysesApi.create({
        location_id: locationId,
        date_from: form.date_from,
        date_to: form.date_to,
        max_cloud_percentage: Number(form.max_cloud_percentage),
      })

      setLatestResult(analysis)
      if (analysis.status === 'FAILED') {
        setError(analysis.failure_reason || 'Copernicus analiza nije uspela.')
      }
      await loadData()
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setSubmitting(false)
    }
  }

  const filteredAnalyses = analyses.filter((analysis) => {
    const locationMatches = filters.locationId === 'ALL'
      || analysis.location_id === Number(filters.locationId)
    const statusMatches = filters.status === 'ALL' || analysis.status === filters.status
    return locationMatches && statusMatches
  })

  const selectedResultLocation = latestResult
    ? locations.find((location) => location.id === latestResult.location_id)
    : null

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="Vegetation Monitor pocetna">
          <span>Monitor stanja vegetacije i zemljišta</span>
        </a>
        <div className={`service-state ${serviceStatus}`} title="Status Flask backend servera">
          <span className="status-dot" />
          {serviceStatus === 'online' && 'Backend radi'}
          {serviceStatus === 'offline' && 'Backend nije dostupan'}
          {serviceStatus === 'checking' && 'Provera servera'}
        </div>
      </header>

      <main id="top">
        <section className="intro">
          <div>
            <h1>Stanje vegetacije,<br />vidljivo na mapi.</h1>
          </div>
          <p className="intro-copy">
            Nacrtajte oblast na mapi, izaberite period i pokrenite NDVI i NDWI analizu na osnovu Sentinel-2 satelitskih snimaka.
          </p>
        </section>

        {error && <div className="alert" role="alert">{error}</div>}

        <section className="workspace">
          <div className="map-panel">
            <div className="panel-heading map-heading">
              <div>
                <span className="step">01</span>
                <h2>Izaberite oblast</h2>
              </div>
              <p>Ukljucite crtanje i prevucite misem preko oblasti.</p>
            </div>
            <MapSelector
              bounds={bounds}
              locations={locations}
              selectedLocationId={selectedLocationId}
              overlayUrl={latestResult?.classification_image_url
                ? `${latestResult.classification_image_url}?analysis=${latestResult.id}`
                : null}
              onBoundsChange={handleBoundsChange}
              onLocationSelect={selectLocation}
            />
            <div className="map-legend">
              <span><i className="legend-box selected" /> Aktivna oblast</span>
              <span><i className="legend-box saved" /> Sacuvane oblasti</span>
              <span className="map-attribution">OpenStreetMap / Leaflet</span>
            </div>
          </div>

          <aside className="control-panel">
            <div className="panel-heading parameters-heading">
              <div>
                <span className="step">02</span>
                <h2>Parametri analize</h2>
              </div>
              <button className="text-button" type="button" onClick={resetArea}>Resetuj oblast</button>
            </div>

            <form onSubmit={handleSubmit}>
              <label>
                Naziv oblasti
                <input name="name" value={form.name} onChange={updateForm} disabled={Boolean(selectedLocationId)} required />
              </label>

              <div className="coordinate-grid">
                {Object.entries(bounds).map(([name, value]) => (
                  <label key={name}>
                    {name.replace('_', ' ')}
                    <input name={name} type="number" step="any" value={value} onChange={updateCoordinate} required />
                  </label>
                ))}
              </div>

              <div className="date-grid">
                <label>
                  Datum od
                  <input name="date_from" type="date" max={form.date_to} value={form.date_from} onChange={updateForm} required />
                </label>
                <label>
                  Datum do
                  <input name="date_to" type="date" min={form.date_from} max={toInputDate(new Date())} value={form.date_to} onChange={updateForm} required />
                </label>
              </div>
              <p className="field-hint">
                Preporuka: izaberite najmanje 15 dana, jer Sentinel-2 nema snimak za svaki dan.
              </p>

              <label>
                Maksimalna oblacnost: <strong>{form.max_cloud_percentage}%</strong>
                <input
                  className="range"
                  name="max_cloud_percentage"
                  type="range"
                  min="0"
                  max="100"
                  value={form.max_cloud_percentage}
                  onChange={updateForm}
                />
              </label>

              <button className="primary-button" type="submit" disabled={submitting}>
                {submitting ? 'Analiza je u toku...' : 'Pokreni analizu'}
                <span aria-hidden="true">-&gt;</span>
              </button>
            </form>

            <div className="saved-locations">
              <p className="list-label">Sacuvane lokacije</p>
              {loading && <p className="muted">Ucitavanje...</p>}
              {!loading && locations.length === 0 && <p className="muted">Jos nema sacuvanih lokacija.</p>}
              {locations.slice(0, 6).map((location) => (
                <div className="location-row" key={location.id}>
                  <button
                    className={location.id === selectedLocationId ? 'location-chip active' : 'location-chip'}
                    type="button"
                    onClick={() => selectLocation(location)}
                  >
                    <span>{location.name}</span>
                    <small>#{location.id}</small>
                  </button>
                  <button
                    className="delete-button"
                    type="button"
                    aria-label={`Obrisi lokaciju ${location.name}`}
                    title="Obrisi lokaciju"
                    onClick={() => deleteLocation(location)}
                  >
                    Obrisi
                  </button>
                </div>
              ))}
            </div>
          </aside>
        </section>

        {latestResult && (
          <section className="latest-result">
            <div>
              <p className="eyebrow">Detalji izabrane analize</p>
              <h2>{indexLabel(latestResult.mean_ndvi)}</h2>
              <p>Status: <strong>{latestResult.status}</strong></p>
              {latestResult.failure_reason && (
                <p className="failure-reason">Razlog: {latestResult.failure_reason}</p>
              )}
              <dl className="result-details">
                <div><dt>Analiza</dt><dd>#{latestResult.id}</dd></div>
                <div><dt>Lokacija</dt><dd>{selectedResultLocation?.name ?? `#${latestResult.location_id}`}</dd></div>
                <div><dt>Period</dt><dd>{latestResult.date_from} / {latestResult.date_to}</dd></div>
                <div><dt>Oblacnost</dt><dd>do {latestResult.max_cloud_percentage}%</dd></div>
              </dl>
            </div>
            <div className="metric ndvi">
              <span>NDVI</span>
              <strong>{formatIndex(latestResult.mean_ndvi)}</strong>
              <small>indeks vegetacije</small>
            </div>
            <div className="metric ndwi">
              <span>NDWI</span>
              <strong>{formatIndex(latestResult.mean_ndwi)}</strong>
              <small>indeks vlaznosti</small>
            </div>
            {latestResult.classification_image_url && (
              <div className="classification-breakdown">
                <p className="list-label">Struktura analizirane povrsine</p>
                <div className="class-grid">
                  <div><i className="class-color healthy" /><span>Zdrava</span><strong>{latestResult.healthy_percentage}%</strong></div>
                  <div><i className="class-color dry" /><span>Suva</span><strong>{latestResult.dry_percentage}%</strong></div>
                  <div><i className="class-color degraded" /><span>Degradirana</span><strong>{latestResult.degraded_percentage}%</strong></div>
                  <div><i className="class-color water" /><span>Voda</span><strong>{latestResult.water_percentage}%</strong></div>
                </div>
              </div>
            )}
          </section>
        )}

        <section className="history-section">
          <div className="section-title">
            <div>
              <span className="step">03</span>
              <h2>Istorija analiza</h2>
            </div>
            <span>{filteredAnalyses.length} od {analyses.length} zapisa</span>
          </div>

          <div className="history-filters">
            <label>
              Lokacija
              <select
                value={filters.locationId}
                onChange={(event) => setFilters((current) => ({ ...current, locationId: event.target.value }))}
              >
                <option value="ALL">Sve lokacije</option>
                {locations.map((location) => <option key={location.id} value={location.id}>{location.name}</option>)}
              </select>
            </label>
            <label>
              Status
              <select
                value={filters.status}
                onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}
              >
                <option value="ALL">Svi statusi</option>
                <option value="COMPLETED">COMPLETED</option>
                <option value="FAILED">FAILED</option>
                <option value="PROCESSING">PROCESSING</option>
                <option value="PENDING">PENDING</option>
              </select>
            </label>
            <button type="button" className="text-button" onClick={() => setFilters({ locationId: 'ALL', status: 'ALL' })}>
              Ponisti filtere
            </button>
          </div>

          <div className="history-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Lokacija</th>
                  <th>Period</th>
                  <th>Status</th>
                  <th>NDVI</th>
                  <th>NDWI</th>
                  <th>Akcije</th>
                </tr>
              </thead>
              <tbody>
                {filteredAnalyses.map((analysis) => {
                  const location = locations.find((item) => item.id === analysis.location_id)
                  return (
                    <tr key={analysis.id}>
                      <td>#{analysis.id}</td>
                      <td>{location?.name ?? `Lokacija #${analysis.location_id}`}</td>
                      <td>{analysis.date_from} / {analysis.date_to}</td>
                      <td><span className={`status ${analysis.status.toLowerCase()}`}>{analysis.status}</span></td>
                      <td>{formatIndex(analysis.mean_ndvi)}</td>
                      <td>{formatIndex(analysis.mean_ndwi)}</td>
                      <td>
                        <div className="table-actions">
                          <button className="result-button" type="button" onClick={() => showAnalysis(analysis)}>
                            Detalji
                          </button>
                          <button className="delete-button" type="button" onClick={() => deleteAnalysis(analysis)}>
                            Obrisi
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
                {!loading && filteredAnalyses.length === 0 && (
                  <tr><td colSpan="7" className="empty-row">Nema analiza koje odgovaraju izabranim filterima.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  )
}

export default App

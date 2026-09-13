import { useEffect, useState } from 'react'
import MapSelector from './components/MapSelector'
import { analysesApi, locationsApi } from './services/api'
import './App.css'

const initialBounds = {
  min_lat: 44.45,
  min_lon: 20.55,
  max_lat: 44.46,
  max_lon: 20.56,
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
  const [form, setForm] = useState({
    name: 'Nova oblast',
    date_from: '2026-08-01',
    date_to: '2026-08-15',
    max_cloud_percentage: 20,
  })
  const [latestResult, setLatestResult] = useState(null)
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

  function selectLocation(location, keepResult = false) {
    setSelectedLocationId(location.id)
    if (!keepResult) setLatestResult(null)
    setForm((current) => ({ ...current, name: location.name }))
    setBounds({
      min_lat: location.min_lat,
      min_lon: location.min_lon,
      max_lat: location.max_lat,
      max_lon: location.max_lon,
    })
  }

  function showAnalysis(analysis) {
    const location = locations.find((item) => item.id === analysis.location_id)
    setLatestResult(analysis)
    if (location) selectLocation(location, true)
    document.querySelector('.workspace')?.scrollIntoView({ behavior: 'smooth' })
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
      await loadData()
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#top" aria-label="Vegetation Monitor pocetna">
          <span className="brand-mark">VM</span>
          <span>Vegetation Monitor</span>
        </a>
        <div className="service-state">
          <span className="status-dot" />
          Sentinel-2 analiza
        </div>
      </header>

      <main id="top">
        <section className="intro">
          <div>
            <p className="eyebrow">Copernicus Data Space Ecosystem</p>
            <h1>Stanje vegetacije,<br />vidljivo na mapi.</h1>
          </div>
          <p className="intro-copy">
            Oznacite oblast sa dva klika, izaberite period i pokrenite NDVI i NDWI analizu Sentinel-2 snimaka.
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
              <p>Dva klika na mapi odredjuju uglove oblasti.</p>
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
            <div className="panel-heading">
              <span className="step">02</span>
              <h2>Parametri analize</h2>
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
                    <input name={name} type="number" step="0.000001" value={value} onChange={updateCoordinate} required />
                  </label>
                ))}
              </div>

              <div className="date-grid">
                <label>
                  Datum od
                  <input name="date_from" type="date" value={form.date_from} onChange={updateForm} required />
                </label>
                <label>
                  Datum do
                  <input name="date_to" type="date" value={form.date_to} onChange={updateForm} required />
                </label>
              </div>

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
              {locations.slice(0, 4).map((location) => (
                <button
                  className={location.id === selectedLocationId ? 'location-chip active' : 'location-chip'}
                  type="button"
                  key={location.id}
                  onClick={() => selectLocation(location)}
                >
                  <span>{location.name}</span>
                  <small>#{location.id}</small>
                </button>
              ))}
            </div>
          </aside>
        </section>

        {latestResult && (
          <section className="latest-result">
            <div>
              <p className="eyebrow">Poslednja zavrsena analiza</p>
              <h2>{indexLabel(latestResult.mean_ndvi)}</h2>
              <p>Status: <strong>{latestResult.status}</strong></p>
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
            <span>{analyses.length} zapisa</span>
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
                  <th>Mapa</th>
                </tr>
              </thead>
              <tbody>
                {analyses.map((analysis) => {
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
                        <button
                          className="result-button"
                          type="button"
                          disabled={!analysis.classification_image_url}
                          onClick={() => showAnalysis(analysis)}
                        >
                          Prikazi
                        </button>
                      </td>
                    </tr>
                  )
                })}
                {!loading && analyses.length === 0 && (
                  <tr><td colSpan="7" className="empty-row">Pokrenite prvu analizu da bi se rezultat pojavio ovde.</td></tr>
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

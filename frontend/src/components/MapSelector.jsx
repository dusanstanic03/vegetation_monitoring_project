import { useEffect, useRef, useState } from 'react'
import { ImageOverlay, MapContainer, Rectangle, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'

function roundCoordinate(value) {
  return Number(value.toFixed(6))
}

function createBounds(firstPoint, secondPoint) {
  return {
    min_lat: roundCoordinate(Math.min(firstPoint.lat, secondPoint.lat)),
    min_lon: roundCoordinate(Math.min(firstPoint.lng, secondPoint.lng)),
    max_lat: roundCoordinate(Math.max(firstPoint.lat, secondPoint.lat)),
    max_lon: roundCoordinate(Math.max(firstPoint.lng, secondPoint.lng)),
  }
}

function RectangleDrawHandler({ enabled, onPreviewChange, onBoundsChange, onFinish }) {
  const map = useMap()
  const startPoint = useRef(null)

  useEffect(() => {
    const container = map.getContainer()

    if (enabled) {
      map.dragging.disable()
      container.classList.add('drawing-enabled')
    } else {
      map.dragging.enable()
      container.classList.remove('drawing-enabled')
      startPoint.current = null
      onPreviewChange(null)
    }

    return () => {
      map.dragging.enable()
      container.classList.remove('drawing-enabled')
    }
  }, [enabled, map, onPreviewChange])

  useMapEvents({
    mousedown(event) {
      if (!enabled) return
      startPoint.current = event.latlng
      onPreviewChange(createBounds(event.latlng, event.latlng))
    },
    mousemove(event) {
      if (!enabled || !startPoint.current) return
      onPreviewChange(createBounds(startPoint.current, event.latlng))
    },
    mouseup(event) {
      if (!enabled || !startPoint.current) return

      const nextBounds = createBounds(startPoint.current, event.latlng)
      startPoint.current = null

      if (nextBounds.min_lat !== nextBounds.max_lat && nextBounds.min_lon !== nextBounds.max_lon) {
        onBoundsChange(nextBounds)
      }
      onPreviewChange(null)
      onFinish()
    },
  })

  return null
}

function toLeafletBounds(bounds) {
  return [
    [bounds.min_lat, bounds.min_lon],
    [bounds.max_lat, bounds.max_lon],
  ]
}

function MapSelector({ bounds, locations, selectedLocationId, overlayUrl, onBoundsChange, onLocationSelect }) {
  const [drawingEnabled, setDrawingEnabled] = useState(false)
  const [previewBounds, setPreviewBounds] = useState(null)
  const activeBounds = toLeafletBounds(bounds)

  return (
    <div className="map-wrap">
      <MapContainer center={[44.79, 20.46]} zoom={9} scrollWheelZoom className="map">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <RectangleDrawHandler
          enabled={drawingEnabled}
          onPreviewChange={setPreviewBounds}
          onBoundsChange={onBoundsChange}
          onFinish={() => setDrawingEnabled(false)}
        />
        {overlayUrl && (
          <ImageOverlay
            url={overlayUrl}
            bounds={activeBounds}
            opacity={0.78}
            zIndex={350}
          />
        )}
        {locations.map((location) => (
          <Rectangle
            key={location.id}
            bounds={[[location.min_lat, location.min_lon], [location.max_lat, location.max_lon]]}
            pathOptions={{
              color: location.id === selectedLocationId ? '#b9ef6b' : '#65856f',
              fillColor: location.id === selectedLocationId ? '#b9ef6b' : '#9bb4a3',
              fillOpacity: location.id === selectedLocationId ? 0.24 : 0.08,
              weight: location.id === selectedLocationId ? 3 : 1,
            }}
            eventHandlers={{ click: () => !drawingEnabled && onLocationSelect(location) }}
          />
        ))}
        {!selectedLocationId && (
          <Rectangle
            bounds={activeBounds}
            pathOptions={{ color: '#d9ff8a', fillColor: '#b9ef6b', fillOpacity: 0.22, weight: 3 }}
          />
        )}
        {previewBounds && (
          <Rectangle
            bounds={toLeafletBounds(previewBounds)}
            pathOptions={{ color: '#ffffff', fillColor: '#b9ef6b', fillOpacity: 0.3, weight: 2, dashArray: '6 5' }}
          />
        )}
      </MapContainer>

      <div className={drawingEnabled ? 'draw-toolbar active' : 'draw-toolbar'}>
        <button type="button" onClick={() => setDrawingEnabled((current) => !current)}>
          {drawingEnabled ? 'Otkazi crtanje' : 'Nacrtaj novu oblast'}
        </button>
        <span>
          {drawingEnabled
            ? 'Pritisnite i prevucite misem preko zeljene oblasti'
            : 'Mapu mozete pomerati i uvecavati'}
        </span>
      </div>
    </div>
  )
}

export default MapSelector

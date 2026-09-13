import { useState } from 'react'
import { CircleMarker, ImageOverlay, MapContainer, Rectangle, TileLayer, useMapEvents } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'

function MapClickHandler({ onBoundsChange, onPointsChange }) {
  const [points, setPoints] = useState([])

  useMapEvents({
    click(event) {
      if (points.length !== 1) {
        const firstPoint = [event.latlng.lat, event.latlng.lng]
        setPoints([firstPoint])
        onPointsChange([firstPoint])
        return
      }

      const secondPoint = [event.latlng.lat, event.latlng.lng]
      const nextPoints = [points[0], secondPoint]
      setPoints([])
      onPointsChange(nextPoints)
      onBoundsChange({
        min_lat: Math.min(nextPoints[0][0], nextPoints[1][0]),
        min_lon: Math.min(nextPoints[0][1], nextPoints[1][1]),
        max_lat: Math.max(nextPoints[0][0], nextPoints[1][0]),
        max_lon: Math.max(nextPoints[0][1], nextPoints[1][1]),
      })
    },
  })

  return null
}

function MapSelector({ bounds, locations, selectedLocationId, overlayUrl, onBoundsChange, onLocationSelect }) {
  const [points, setPoints] = useState([])
  const activeBounds = [
    [bounds.min_lat, bounds.min_lon],
    [bounds.max_lat, bounds.max_lon],
  ]

  return (
    <div className="map-wrap">
      <MapContainer center={[44.79, 20.46]} zoom={9} scrollWheelZoom className="map">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapClickHandler onBoundsChange={onBoundsChange} onPointsChange={setPoints} />
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
            eventHandlers={{ click: () => onLocationSelect(location) }}
          />
        ))}
        {!selectedLocationId && (
          <Rectangle
            bounds={activeBounds}
            pathOptions={{ color: '#d9ff8a', fillColor: '#b9ef6b', fillOpacity: 0.22, weight: 3 }}
          />
        )}
        {points.map((point) => (
          <CircleMarker key={point.join('-')} center={point} radius={6} pathOptions={{ color: '#f7ffdf', fillColor: '#b9ef6b', fillOpacity: 1 }} />
        ))}
      </MapContainer>
      <div className="map-instruction">Klik 1: prvi ugao &nbsp; / &nbsp; Klik 2: suprotni ugao</div>
    </div>
  )
}

export default MapSelector

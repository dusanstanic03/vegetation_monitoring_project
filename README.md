# Vegetation Monitoring API

Flask projekat za analizu stanja vegetacije pomocu podataka sa
Sentinel-2 satelita Copernicus programa.

## Pokretanje

1. Otvori folder projekta u terminalu

2. Kreirati venv i aktivirati ga:
```bash
python -m venv ./.venv
./.venv/Scripts/activate
```
(Windwos)

3. Instalirati pakete:
```bash
pip install -r backend/requirements.txt
```

4. Kopirati `backend/.env.example` u `backend/.env` i upisati Copernicus kredencijale

5. Napraviti tabele u SQLite bazi:
```bash
cd backend
flask --app run.py init-db
```

SQLite baza će biti u fajlu `backend/vegetation.db`.

6. Pokrenuti Flask aplikaciju:
```bash
cd backend
python run.py
```

7. Proveri health endpoint:
```text
GET http://127.0.0.1:5000/health
```
Očekivani odgovor:

```json
{
  "status": "UP"
}
```

## REST API

### Locations

- `POST /api/locations` kreira lokaciju
- `GET /api/locations` vraća sve lokacije
- `GET /api/locations/{id}` vraća jednu lokaciju
- `PUT /api/locations/{id}` menja lokaciju
- `DELETE /api/locations/{id}` briše lokaciju ako nema analiza

### Analyses

- `POST /api/analyses` kreira analizu i pokušava da povuče Sentinel-2 podatke
- `GET /api/analyses` vraća sve analize
- `GET /api/analyses?location_id=1&status=COMPLETED` filtrira analize
- `GET /api/analyses/{id}` vraća jednu analizu
- `DELETE /api/analyses/{id}` briše analizu

Ako Copernicus kredencijali nisu podeseni ili nema podataka, analiza dobija status `FAILED`.

### Swagger docs

Nakon pokretanja, dostupni na `http://127.0.0.1:5000/apidocs/`

## React frontend

Frontend koristi React, Vite, React Leaflet i OpenStreetMap. Omogucava izbor oblasti sa dva klika na mapi, kreiranje lokacije, pokretanje analize i pregled istorije rezultata.

Pokrenuti backend na portu `5000`, a zatim u drugom terminalu:

```bash
cd frontend
npm install
npm run dev
```

Frontend je dostupan na `http://127.0.0.1:5173`. Vite development server prosledjuje `/api` zahteve Flask backend-u.

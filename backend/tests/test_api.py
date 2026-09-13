import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import numpy as np

from app import create_app, db


class ApiTest(unittest.TestCase):
    def setUp(self):
        self.temporary_directory = tempfile.TemporaryDirectory()
        self.results_directory = Path(self.temporary_directory.name) / "analysis_results"
        self.app = create_app(
            {
                "TESTING": True,
                "SQLALCHEMY_DATABASE_URI": "sqlite:///:memory:",
                "ANALYSIS_RESULTS_DIRECTORY": str(self.results_directory),
                "COPERNICUS_CLIENT_ID": "test-client",
                "COPERNICUS_CLIENT_SECRET": "test-secret",
            }
        )
        self.client = self.app.test_client()

        with self.app.app_context():
            db.create_all()

    def tearDown(self):
        with self.app.app_context():
            db.session.remove()
            db.drop_all()
        self.temporary_directory.cleanup()

    def create_location(self, name="Kosmaj test area"):
        response = self.client.post(
            "/api/locations",
            json={
                "name": name,
                "min_lat": 44.45,
                "min_lon": 20.55,
                "max_lat": 44.46,
                "max_lon": 20.56,
            },
        )
        self.assertEqual(response.status_code, 201)
        return response.get_json()

    @staticmethod
    def sentinel_bands():
        return {
            "B03": np.array([[0.43, 0.54], [0.82, 3.0]]),
            "B04": np.array([[0.18, 0.48], [0.82, 1.5]]),
            "B08": np.ones((2, 2)),
            "satellite_date": None,
        }

    def create_analysis(self, location_id):
        with patch(
            "app.services.analysis_service.CopernicusService.get_sentinel2_bands",
            return_value=self.sentinel_bands(),
        ):
            return self.client.post(
                "/api/analyses",
                json={
                    "location_id": location_id,
                    "date_from": "2026-08-01",
                    "date_to": "2026-08-15",
                    "max_cloud_percentage": 20,
                },
            )

    def test_health_endpoint(self):
        response = self.client.get("/health")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json(), {"status": "UP"})

    def test_location_crud_and_validation(self):
        location = self.create_location()

        self.assertEqual(len(self.client.get("/api/locations").get_json()["items"]), 1)
        self.assertEqual(self.client.get(f"/api/locations/{location['id']}").status_code, 200)

        update_response = self.client.put(
            f"/api/locations/{location['id']}",
            json={
                "name": "Kosmaj updated",
                "min_lat": 44.44,
                "min_lon": 20.54,
                "max_lat": 44.47,
                "max_lon": 20.57,
            },
        )
        self.assertEqual(update_response.status_code, 200)
        self.assertEqual(update_response.get_json()["name"], "Kosmaj updated")

        invalid_response = self.client.post(
            "/api/locations",
            json={"name": "Invalid", "min_lat": 50, "min_lon": 20, "max_lat": 40, "max_lon": 21},
        )
        self.assertEqual(invalid_response.status_code, 400)

        self.assertEqual(self.client.delete(f"/api/locations/{location['id']}").status_code, 204)
        self.assertEqual(self.client.get(f"/api/locations/{location['id']}").status_code, 404)

    def test_analysis_flow_filters_result_and_deletion(self):
        location = self.create_location()
        response = self.create_analysis(location["id"])

        self.assertEqual(response.status_code, 201)
        analysis = response.get_json()
        self.assertEqual(analysis["status"], "COMPLETED")
        self.assertAlmostEqual(
            analysis["healthy_percentage"]
            + analysis["dry_percentage"]
            + analysis["degraded_percentage"]
            + analysis["water_percentage"],
            100.0,
        )

        image_path = self.results_directory / Path(analysis["classification_image_url"]).name
        self.assertTrue(image_path.exists())

        filtered = self.client.get(
            f"/api/analyses?location_id={location['id']}&status=COMPLETED"
            "&date_from=2026-08-01&date_to=2026-08-31"
        )
        self.assertEqual(filtered.status_code, 200)
        self.assertEqual(len(filtered.get_json()["items"]), 1)

        result = self.client.get(f"/api/analyses/{analysis['id']}/result")
        self.assertEqual(result.status_code, 200)
        self.assertEqual(result.get_json()["bounds"]["min_lat"], 44.45)

        self.assertEqual(self.client.delete(f"/api/analyses/{analysis['id']}").status_code, 204)
        self.assertFalse(image_path.exists())
        self.assertEqual(self.client.delete(f"/api/locations/{location['id']}").status_code, 204)

    def test_deleting_location_removes_analyses_and_overlay(self):
        location = self.create_location()
        analysis = self.create_analysis(location["id"]).get_json()
        image_path = self.results_directory / Path(analysis["classification_image_url"]).name

        response = self.client.delete(f"/api/locations/{location['id']}")

        self.assertEqual(response.status_code, 204)
        self.assertEqual(self.client.get(f"/api/analyses/{analysis['id']}").status_code, 404)
        self.assertFalse(image_path.exists())

    def test_analysis_validation_and_invalid_filter(self):
        missing_location = self.client.post(
            "/api/analyses",
            json={
                "location_id": 999,
                "date_from": "2026-08-01",
                "date_to": "2026-08-15",
                "max_cloud_percentage": 20,
            },
        )
        self.assertEqual(missing_location.status_code, 404)

        invalid_filter = self.client.get("/api/analyses?status=UNKNOWN")
        self.assertEqual(invalid_filter.status_code, 400)

    def test_failed_analysis_exposes_failure_reason(self):
        location = self.create_location()

        with patch(
            "app.services.analysis_service.CopernicusService.get_sentinel2_bands",
            side_effect=ValueError("Satellite data is unavailable"),
        ):
            response = self.client.post(
                "/api/analyses",
                json={
                    "location_id": location["id"],
                    "date_from": "2026-08-01",
                    "date_to": "2026-08-15",
                    "max_cloud_percentage": 20,
                },
            )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.get_json()["status"], "FAILED")
        self.assertEqual(response.get_json()["failure_reason"], "Satellite data is unavailable")


if __name__ == "__main__":
    unittest.main()

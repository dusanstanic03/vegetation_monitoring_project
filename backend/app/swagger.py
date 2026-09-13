"""Swagger / OpenAPI configuration for the vegetation monitoring API.

The interactive documentation is served by flasgger at ``/apidocs`` and the raw
OpenAPI 2.0 spec at ``/apispec.json``. Per-endpoint request/response details live
in the docstrings of the route handlers in ``app/routes``.
"""

SWAGGER_CONFIG = {
    "headers": [],
    "specs": [
        {
            "endpoint": "apispec",
            "route": "/apispec.json",
            "rule_filter": lambda rule: True,
            "model_filter": lambda tag: True,
        }
    ],
    "static_url_path": "/flasgger_static",
    "swagger_ui": True,
    "specs_route": "/apidocs/",
}

SWAGGER_TEMPLATE = {
    "swagger": "2.0",
    "info": {
        "title": "Vegetation Monitoring API",
        "description": (
            "REST API for managing areas of interest (locations) and running "
            "NDVI/NDWI vegetation and water analyses over Sentinel-2 imagery "
            "from Copernicus."
        ),
        "version": "1.0.0",
    },
    "basePath": "/",
    "schemes": ["http"],
    "consumes": ["application/json"],
    "produces": ["application/json"],
    "tags": [
        {"name": "Locations", "description": "CRUD for monitored bounding-box areas"},
        {"name": "Analyses", "description": "Vegetation / water index analyses"},
        {"name": "Health", "description": "Service health checks"},
    ],
    "definitions": {
        "Location": {
            "type": "object",
            "properties": {
                "id": {"type": "integer", "example": 1},
                "name": {"type": "string", "example": "Fruska Gora"},
                "min_lat": {"type": "number", "format": "float", "example": 45.10},
                "min_lon": {"type": "number", "format": "float", "example": 19.60},
                "max_lat": {"type": "number", "format": "float", "example": 45.20},
                "max_lon": {"type": "number", "format": "float", "example": 19.80},
                "created_at": {
                    "type": "string",
                    "format": "date-time",
                    "example": "2026-09-09T10:15:00+00:00",
                },
            },
        },
        "LocationInput": {
            "type": "object",
            "required": ["name", "min_lat", "min_lon", "max_lat", "max_lon"],
            "properties": {
                "name": {"type": "string", "example": "Fruska Gora"},
                "min_lat": {
                    "type": "number",
                    "format": "float",
                    "minimum": -90,
                    "maximum": 90,
                    "example": 45.10,
                },
                "min_lon": {
                    "type": "number",
                    "format": "float",
                    "minimum": -180,
                    "maximum": 180,
                    "example": 19.60,
                },
                "max_lat": {
                    "type": "number",
                    "format": "float",
                    "minimum": -90,
                    "maximum": 90,
                    "example": 45.20,
                },
                "max_lon": {
                    "type": "number",
                    "format": "float",
                    "minimum": -180,
                    "maximum": 180,
                    "example": 19.80,
                },
            },
        },
        "Analysis": {
            "type": "object",
            "properties": {
                "id": {"type": "integer", "example": 1},
                "location_id": {"type": "integer", "example": 1},
                "date_from": {"type": "string", "format": "date", "example": "2026-06-01"},
                "date_to": {"type": "string", "format": "date", "example": "2026-06-30"},
                "max_cloud_percentage": {
                    "type": "number",
                    "format": "float",
                    "example": 20.0,
                },
                "satellite_date": {
                    "type": "string",
                    "format": "date",
                    "x-nullable": True,
                    "example": "2026-06-01",
                },
                "mean_ndvi": {
                    "type": "number",
                    "format": "float",
                    "x-nullable": True,
                    "example": 0.62,
                },
                "mean_ndwi": {
                    "type": "number",
                    "format": "float",
                    "x-nullable": True,
                    "example": -0.15,
                },
                "classification_image_url": {
                    "type": "string",
                    "x-nullable": True,
                    "example": "/static/analysis_results/analysis_1_classification.png",
                },
                "healthy_percentage": {"type": "number", "format": "float", "example": 58.4},
                "dry_percentage": {"type": "number", "format": "float", "example": 24.1},
                "degraded_percentage": {"type": "number", "format": "float", "example": 12.7},
                "water_percentage": {"type": "number", "format": "float", "example": 4.8},
                "failure_reason": {
                    "type": "string",
                    "x-nullable": True,
                    "example": None,
                },
                "status": {
                    "type": "string",
                    "enum": ["PENDING", "PROCESSING", "COMPLETED", "FAILED"],
                    "example": "COMPLETED",
                },
                "created_at": {
                    "type": "string",
                    "format": "date-time",
                    "example": "2026-09-09T10:15:00+00:00",
                },
            },
        },
        "AnalysisInput": {
            "type": "object",
            "required": ["location_id", "date_from", "date_to", "max_cloud_percentage"],
            "properties": {
                "location_id": {"type": "integer", "example": 1},
                "date_from": {"type": "string", "format": "date", "example": "2026-06-01"},
                "date_to": {"type": "string", "format": "date", "example": "2026-06-30"},
                "max_cloud_percentage": {
                    "type": "number",
                    "format": "float",
                    "minimum": 0,
                    "maximum": 100,
                    "example": 20.0,
                },
            },
        },
        "Error": {
            "type": "object",
            "properties": {
                "error": {"type": "string", "example": "Location not found"},
            },
        },
    },
}

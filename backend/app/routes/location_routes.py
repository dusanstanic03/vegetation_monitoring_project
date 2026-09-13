from flask import Blueprint, request

from app import db
from app.models.location import Location
from app.services.analysis_service import AnalysisService
from app.services.location_service import LocationService


location_bp = Blueprint("locations", __name__, url_prefix="/api/locations")


@location_bp.post("")
def create_location():
    """Create a location.
    ---
    tags:
      - Locations
    parameters:
      - in: body
        name: body
        required: true
        schema:
          $ref: '#/definitions/LocationInput'
    responses:
      201:
        description: Location created
        schema:
          $ref: '#/definitions/Location'
      400:
        description: Validation error
        schema:
          $ref: '#/definitions/Error'
    """
    location, error = LocationService.create_location(request.get_json(silent=True))
    if error:
        return {"error": error}, 400

    return location.to_dict(), 201


@location_bp.get("")
def get_locations():
    """List all locations, newest first.
    ---
    tags:
      - Locations
    responses:
      200:
        description: List of locations
        schema:
          type: object
          properties:
            items:
              type: array
              items:
                $ref: '#/definitions/Location'
    """
    locations = Location.query.order_by(Location.created_at.desc()).all()
    return {"items": [location.to_dict() for location in locations]}, 200


@location_bp.get("/<int:location_id>")
def get_location(location_id):
    """Get a single location by id.
    ---
    tags:
      - Locations
    parameters:
      - in: path
        name: location_id
        required: true
        type: integer
    responses:
      200:
        description: The location
        schema:
          $ref: '#/definitions/Location'
      404:
        description: Location not found
        schema:
          $ref: '#/definitions/Error'
    """
    location = db.session.get(Location, location_id)
    if not location:
        return {"error": "Location not found"}, 404

    return location.to_dict(), 200


@location_bp.put("/<int:location_id>")
def update_location(location_id):
    """Update an existing location.
    ---
    tags:
      - Locations
    parameters:
      - in: path
        name: location_id
        required: true
        type: integer
      - in: body
        name: body
        required: true
        schema:
          $ref: '#/definitions/LocationInput'
    responses:
      200:
        description: Location updated
        schema:
          $ref: '#/definitions/Location'
      400:
        description: Validation error
        schema:
          $ref: '#/definitions/Error'
      404:
        description: Location not found
        schema:
          $ref: '#/definitions/Error'
    """
    location = db.session.get(Location, location_id)
    if not location:
        return {"error": "Location not found"}, 404

    location, error = LocationService.update_location(location, request.get_json(silent=True))
    if error:
        return {"error": error}, 400

    return location.to_dict(), 200


@location_bp.delete("/<int:location_id>")
def delete_location(location_id):
    """Delete a location and its analyses.
    ---
    tags:
      - Locations
    parameters:
      - in: path
        name: location_id
        required: true
        type: integer
    responses:
      204:
        description: Location deleted
      404:
        description: Location not found
        schema:
          $ref: '#/definitions/Error'
    """
    location = db.session.get(Location, location_id)
    if not location:
        return {"error": "Location not found"}, 404

    for analysis in location.analyses:
        AnalysisService.delete_overlay(analysis)
    db.session.delete(location)
    db.session.commit()
    return "", 204

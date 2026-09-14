from flask import Blueprint, request

from app import db
from app.models.analysis import Analysis
from app.services.analysis_service import AnalysisService


analysis_bp = Blueprint("analyses", __name__, url_prefix="/api/analyses")


@analysis_bp.post("")
def create_analysis():
    """Create and run an analysis for a location.

    Fetches Sentinel-2 bands from Copernicus for the given date range and cloud
    threshold, then computes mean NDVI and NDWI. The returned analysis carries a
    ``status`` of ``COMPLETED`` or ``FAILED`` depending on the imagery fetch.
    ---
    tags:
      - Analyses
    parameters:
      - in: body
        name: body
        required: true
        schema:
          $ref: '#/definitions/AnalysisInput'
    responses:
      201:
        description: Analysis created (check ``status`` for the outcome)
        schema:
          $ref: '#/definitions/Analysis'
      400:
        description: Validation error
        schema:
          $ref: '#/definitions/Error'
      404:
        description: Location not found
        schema:
          $ref: '#/definitions/Error'
    """
    analysis, error, status_code = AnalysisService.create_analysis(request.get_json(silent=True))
    if error:
        return {"error": error}, status_code

    return analysis.to_dict(), status_code


@analysis_bp.get("")
def get_analyses():
    """Get all analyses, with optional filters.
    ---
    tags:
      - Analyses
    parameters:
      - in: query
        name: location_id
        type: integer
        required: false
        description: Only analyses for this location
      - in: query
        name: status
        type: string
        required: false
        enum: [PENDING, PROCESSING, COMPLETED, FAILED]
        description: Only analyses with this status (case-insensitive)
      - in: query
        name: date_from
        type: string
        format: date
        required: false
        description: Only analyses whose ``date_from`` is on or after this date (YYYY-MM-DD)
      - in: query
        name: date_to
        type: string
        format: date
        required: false
        description: Only analyses whose ``date_to`` is on or before this date (YYYY-MM-DD)
    responses:
      200:
        description: List of analyses
        schema:
          type: object
          properties:
            items:
              type: array
              items:
                $ref: '#/definitions/Analysis'
      400:
        description: Invalid filter value
        schema:
          $ref: '#/definitions/Error'
    """
    try:
        analyses = AnalysisService.get_filtered_analyses(request.args)
    except ValueError as exc:
        return {"error": str(exc)}, 400

    return {"items": [analysis.to_dict() for analysis in analyses]}, 200


@analysis_bp.get("/<int:analysis_id>")
def get_analysis(analysis_id):
    """Get an analysis by id.
    ---
    tags:
      - Analyses
    parameters:
      - in: path
        name: analysis_id
        required: true
        type: integer
    responses:
      200:
        description: The analysis
        schema:
          $ref: '#/definitions/Analysis'
      404:
        description: Analysis not found
        schema:
          $ref: '#/definitions/Error'
    """
    analysis = db.session.get(Analysis, analysis_id)
    if not analysis:
        return {"error": "Analysis not found"}, 404

    return analysis.to_dict(), 200


@analysis_bp.get("/<int:analysis_id>/result")
def get_analysis_result(analysis_id):
    """Get an analysis result with map bounds.
    ---
    tags:
      - Analyses
    parameters:
      - in: path
        name: analysis_id
        required: true
        type: integer
    responses:
      200:
        description: Analysis result prepared for map display
      404:
        description: Analysis not found
    """
    analysis = db.session.get(Analysis, analysis_id)
    if not analysis:
        return {"error": "Analysis not found"}, 404

    result = analysis.to_dict()
    result["bounds"] = {
        "min_lat": analysis.location.min_lat,
        "min_lon": analysis.location.min_lon,
        "max_lat": analysis.location.max_lat,
        "max_lon": analysis.location.max_lon,
    }
    return result, 200


@analysis_bp.delete("/<int:analysis_id>")
def delete_analysis(analysis_id):
    """Delete an analysis.
    ---
    tags:
      - Analyses
    parameters:
      - in: path
        name: analysis_id
        required: true
        type: integer
    responses:
      204:
        description: Analysis deleted
      404:
        description: Analysis not found
        schema:
          $ref: '#/definitions/Error'
    """
    analysis = db.session.get(Analysis, analysis_id)
    if not analysis:
        return {"error": "Analysis not found"}, 404

    AnalysisService.delete_analysis(analysis)
    return "", 204

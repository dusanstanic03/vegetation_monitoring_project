from datetime import datetime, timezone

from app import db


class Analysis(db.Model):
    __tablename__ = "analyses"

    id = db.Column(db.Integer, primary_key=True)
    location_id = db.Column(db.Integer, db.ForeignKey("locations.id"), nullable=False)
    date_from = db.Column(db.Date, nullable=False)
    date_to = db.Column(db.Date, nullable=False)
    max_cloud_percentage = db.Column(db.Float, nullable=False)
    mean_ndvi = db.Column(db.Float, nullable=True)
    mean_ndwi = db.Column(db.Float, nullable=True)
    classification_image_url = db.Column(db.String(255), nullable=True)
    healthy_percentage = db.Column(db.Float, nullable=True)
    dry_percentage = db.Column(db.Float, nullable=True)
    degraded_percentage = db.Column(db.Float, nullable=True)
    water_percentage = db.Column(db.Float, nullable=True)
    failure_reason = db.Column(db.Text, nullable=True)
    status = db.Column(db.String(20), nullable=False, default="PENDING")
    created_at = db.Column(db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))

    location = db.relationship("Location", back_populates="analyses")

    def to_dict(self):
        return {
            "id": self.id,
            "location_id": self.location_id,
            "date_from": self.date_from.isoformat(),
            "date_to": self.date_to.isoformat(),
            "max_cloud_percentage": self.max_cloud_percentage,
            "mean_ndvi": self.mean_ndvi,
            "mean_ndwi": self.mean_ndwi,
            "classification_image_url": self.classification_image_url,
            "healthy_percentage": self.healthy_percentage,
            "dry_percentage": self.dry_percentage,
            "degraded_percentage": self.degraded_percentage,
            "water_percentage": self.water_percentage,
            "failure_reason": self.failure_reason,
            "status": self.status,
            "created_at": self.created_at.isoformat(),
        }

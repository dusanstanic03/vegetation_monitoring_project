from pathlib import Path

import numpy as np
from PIL import Image

from app.services.classification_service import ClassificationService


class OverlayService:
    COLORS = {
        ClassificationService.INVALID: (0, 0, 0, 0),
        ClassificationService.DEGRADED: (190, 72, 52, 205),
        ClassificationService.DRY: (230, 162, 58, 205),
        ClassificationService.HEALTHY: (83, 171, 87, 205),
        ClassificationService.WATER: (52, 137, 184, 205),
    }

    @classmethod
    def create_image(cls, classification):
        classification = np.asarray(classification)
        if classification.ndim != 2:
            raise ValueError("Classification must be a two-dimensional array")

        rgba = np.zeros((*classification.shape, 4), dtype=np.uint8)
        for class_value, color in cls.COLORS.items():
            rgba[classification == class_value] = color

        return Image.fromarray(rgba, mode="RGBA")

    @classmethod
    def save(cls, classification, analysis_id, output_directory):
        output_directory = Path(output_directory)
        output_directory.mkdir(parents=True, exist_ok=True)

        filename = f"analysis_{analysis_id}_classification.png"
        output_path = output_directory / filename
        cls.create_image(classification).save(output_path, format="PNG")

        return output_path

import numpy as np


class ClassificationService:
    INVALID = 0
    DEGRADED = 1
    DRY = 2
    HEALTHY = 3
    WATER = 4

    HEALTHY_NDVI_THRESHOLD = 0.5
    DRY_NDVI_THRESHOLD = 0.2
    WATER_NDWI_THRESHOLD = 0.0
    WATER_MAX_NDVI = 0.2

    CLASS_NAMES = {
        DEGRADED: "degraded",
        DRY: "dry",
        HEALTHY: "healthy",
        WATER: "water",
    }

    @classmethod
    def classify(cls, ndvi, ndwi):
        ndvi = np.asarray(ndvi, dtype=float)
        ndwi = np.asarray(ndwi, dtype=float)

        if ndvi.shape != ndwi.shape:
            raise ValueError("NDVI and NDWI arrays must have the same shape")

        classification = np.full(ndvi.shape, cls.INVALID, dtype=np.uint8)
        valid = np.isfinite(ndvi) & np.isfinite(ndwi)

        water = (
            valid
            & (ndwi > cls.WATER_NDWI_THRESHOLD)
            & (ndvi < cls.WATER_MAX_NDVI)
        )
        healthy = valid & ~water & (ndvi >= cls.HEALTHY_NDVI_THRESHOLD)
        dry = (
            valid
            & ~water
            & (ndvi >= cls.DRY_NDVI_THRESHOLD)
            & (ndvi < cls.HEALTHY_NDVI_THRESHOLD)
        )
        degraded = valid & ~water & (ndvi < cls.DRY_NDVI_THRESHOLD)

        classification[degraded] = cls.DEGRADED
        classification[dry] = cls.DRY
        classification[healthy] = cls.HEALTHY
        classification[water] = cls.WATER

        return classification

    @classmethod
    def calculate_percentages(cls, classification):
        classification = np.asarray(classification)
        valid_pixel_count = int(np.count_nonzero(classification != cls.INVALID))

        percentages = {name: 0.0 for name in cls.CLASS_NAMES.values()}
        if valid_pixel_count == 0:
            return percentages

        for class_value, class_name in cls.CLASS_NAMES.items():
            pixel_count = np.count_nonzero(classification == class_value)
            percentages[class_name] = round(pixel_count / valid_pixel_count * 100, 2)

        return percentages

    @classmethod
    def classify_surface(cls, ndvi, ndwi):
        classification = cls.classify(ndvi, ndwi)
        return {
            "classification": classification,
            "percentages": cls.calculate_percentages(classification),
        }

import unittest

import numpy as np

from app.services.classification_service import ClassificationService
from app.services.vegetation_and_water_index_service import VegetationAndWaterIndexService


class ClassificationServiceTest(unittest.TestCase):
    def test_classifies_all_supported_surface_types(self):
        ndvi = np.array([[0.7, 0.35], [0.1, -0.2]])
        ndwi = np.array([[-0.4, -0.3], [-0.1, 0.5]])

        result = ClassificationService.classify(ndvi, ndwi)

        expected = np.array(
            [
                [ClassificationService.HEALTHY, ClassificationService.DRY],
                [ClassificationService.DEGRADED, ClassificationService.WATER],
            ],
            dtype=np.uint8,
        )
        np.testing.assert_array_equal(result, expected)

    def test_high_ndwi_does_not_override_healthy_vegetation(self):
        ndvi = np.array([[0.8]])
        ndwi = np.array([[0.4]])

        result = ClassificationService.classify(ndvi, ndwi)

        self.assertEqual(result[0, 0], ClassificationService.HEALTHY)

    def test_classifies_sea_with_moderate_positive_ndwi_as_water(self):
        ndvi = np.array([[-0.1, 0.05]])
        ndwi = np.array([[0.08, 0.15]])

        result = ClassificationService.classify(ndvi, ndwi)

        np.testing.assert_array_equal(
            result,
            np.array([[ClassificationService.WATER, ClassificationService.WATER]]),
        )

    def test_marks_non_finite_pixels_as_invalid(self):
        ndvi = np.array([[np.nan, 0.7], [0.3, np.inf]])
        ndwi = np.array([[0.1, np.nan], [-0.2, 0.1]])

        result = ClassificationService.classify(ndvi, ndwi)

        expected = np.array(
            [
                [ClassificationService.INVALID, ClassificationService.INVALID],
                [ClassificationService.DRY, ClassificationService.INVALID],
            ],
            dtype=np.uint8,
        )
        np.testing.assert_array_equal(result, expected)

    def test_calculates_percentages_using_only_valid_pixels(self):
        classification = np.array(
            [
                [ClassificationService.HEALTHY, ClassificationService.HEALTHY],
                [ClassificationService.DRY, ClassificationService.DEGRADED],
                [ClassificationService.WATER, ClassificationService.INVALID],
            ]
        )

        percentages = ClassificationService.calculate_percentages(classification)

        self.assertEqual(
            percentages,
            {"degraded": 20.0, "dry": 20.0, "healthy": 40.0, "water": 20.0},
        )

    def test_returns_zero_percentages_when_there_are_no_valid_pixels(self):
        classification = np.zeros((2, 2), dtype=np.uint8)

        percentages = ClassificationService.calculate_percentages(classification)

        self.assertEqual(
            percentages,
            {"degraded": 0.0, "dry": 0.0, "healthy": 0.0, "water": 0.0},
        )

    def test_rejects_arrays_with_different_shapes(self):
        with self.assertRaisesRegex(ValueError, "must have the same shape"):
            ClassificationService.classify(np.zeros((2, 2)), np.zeros((3, 3)))

    def test_rejects_mean_without_valid_pixels(self):
        with self.assertRaisesRegex(ValueError, "valid pixels"):
            VegetationAndWaterIndexService.mean_index(np.array([np.nan, np.inf]))


if __name__ == "__main__":
    unittest.main()

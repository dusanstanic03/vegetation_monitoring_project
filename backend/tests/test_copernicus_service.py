import unittest

import numpy as np

from app.services.copernicus_service import CopernicusService


class CopernicusServiceTest(unittest.TestCase):
    def test_keeps_supported_image_size(self):
        self.assertEqual(CopernicusService.fit_request_size((1200, 800)), (1200, 800))

    def test_scales_large_image_while_preserving_aspect_ratio(self):
        width, height = CopernicusService.fit_request_size((3559, 2778))

        self.assertEqual(width, CopernicusService.MAX_IMAGE_DIMENSION)
        self.assertLessEqual(height, CopernicusService.MAX_IMAGE_DIMENSION)
        self.assertAlmostEqual(width / height, 3559 / 2778, places=2)

    def test_rejects_image_without_valid_pixels(self):
        image = np.zeros((3, 4, 4), dtype=float)

        with self.assertRaisesRegex(ValueError, "wider date range"):
            CopernicusService.extract_bands(image)

    def test_extracts_valid_pixels_and_masks_invalid_ones(self):
        image = np.ones((1, 2, 4), dtype=float)
        image[0, 1, 3] = 0

        bands = CopernicusService.extract_bands(image)

        self.assertTrue(np.isfinite(bands["B03"][0, 0]))
        self.assertTrue(np.isnan(bands["B03"][0, 1]))
        self.assertIsNone(bands["satellite_date"])


if __name__ == "__main__":
    unittest.main()

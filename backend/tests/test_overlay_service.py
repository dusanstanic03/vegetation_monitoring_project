import tempfile
import unittest
from pathlib import Path

import numpy as np
from PIL import Image

from app.services.classification_service import ClassificationService
from app.services.overlay_service import OverlayService


class OverlayServiceTest(unittest.TestCase):
    def test_creates_rgba_image_using_classification_colors(self):
        classification = np.array(
            [[ClassificationService.INVALID, ClassificationService.DEGRADED],
             [ClassificationService.DRY, ClassificationService.HEALTHY],
             [ClassificationService.WATER, ClassificationService.INVALID]],
            dtype=np.uint8,
        )

        image = OverlayService.create_image(classification)

        self.assertEqual(image.mode, "RGBA")
        self.assertEqual(image.size, (2, 3))
        self.assertEqual(image.getpixel((0, 0)), OverlayService.COLORS[ClassificationService.INVALID])
        self.assertEqual(image.getpixel((1, 0)), OverlayService.COLORS[ClassificationService.DEGRADED])
        self.assertEqual(image.getpixel((0, 1)), OverlayService.COLORS[ClassificationService.DRY])
        self.assertEqual(image.getpixel((1, 1)), OverlayService.COLORS[ClassificationService.HEALTHY])
        self.assertEqual(image.getpixel((0, 2)), OverlayService.COLORS[ClassificationService.WATER])

    def test_saves_png_in_requested_directory(self):
        classification = np.array([[ClassificationService.HEALTHY]], dtype=np.uint8)

        with tempfile.TemporaryDirectory() as temporary_directory:
            output_path = OverlayService.save(classification, 42, temporary_directory)

            self.assertEqual(output_path.name, "analysis_42_classification.png")
            self.assertTrue(output_path.exists())
            with Image.open(output_path) as image:
                self.assertEqual(image.format, "PNG")
                self.assertEqual(image.mode, "RGBA")

    def test_rejects_non_matrix_classification(self):
        with self.assertRaisesRegex(ValueError, "two-dimensional"):
            OverlayService.create_image(np.zeros((2, 2, 2), dtype=np.uint8))


if __name__ == "__main__":
    unittest.main()

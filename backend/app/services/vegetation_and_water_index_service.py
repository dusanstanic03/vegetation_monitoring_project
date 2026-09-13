import numpy as np


class VegetationAndWaterIndexService:
    @staticmethod
    def calculate_ndvi(red, nir):
        red = np.asarray(red, dtype=float)
        nir = np.asarray(nir, dtype=float)
        denominator = nir + red

        return np.divide(nir - red, denominator, out=np.zeros_like(denominator), where=denominator != 0)

    @staticmethod
    def calculate_ndwi(green, nir):
        green = np.asarray(green, dtype=float)
        nir = np.asarray(nir, dtype=float)
        denominator = green + nir

        return np.divide(green - nir, denominator, out=np.zeros_like(denominator), where=denominator != 0)

    @staticmethod
    def mean_index(index_values):
        index_values = np.asarray(index_values, dtype=float)
        valid_values = index_values[np.isfinite(index_values)]
        if valid_values.size == 0:
            raise ValueError("Vegetation index does not contain valid pixels")
        return float(np.mean(valid_values))

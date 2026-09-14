import os

from dotenv import load_dotenv


load_dotenv()

BASE_DIR = os.path.abspath(os.path.dirname(__file__))
DEFAULT_DATABASE_URL = "sqlite:///" + os.path.join(BASE_DIR, "vegetation.db")


class Config:
    SQLALCHEMY_DATABASE_URI = os.getenv("DATABASE_URL", DEFAULT_DATABASE_URL)
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    COPERNICUS_CLIENT_ID = os.getenv("COPERNICUS_CLIENT_ID")
    COPERNICUS_CLIENT_SECRET = os.getenv("COPERNICUS_CLIENT_SECRET")
    COPERNICUS_BASE_URL = os.getenv(
        "COPERNICUS_BASE_URL", "https://sh.dataspace.copernicus.eu")
    COPERNICUS_TOKEN_URL = os.getenv(
        "COPERNICUS_TOKEN_URL",
        "https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token",
    )

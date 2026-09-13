from config import Config
from flasgger import Swagger
from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import inspect, text

from app.swagger import SWAGGER_CONFIG, SWAGGER_TEMPLATE

db = SQLAlchemy()


def create_app(config_overrides=None):
    app = Flask(__name__)
    app.config.from_object(Config)
    if config_overrides:
        app.config.update(config_overrides)

    db.init_app(app)
    Swagger(app, config=SWAGGER_CONFIG, template=SWAGGER_TEMPLATE)

    from app.routes.location_routes import location_bp
    from app.routes.analysis_routes import analysis_bp

    app.register_blueprint(location_bp)
    app.register_blueprint(analysis_bp)

    @app.get("/health")
    def health():
        """Service health check.
        ---
        tags:
          - Health
        responses:
          200:
            description: Service is up
            schema:
              type: object
              properties:
                status:
                  type: string
                  example: UP
        """
        return {"status": "UP"}, 200

    @app.cli.command("init-db")
    def init_db():
        db.create_all()

        # create_all does not add columns to an existing SQLite database.
        if db.engine.dialect.name == "sqlite" and "analyses" in inspect(db.engine).get_table_names():
            existing_columns = {
                column["name"] for column in inspect(db.engine).get_columns("analyses")
            }
            result_columns = {
                "classification_image_url": "VARCHAR(255)",
                "healthy_percentage": "FLOAT",
                "dry_percentage": "FLOAT",
                "degraded_percentage": "FLOAT",
                "water_percentage": "FLOAT",
                "failure_reason": "TEXT",
            }
            for column_name, column_type in result_columns.items():
                if column_name not in existing_columns:
                    db.session.execute(
                        text(f"ALTER TABLE analyses ADD COLUMN {column_name} {column_type}")
                    )
            db.session.commit()

        print("Database tables created.")

    return app

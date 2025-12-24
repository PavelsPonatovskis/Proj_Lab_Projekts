from datetime import datetime, timezone
from werkzeug.security import generate_password_hash, check_password_hash
from sqlalchemy.ext.mutable import MutableDict  # ✅ NEW
from . import db


class User(db.Model):
    __tablename__ = "users"
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(255), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    name = db.Column(db.String(120), nullable=False)

    routes = db.relationship("Route", backref="owner", lazy=True)

    def set_password(self, raw_password: str):
        self.password_hash = generate_password_hash(raw_password)

    def check_password(self, raw_password: str) -> bool:
        return check_password_hash(self.password_hash, raw_password)


class Route(db.Model):
    __tablename__ = "routes"
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), nullable=False)

    # ✅ FIX: Mutable JSON so in-place changes persist
    parameters = db.Column(MutableDict.as_mutable(db.JSON), nullable=True)

    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    # ✅ NEW (Soft delete / archive)
    is_deleted = db.Column(db.Boolean, nullable=False, default=False)
    deleted_at = db.Column(db.DateTime, nullable=True)

    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)

    clients = db.relationship(
        "Client", backref="route", cascade="all, delete-orphan", lazy=True
    )

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "parameters": self.parameters,
            "created_at": self.created_at.isoformat(),
            # ✅ NEW (optional to expose; useful for stats/debug)
            "is_deleted": self.is_deleted,
            "deleted_at": self.deleted_at.isoformat() if self.deleted_at else None,
            "clients": [c.to_dict() for c in self.clients],
        }


class Client(db.Model):
    __tablename__ = "clients"
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(255), nullable=False)
    lat = db.Column(db.Float, nullable=False)
    lon = db.Column(db.Float, nullable=False)
    time_window_from = db.Column(db.String(16), nullable=True)
    time_window_to = db.Column(db.String(16), nullable=True)
    demand = db.Column(db.Float, nullable=True)

    route_id = db.Column(db.Integer, db.ForeignKey("routes.id"), nullable=False)

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "lat": self.lat,
            "lon": self.lon,
            "time_window_from": self.time_window_from,
            "time_window_to": self.time_window_to,
            "demand": self.demand,
        }

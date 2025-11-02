from flask import Blueprint, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from . import db
from .models import Route, Client


routes_bp = Blueprint("routes", __name__)

def route_to_dict(r: Route):
    return {
        "id": r.id,
        "name": r.name,
        "parameters": r.parameters or {},
        "created_at": r.created_at.isoformat(),
        "clients": [
            {
                "id": c.id, "name": c.name, "lat": c.lat, "lon": c.lon,
                "time_window_from": c.time_window_from, "time_window_to": c.time_window_to,
                "demand": c.demand
            } for c in r.clients
        ]
    }

@routes_bp.get("/")
@jwt_required()
def list_routes():
    uid = get_jwt_identity()
    q = Route.query.filter_by(user_id=uid).order_by(Route.created_at.desc())
    return {"items": [route_to_dict(r) for r in q.all()]}

@routes_bp.post("/")
@jwt_required()
def create_route():
    uid = get_jwt_identity()
    print("DEBUG: Received JWT identity =", uid)
    print("DEBUG: Received headers =", dict(request.headers))
    print("DEBUG: Received data =", request.get_json())
    data = request.get_json() or {}
    name = (data.get("name") or "").strip()
    parameters = data.get("parameters") or {}
    clients = data.get("clients") or []

    if not name:
        return {"error": "name is required"}, 400

    r = Route(name=name, parameters=parameters, user_id=uid)
    db.session.add(r)
    db.session.flush()  

    for c in clients:
        client = Client(
            name=c.get("name", "Client"),
            lat=float(c["lat"]),
            lon=float(c["lon"]),
            time_window_from=c.get("time_window_from"),
            time_window_to=c.get("time_window_to"),
            demand=c.get("demand"),
            route_id=r.id
        )
        db.session.add(client)

    db.session.commit()
    return route_to_dict(r), 201

@routes_bp.put("/<int:route_id>")
@jwt_required()
def update_route(route_id):
    uid = get_jwt_identity()
    r = Route.query.filter_by(id=route_id, user_id=uid).first()
    if not r:
        return {"error": "route not found"}, 404

    data = request.get_json() or {}
    if "name" in data:
        r.name = (data.get("name") or r.name).strip()
    if "parameters" in data:
        r.parameters = data.get("parameters") or r.parameters

    if "clients" in data:
        for c in r.clients:
            db.session.delete(c)
        for c in data["clients"] or []:
            db.session.add(Client(
                name=c.get("name", "Client"),
                lat=float(c["lat"]),
                lon=float(c["lon"]),
                time_window_from=c.get("time_window_from"),
                time_window_to=c.get("time_window_to"),
                demand=c.get("demand"),
                route_id=r.id
            ))

    db.session.commit()
    return route_to_dict(r)

@routes_bp.delete("/<int:route_id>")
@jwt_required()
def delete_route(route_id):
    uid = get_jwt_identity()
    r = Route.query.filter_by(id=route_id, user_id=uid).first()
    if not r:
        return {"error": "route not found"}, 404
    db.session.delete(r)
    db.session.commit()
    return {"message": "deleted"}

@routes_bp.post("/<int:route_id>/clients")
@jwt_required()
def add_client(route_id):
    uid = get_jwt_identity()
    r = Route.query.filter_by(id=route_id, user_id=uid).first()
    if not r:
        return {"error": "route not found"}, 404

    data = request.get_json() or {}
    name = data.get("name", "Client")
    lat = data.get("lat")
    lon = data.get("lon")

    if lat is None or lon is None:
        return {"error": "lat/lon required"}, 400

    c = Client(name=name, lat=float(lat), lon=float(lon), route_id=r.id)
    db.session.add(c)
    db.session.commit()

    return {"message": "client added", "client": {
        "id": c.id, "name": c.name, "lat": c.lat, "lon": c.lon
    }}, 201

@routes_bp.delete("/<int:route_id>/clients/<int:client_id>")
@jwt_required()
def delete_client(route_id, client_id):
    uid = get_jwt_identity()
    c = Client.query.join(Route).filter(
        Client.id == client_id, Route.user_id == uid, Route.id == route_id
    ).first()
    if not c:
        return {"error": "client not found"}, 404

    db.session.delete(c)
    db.session.commit()
    return {"message": "deleted"}

@routes_bp.post("/<int:route_id>/matrix")
@jwt_required()
def upload_distance_matrix(route_id):
    uid = get_jwt_identity()
    r = Route.query.filter_by(id=route_id, user_id=uid).first()
    if not r:
        return {"error": "route not found"}, 404

    data = request.get_json() or {}
    matrix = data.get("matrix")

    if not matrix or not isinstance(matrix, list):
        return {"error": "invalid matrix"}, 400

    # Save matrix into parameters
    r.parameters = r.parameters or {}
    r.parameters["distance_matrix"] = matrix
    db.session.commit()

    return {"message": "Matrix uploaded successfully", "route": route_to_dict(r)}


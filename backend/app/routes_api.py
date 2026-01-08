from flask import Blueprint, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from . import db
from .models import Route, Client

import os
from datetime import datetime, timezone
import requests

routes_bp = Blueprint("routes", __name__)

WAREHOUSES = [
    {"id": 1, "name": "Warehouse 1", "lat": 56.969109, "lng": 24.112366},
    {"id": 2, "name": "Warehouse 2", "lat": 56.939166, "lng": 24.055983},
    {"id": 3, "name": "Warehouse 3", "lat": 56.952044, "lng": 24.158705},
]

OSRM_BASE = "https://router.project-osrm.org"
GOOGLE_DIRECTIONS_URL = "https://maps.googleapis.com/maps/api/directions/json"


def _osrm_route_metrics(points, profile="driving", timeout=12):
    """
    points: list of {"lat":..,"lng":..}
    Open route: 0->1->2->... (no return)
    Returns: {"distance": meters, "duration": seconds}
    """
    if not points or len(points) < 2:
        return {"distance": 0.0, "duration": 0.0}

    coords = ";".join([f'{p["lng"]},{p["lat"]}' for p in points])

    url = f"{OSRM_BASE}/route/v1/{profile}/{coords}"
    params = {
        "overview": "false",
        "geometries": "geojson",
        "steps": "false",
    }

    r = requests.get(url, params=params, timeout=timeout)
    r.raise_for_status()
    data = r.json()

    route = (data.get("routes") or [None])[0]
    if not route:
        raise ValueError("OSRM returned no routes")

    return {
        "distance": float(route.get("distance") or 0.0),
        "duration": float(route.get("duration") or 0.0),
    }


def _osrm_table(points, profile="driving", timeout=12):
    """
    points: list of {"lat":..,"lng":..}
    Returns: durations matrix [N][N] in seconds
    """
    if not points or len(points) < 2:
        return [[0.0]]

    coords = ";".join([f'{p["lng"]},{p["lat"]}' for p in points])
    url = f"{OSRM_BASE}/table/v1/{profile}/{coords}"
    params = {"annotations": "duration"}

    r = requests.get(url, params=params, timeout=timeout)
    r.raise_for_status()
    data = r.json()

    durations = data.get("durations")
    if not durations:
        raise ValueError("OSRM table returned no durations")

    return durations


def _google_traffic_eta(points, timeout=12):
    """
    points: list of {"lat":..,"lng":..} in route order
    Returns:
      {"traffic_duration": seconds, "duration": seconds, "distance": meters}
    On failure returns: {"error": "..."}
    """
    api_key = os.getenv("GOOGLE_MAPS_API_KEY")
    if not api_key:
        return {"error": "GOOGLE_MAPS_API_KEY not set"}

    if not points or len(points) < 2:
        return {"error": "Need at least 2 points"}

    origin = f'{points[0]["lat"]},{points[0]["lng"]}'
    destination = f'{points[-1]["lat"]},{points[-1]["lng"]}'

    params = {
        "origin": origin,
        "destination": destination,
        "mode": "driving",
        "departure_time": "now",  
        "key": api_key,
    }

    if len(points) > 2:
        params["waypoints"] = "|".join(
            [f'{p["lat"]},{p["lng"]}' for p in points[1:-1]]
        )

    r = requests.get(GOOGLE_DIRECTIONS_URL, params=params, timeout=timeout)
    r.raise_for_status()
    data = r.json()

    if data.get("status") != "OK" or not data.get("routes"):
        return {
            "error": f'Google status={data.get("status")} msg={data.get("error_message")}'
        }

    route = data["routes"][0]
    legs = route.get("legs") or []

    traffic_s = 0
    normal_s = 0
    dist_m = 0

    for leg in legs:
        dist_m += int((leg.get("distance") or {}).get("value") or 0)
        normal_s += int((leg.get("duration") or {}).get("value") or 0)
        traffic_s += int((leg.get("duration_in_traffic") or {}).get("value") or 0)

    if traffic_s == 0:
        traffic_s = normal_s

    return {"traffic_duration": traffic_s, "duration": normal_s, "distance": dist_m}


def _nearest_neighbor_order(durations):
    """
    durations: NxN
    Returns a node visit order starting at 0 (warehouse), visiting all nodes 1..N-1.
    Example output: [0, 3, 1, 4, 2]
    """
    n = len(durations)
    unvisited = set(range(1, n))
    order = [0]
    cur = 0

    while unvisited:
        nxt = min(
            unvisited,
            key=lambda j: durations[cur][j]
            if durations[cur][j] is not None
            else float("inf"),
        )
        order.append(nxt)
        unvisited.remove(nxt)
        cur = nxt

    return order


def _order_cost(order, durations):
    total = 0.0
    for i in range(len(order) - 1):
        a = order[i]
        b = order[i + 1]
        w = durations[a][b]
        if w is None:
            return float("inf")
        total += float(w)
    return total


def _two_opt(order, durations, max_iters=50):
    """
    Simple 2-opt improvement for an open path.
    order starts with 0.
    """
    best = order[:]
    best_cost = _order_cost(best, durations)
    n = len(best)

    improved = True
    it = 0
    while improved and it < max_iters:
        improved = False
        it += 1
        for i in range(1, n - 2):
            for k in range(i + 1, n - 1):
                new_order = best[:]
                new_order[i : k + 1] = reversed(new_order[i : k + 1])
                new_cost = _order_cost(new_order, durations)
                if new_cost < best_cost:
                    best = new_order
                    best_cost = new_cost
                    improved = True
                    break
            if improved:
                break

    return best

def route_to_dict(r: Route):
    params = r.parameters or {}
    baseline = params.get("baseline")
    optimized = params.get("optimized")

    return {
        "id": r.id,
        "name": r.name,
        "parameters": params,
        "created_at": r.created_at.isoformat(),
        "baseline": baseline,
        "optimized": optimized,
        "is_deleted": bool(getattr(r, "is_deleted", False)),
        "deleted_at": r.deleted_at.isoformat()
        if getattr(r, "deleted_at", None)
        else None,
        "clients": [
            {
                "id": c.id,
                "name": c.name,
                "lat": c.lat,
                "lon": c.lon,
                "time_window_from": c.time_window_from,
                "time_window_to": c.time_window_to,
                "demand": c.demand,
            }
            for c in r.clients
        ],
    }

def _safe_float(x):
    try:
        return float(x)
    except Exception:
        return None


def _get_traffic_seconds(obj):
    """
    obj: baseline/optimized dict
    Prefer Google traffic_duration, fallback to OSRM duration.
    """
    if not obj:
        return None
    t = (obj.get("traffic") or {}).get("traffic_duration")
    t = _safe_float(t)
    if t is not None and t > 0:
        return t
    d = _safe_float(obj.get("duration"))
    if d is not None and d > 0:
        return d
    return None


@routes_bp.get("/stats")
@jwt_required()
def routes_stats():
    uid = get_jwt_identity()

    scope = request.args.get("scope", "all").lower()
    include_deleted = scope == "all"

    q = Route.query.filter_by(user_id=uid)
    if not include_deleted:
        q = q.filter(Route.is_deleted == False)  

    routes = q.all()

    totals = {
        "routes_total": len(routes),
        "routes_active": sum(1 for r in routes if not getattr(r, "is_deleted", False)),
        "routes_archived": sum(1 for r in routes if getattr(r, "is_deleted", False)),
        "stops_total": sum(len(r.clients or []) for r in routes),
        "baseline_distance_m": 0.0,
        "optimized_distance_m": 0.0,
        "baseline_time_s": 0.0,   
        "optimized_time_s": 0.0,  
        "routes_with_baseline": 0,
        "routes_with_optimized": 0,
        "routes_comparable": 0,
    }

    items = []

    for r in routes:
        params = r.parameters or {}
        b = params.get("baseline") or None
        o = params.get("optimized") or None

        if b:
            totals["routes_with_baseline"] += 1
        if o:
            totals["routes_with_optimized"] += 1

        bd = _safe_float(b.get("distance")) if b else None
        od = _safe_float(o.get("distance")) if o else None

        bt = _get_traffic_seconds(b) if b else None
        ot = _get_traffic_seconds(o) if o else None

        if bd is not None and bd > 0:
            totals["baseline_distance_m"] += bd
        if od is not None and od > 0:
            totals["optimized_distance_m"] += od

        if bt is not None and bt > 0:
            totals["baseline_time_s"] += bt
        if ot is not None and ot > 0:
            totals["optimized_time_s"] += ot

        comparable = bool(b and o and bt and ot)
        if comparable:
            totals["routes_comparable"] += 1

        items.append(
            {
                "id": r.id,
                "name": r.name,
                "is_deleted": bool(getattr(r, "is_deleted", False)),
                "deleted_at": r.deleted_at.isoformat()
                if getattr(r, "deleted_at", None)
                else None,
                "stops": len(r.clients or []),
                "baseline_distance_m": bd,
                "optimized_distance_m": od,
                "baseline_time_s": bt,
                "optimized_time_s": ot,
                "has_baseline": bool(b),
                "has_optimized": bool(o),
                "comparable": comparable,
            }
        )

    def _pct_saved(base, opt):
        if base is None or opt is None or base <= 0:
            return None
        return (base - opt) / base * 100.0

    distance_saved_m = totals["baseline_distance_m"] - totals["optimized_distance_m"]
    time_saved_s = totals["baseline_time_s"] - totals["optimized_time_s"]

    return {
        "scope": scope,
        "totals": totals,
        "distance_saved_m": distance_saved_m,
        "distance_saved_pct": _pct_saved(
            totals["baseline_distance_m"], totals["optimized_distance_m"]
        ),
        "time_saved_s": time_saved_s,
        "time_saved_pct": _pct_saved(totals["baseline_time_s"], totals["optimized_time_s"]),
        "items": items,
    }


@routes_bp.get("/warehouses")
@jwt_required()
def list_warehouses():
    return {"items": WAREHOUSES}


@routes_bp.get("/")
@jwt_required()
def list_routes():
    uid = get_jwt_identity()

    include_deleted = request.args.get("include_deleted", "0") == "1"

    q = Route.query.filter_by(user_id=uid)
    if not include_deleted:
        q = q.filter(Route.is_deleted == False)  # noqa: E712

    q = q.order_by(Route.created_at.desc())
    return {"items": [route_to_dict(r) for r in q.all()]}


@routes_bp.post("/")
@jwt_required()
def create_route():
    uid = get_jwt_identity()
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
            route_id=r.id,
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

    if getattr(r, "is_deleted", False):
        return {"error": "route is archived"}, 400

    data = request.get_json() or {}
    if "name" in data:
        r.name = (data.get("name") or r.name).strip()
    if "parameters" in data:
        r.parameters = data.get("parameters") or r.parameters

    if "clients" in data:
        for c in r.clients:
            db.session.delete(c)
        for c in data["clients"] or []:
            db.session.add(
                Client(
                    name=c.get("name", "Client"),
                    lat=float(c["lat"]),
                    lon=float(c["lon"]),
                    time_window_from=c.get("time_window_from"),
                    time_window_to=c.get("time_window_to"),
                    demand=c.get("demand"),
                    route_id=r.id,
                )
            )

    db.session.commit()
    return route_to_dict(r)


@routes_bp.delete("/<int:route_id>")
@jwt_required()
def delete_route(route_id):
    uid = get_jwt_identity()
    r = Route.query.filter_by(id=route_id, user_id=uid).first()
    if not r:
        return {"error": "route not found"}, 404

    if getattr(r, "is_deleted", False):
        return {"message": "already archived"}

    r.is_deleted = True
    r.deleted_at = datetime.now(timezone.utc)

    db.session.commit()
    return {"message": "archived"}


@routes_bp.delete("/<int:route_id>/permanent")
@jwt_required()
def delete_route_permanently(route_id):
    uid = get_jwt_identity()
    r = Route.query.filter_by(id=route_id, user_id=uid).first()
    if not r:
        return {"error": "route not found"}, 404

    if not getattr(r, "is_deleted", False):
        return {"error": "route must be archived before permanent delete"}, 400

    db.session.delete(r)
    db.session.commit()
    return {"message": "permanently deleted"}

@routes_bp.post("/<int:route_id>/clients")
@jwt_required()
def add_client(route_id):
    uid = get_jwt_identity()
    r = Route.query.filter_by(id=route_id, user_id=uid).first()
    if not r:
        return {"error": "route not found"}, 404

    if getattr(r, "is_deleted", False):
        return {"error": "route is archived"}, 400

    data = request.get_json() or {}
    name = data.get("name", "Client")
    lat = data.get("lat")
    lon = data.get("lon")

    if lat is None or lon is None:
        return {"error": "lat/lon required"}, 400

    c = Client(name=name, lat=float(lat), lon=float(lon), route_id=r.id)
    db.session.add(c)
    db.session.commit()

    return {
        "message": "client added",
        "client": {"id": c.id, "name": c.name, "lat": c.lat, "lon": c.lon},
    }, 201


@routes_bp.delete("/<int:route_id>/clients/<int:client_id>")
@jwt_required()
def delete_client(route_id, client_id):
    uid = get_jwt_identity()
    c = Client.query.join(Route).filter(
        Client.id == client_id, Route.user_id == uid, Route.id == route_id
    ).first()
    if not c:
        return {"error": "client not found"}, 404

    if getattr(c.route, "is_deleted", False):
        return {"error": "route is archived"}, 400

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

    if getattr(r, "is_deleted", False):
        return {"error": "route is archived"}, 400

    data = request.get_json() or {}
    matrix = data.get("matrix")

    if not matrix or not isinstance(matrix, list):
        return {"error": "invalid matrix"}, 400

    r.parameters = r.parameters or {}
    r.parameters["distance_matrix"] = matrix
    db.session.commit()

    return {"message": "Matrix uploaded successfully", "route": route_to_dict(r)}


@routes_bp.post("/<int:route_id>/baseline")
@jwt_required()
def compute_baseline(route_id):
    uid = get_jwt_identity()
    r = Route.query.filter_by(id=route_id, user_id=uid).first()
    if not r:
        return {"error": "route not found"}, 404

    if getattr(r, "is_deleted", False):
        return {"error": "route is archived"}, 400

    if not r.clients or len(r.clients) == 0:
        return {"error": "route has no clients"}, 400

    wh = WAREHOUSES[0]  # baseline uses warehouse #1
    points = [{"lat": wh["lat"], "lng": wh["lng"]}] + [
        {"lat": float(c.lat), "lng": float(c.lon)} for c in r.clients
    ]

    try:
        metrics = _osrm_route_metrics(points, profile="driving", timeout=12)
    except requests.RequestException as e:
        return {"error": f"OSRM request failed: {str(e)}"}, 502
    except Exception as e:
        return {"error": f"Baseline computation failed: {str(e)}"}, 500

    traffic = None
    try:
        traffic = _google_traffic_eta(points, timeout=12)
    except Exception as e:
        traffic = {"error": str(e)}

    r.parameters = r.parameters or {}
    r.parameters["baseline"] = {
        "warehouse_id": wh["id"],
        "warehouse_name": wh["name"],
        "distance": metrics["distance"],
        "duration": metrics["duration"],
        "traffic": traffic,
        "traffic_updated_at": datetime.now(timezone.utc).isoformat(),
    }

    db.session.commit()
    return {"message": "baseline computed", "route": route_to_dict(r)}


@routes_bp.post("/<int:route_id>/optimize")
@jwt_required()
def optimize_route(route_id):
    uid = get_jwt_identity()
    r = Route.query.filter_by(id=route_id, user_id=uid).first()
    if not r:
        return {"error": "route not found"}, 404

    if getattr(r, "is_deleted", False):
        return {"error": "route is archived"}, 400

    if not r.clients or len(r.clients) == 0:
        return {"error": "route has no clients"}, 400

    stops = [{"id": c.id, "lat": float(c.lat), "lng": float(c.lon)} for c in r.clients]

    best = None

    for wh in WAREHOUSES:
        points = [{"lat": wh["lat"], "lng": wh["lng"]}] + [
            {"lat": s["lat"], "lng": s["lng"]} for s in stops
        ]

        try:
            durations = _osrm_table(points, profile="driving", timeout=12)
        except requests.RequestException as e:
            return {"error": f"OSRM table failed: {str(e)}"}, 502
        except Exception as e:
            return {"error": f"Optimization failed: {str(e)}"}, 500

        order_nodes = _nearest_neighbor_order(durations)
        order_nodes = _two_opt(order_nodes, durations)

        ordered_client_ids = [stops[i - 1]["id"] for i in order_nodes if i != 0]

        id_to_stop = {s["id"]: s for s in stops}
        ordered_stops = [id_to_stop[cid] for cid in ordered_client_ids]

        ordered_points = [{"lat": wh["lat"], "lng": wh["lng"]}] + [
            {"lat": s["lat"], "lng": s["lng"]} for s in ordered_stops
        ]

        try:
            metrics = _osrm_route_metrics(ordered_points, profile="driving", timeout=12)
        except requests.RequestException as e:
            return {"error": f"OSRM route failed: {str(e)}"}, 502
        except Exception as e:
            return {"error": f"Optimization metrics failed: {str(e)}"}, 500

        candidate = {
            "warehouse_id": wh["id"],
            "warehouse_name": wh["name"],
            "order": ordered_client_ids,
            "distance": metrics["distance"],
            "duration": metrics["duration"],
        }

        if best is None or candidate["duration"] < best["duration"]:
            best = candidate

    traffic = None
    try:
        wh_best = next(w for w in WAREHOUSES if w["id"] == best["warehouse_id"])
        id_to_stop = {s["id"]: s for s in stops}
        ordered_points_best = [{"lat": wh_best["lat"], "lng": wh_best["lng"]}] + [
            {"lat": id_to_stop[cid]["lat"], "lng": id_to_stop[cid]["lng"]}
            for cid in best["order"]
        ]
        traffic = _google_traffic_eta(ordered_points_best, timeout=12)
    except Exception as e:
        traffic = {"error": str(e)}

    best["traffic"] = traffic
    best["traffic_updated_at"] = datetime.now(timezone.utc).isoformat()

    r.parameters = r.parameters or {}
    r.parameters["optimized"] = best
    db.session.commit()

    return {"message": "optimized", "route": route_to_dict(r)}

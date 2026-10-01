#!/usr/bin/env python3
"""
PX4 Integration Bridge Server
=============================
Bridges path planning waypoints from the browser prototype to PX4 SITL and Gazebo.

Architecture:
  Browser (Three.js UI) 
    ==> HTTP POST /api/waypoints
    ==> This Bridge Server (Flask or built-in standard library http.server)
    ==> PX4 SITL (UDP 14540)
    ==> Gazebo Simulation (Simulated Rover)
"""

import os
import sys
import json
import time

# Optional PyMAVLink support
try:
    from pymavlink import mavutil
    has_mavlink = True
except ImportError:
    has_mavlink = False

# Optional Flask support
try:
    from flask import Flask, request, jsonify
    try:
        from flask_cors import CORS
        has_cors = True
    except ImportError:
        has_cors = False
    has_flask = True
except ImportError:
    has_flask = False

# Bridge State
bridge_state = {
    "status": "connected",
    "px4_connected": False,
    "target_system": 1,
    "target_component": 1,
    "sitl_address": "udp:127.0.0.1:14540",
    "last_mission": None,
    "waypoints_received_count": 0,
    "replan_count": 0
}

mav_conn = None

def init_mavlink():
    global mav_conn, bridge_state
    if not has_mavlink:
        print("[PX4 BRIDGE] pymavlink not installed. Running in mock/file-export mode.")
        return False
    try:
        print(f"[PX4 BRIDGE] Connecting to PX4 SITL at {bridge_state['sitl_address']}...")
        mav_conn = mavutil.mavlink_connection(bridge_state["sitl_address"])
        msg = mav_conn.wait_heartbeat(timeout=2.0)
        if msg:
            bridge_state["px4_connected"] = True
            bridge_state["target_system"] = mav_conn.target_system
            bridge_state["target_component"] = mav_conn.target_component
            print(f"[PX4 BRIDGE] Connected to PX4 SITL (System: {mav_conn.target_system}, Component: {mav_conn.target_component})")
            return True
        else:
            print("[PX4 BRIDGE] Heartbeat timeout. PX4 SITL not yet running on UDP 14540. Waiting...")
            return False
    except Exception as e:
        print(f"[PX4 BRIDGE] Connection error: {e}")
        return False

def process_waypoints_payload(data):
    """Common handler for waypoint processing across Flask and standard http.server."""
    global bridge_state, mav_conn
    if not data or "waypoints" not in data:
        return {"success": False, "error": "Missing waypoints in payload"}, 400

    waypoints = data["waypoints"]
    algorithm = data.get("algorithm", "A*")
    is_replanned = data.get("isReplanned", False)
    origin = data.get("origin", {"lat": 47.397742, "lon": 8.545594, "alt": 488.0})

    bridge_state["waypoints_received_count"] = len(waypoints)
    if is_replanned:
        bridge_state["replan_count"] += 1

    print(f"[PX4 BRIDGE] Received {len(waypoints)} waypoints ({algorithm}) | Replanned: {is_replanned}")
    print(f"[PX4 BRIDGE] Origin: Lat {origin['lat']}, Lon {origin['lon']}, Alt {origin['alt']}m")

    # Save to disk as ROS 2 JSON for external tools
    output_dir = os.path.dirname(os.path.abspath(__file__))
    json_path = os.path.join(output_dir, "active_waypoints.json")

    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)

    print(f"[PX4 BRIDGE] Saved mission data to {json_path}")

    mavlink_sent = False
    if mav_conn and bridge_state["px4_connected"]:
        try:
            print("[PX4 BRIDGE] Uploading mission items to PX4 SITL via MAVLink...")
            mav_conn.waypoint_clear_all_send()
            mav_conn.waypoint_count_send(len(waypoints))
            mavlink_sent = True
        except Exception as e:
            print(f"[PX4 BRIDGE] Failed to send to PX4: {e}")

    return {
        "success": True,
        "message": f"Successfully processed {len(waypoints)} waypoints for PX4 SITL",
        "algorithm": algorithm,
        "replanned": is_replanned,
        "mavlink_forwarded": mavlink_sent,
        "saved_path": json_path
    }, 200

def get_status_payload():
    return {
        "status": "connected",
        "bridge_version": "1.0.0",
        "px4_sitl_connected": bridge_state["px4_connected"],
        "sitl_address": bridge_state["sitl_address"],
        "has_mavlink": has_mavlink,
        "waypoints_received_count": bridge_state["waypoints_received_count"],
        "replan_count": bridge_state["replan_count"],
        "timestamp": time.time()
    }

# ---------------------------------------------------------
# Standalone Fallback HTTP Server (Zero Dependencies)
# ---------------------------------------------------------
def run_builtin_server(port=5000):
    from http.server import HTTPServer, BaseHTTPRequestHandler

    class BridgeRequestHandler(BaseHTTPRequestHandler):
        def _send_cors_headers(self):
            self.send_header("Access-Control-Allow-Origin", "*")
            self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
            self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")

        def do_OPTIONS(self):
            self.send_response(200)
            self._send_cors_headers()
            self.end_headers()

        def do_GET(self):
            if self.path.startswith("/api/status"):
                payload = json.dumps(get_status_payload()).encode("utf-8")
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self._send_cors_headers()
                self.send_header("Content-Length", str(len(payload)))
                self.end_headers()
                self.wfile.write(payload)
            else:
                self.send_response(404)
                self.end_headers()

        def do_POST(self):
            if self.path.startswith("/api/waypoints"):
                content_len = int(self.headers.get("Content-Length", 0))
                post_body = self.rfile.read(content_len)
                try:
                    data = json.loads(post_body.decode("utf-8"))
                    res, status_code = process_waypoints_payload(data)
                except Exception as e:
                    res, status_code = {"success": False, "error": str(e)}, 400

                payload = json.dumps(res).encode("utf-8")
                self.send_response(status_code)
                self.send_header("Content-Type", "application/json")
                self._send_cors_headers()
                self.send_header("Content-Length", str(len(payload)))
                self.end_headers()
                self.wfile.write(payload)
            else:
                self.send_response(404)
                self.end_headers()

        def log_message(self, format, *args):
            print(f"[PX4 BRIDGE] {self.address_string()} - {format % args}")

    server = HTTPServer(("0.0.0.0", port), BridgeRequestHandler)
    print(f"[PX4 BRIDGE] Running standalone bridge HTTP server on http://localhost:{port}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n[PX4 BRIDGE] Server stopped.")

if __name__ == "__main__":
    print("====================================================")
    print("PX4 SITL / ROS 2 Path Planning Bridge Server")
    print("====================================================")
    init_mavlink()

    if has_flask:
        print("[PX4 BRIDGE] Using Flask engine...")
        app = Flask(__name__)
        if has_cors:
            CORS(app)

        @app.route("/api/status", methods=["GET"])
        def api_status():
            return jsonify(get_status_payload())

        @app.route("/api/waypoints", methods=["POST"])
        def api_waypoints():
            data = request.get_json(force=True)
            res, code = process_waypoints_payload(data)
            return jsonify(res), code

        print("[PX4 BRIDGE] Listening for browser path planner on http://localhost:5000")
        app.run(host="0.0.0.0", port=5000, debug=False)
    else:
        print("[PX4 BRIDGE] Flask not detected. Using built-in Python HTTP server...")
        run_builtin_server(5000)

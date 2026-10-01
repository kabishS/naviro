# Rover Path Planning — Backend Layer

A modular **Node.js + Express + WebSocket** communication server designed as an intermediary bridge between the Three.js frontend simulation and future **ROS 2 / PX4 SITL / Gazebo** robotics stacks.

---

## 1. Purpose of the Backend Layer

In the existing project architecture, the **Three.js frontend** is responsible for:
- 3D Terrain rendering (Flat Grid & Procedural Uneven landscape)
- Autonomous pathfinding algorithms (A* & Dijkstra)
- Rover kinematics and animation
- User interactions, obstacle placement, and telemetry visualization

The **Node.js backend** acts as the server-side communication backbone responsible for:
- Receiving and validating calculated path waypoints from the frontend
- Managing active mission state and lifecycle in memory
- Tracking real-time rover telemetry and kinematics
- Logging dynamic obstacle replanning events
- Providing real-time WebSocket event broadcasting to connected observers
- Providing an architectural bridge interface ready for **PX4 Autopilot SITL** and **ROS 2** nodes without faking data

```
┌─────────────────────────────────┐
│     Three.js Web Frontend       │
│  (A*, Dijkstra, 3D Simulation)  │
└────────────────┬────────────────┘
                 │ REST / WebSockets
                 ▼
┌─────────────────────────────────┐
│     Node.js Backend Server      │
│  (Mission & Waypoint Services)  │
└────────────────┬────────────────┘
                 │ PX4 Bridge Adapter
                 ▼
┌─────────────────────────────────┐
│     ROS 2 / MAVROS Bridge       │
│   (Future ROS 2 Node Layer)     │
└────────────────┬────────────────┘
                 │ MAVLink UDP 14540
                 ▼
┌─────────────────────────────────┐
│      PX4 Autopilot SITL         │
│       Gazebo Simulator          │
└─────────────────────────────────┘
```

---

## 2. Installation & Quick Start

### Prerequisites
- Node.js (v18+ recommended, v24 verified)
- npm (v9+)

### Installation
From the project root:
```bash
cd backend
npm install
```

### Running the Server
```bash
# Start standard server on port 3000
npm start

# Run with auto-reload (development mode)
npm run dev

# Run automated API & WebSocket test suite
npm test
```

When started, the console will display:
```
====================================================
🚀 Rover Navigation Backend running on port 3000
📡 REST API:   http://localhost:3000/api
🔌 WebSockets: ws://localhost:3000/ws
🛰️  PX4 Bridge: Initialized (Status: DISCONNECTED)
====================================================
```

---

## 3. Configuration (`.env`)

A template configuration is provided in `.env.example`. Copy to `.env` if custom parameters are needed:

```bash
cp .env.example .env
```

| Variable | Default | Description |
| :--- | :--- | :--- |
| `PORT` | `3000` | HTTP and WebSocket port |
| `FRONTEND_URL` | `*` | Allowed CORS origins (e.g. `http://localhost:8080`) |
| `PX4_ENABLED` | `false` | Enable or disable PX4 autopilot bridge |
| `PX4_CONNECTION_URL` | `udp://127.0.0.1:14540` | PX4 SITL MAVLink UDP listening endpoint |
| `ROS2_ENABLED` | `false` | Enable or disable ROS 2 DDS integration |

---

## 4. REST API Endpoint Reference

### Mission API (`/api/mission`)

#### `POST /api/mission/start`
Initializes and starts a new mission.
- **Request Body**:
  ```json
  {
    "start": { "x": 2, "y": 0, "z": 2 },
    "destination": { "x": 22, "y": 1.2, "z": 22 },
    "algorithm": "A*",
    "routeOptimization": "best",
    "topography": "ridges"
  }
  ```
- **Response**: `200 OK`
  ```json
  {
    "success": true,
    "message": "Mission initialized and started",
    "mission": {
      "missionId": "mission_1727659200000",
      "status": "ACTIVE",
      "algorithm": "A*",
      "routeOptimization": "best",
      "distance": 0,
      "steps": 0,
      "startTime": "2026-09-30T01:00:00.000Z"
    }
  }
  ```

#### `GET /api/mission/status`
Retrieves live mission state and metrics.
- **Response**: `200 OK`
  ```json
  {
    "missionId": "mission_1727659200000",
    "status": "ACTIVE",
    "algorithm": "A*",
    "distance": 18.4,
    "steps": 12,
    "fuelConsumed": 21.6,
    "replanningCount": 1,
    "currentPosition": { "x": 10.2, "y": 0.8, "z": 11.4 }
  }
  ```

#### `POST /api/mission/telemetry`
Throttled real-time telemetry stream from rover kinematics.
- **Request Body**:
  ```json
  {
    "position": { "x": 10.2, "y": 0.8, "z": 11.4 },
    "orientation": { "yaw": 1.57, "pitch": -0.12, "roll": 0.04 },
    "distance": 18.4,
    "fuelConsumed": 21.6,
    "steps": 12
  }
  ```

#### `POST /api/mission/complete`
Marks the mission as successfully completed.
- **Request Body**: `{ "metrics": { "distance": 42.5, "fuelConsumed": 48.2, "steps": 24 } }`

#### `POST /api/mission/reset`
Resets the mission and in-memory telemetry back to `IDLE`.

---

### Waypoint API (`/api/waypoints`)

#### `POST /api/waypoints`
Receives calculated path waypoints from the frontend pathfinding engine.
- **Request Body**:
  ```json
  {
    "algorithm": "A*",
    "routeOptimization": "best",
    "waypoints": [
      { "x": 2.0, "y": 0.0, "z": 2.0 },
      { "x": 4.0, "y": 0.3, "z": 3.0 },
      { "x": 22.0, "y": 1.2, "z": 22.0 }
    ]
  }
  ```

#### `GET /api/waypoints`
Returns the active waypoint array and metadata.

#### `DELETE /api/waypoints`
Clears the active waypoint list from memory.

#### `POST /api/waypoints/replan`
Triggered during dynamic replanning when a newly injected or discovered obstacle blocks the rover's path.
- **Request Body**:
  ```json
  {
    "reason": "Dynamic obstacle detected at [8, 12]",
    "replanningCount": 2,
    "waypoints": [...]
  }
  ```

---

### PX4 & ROS 2 API (`/api/px4`)

#### `GET /api/px4/status`
Returns true autopilot connection status without fabricating fake telemetry.
- **Response**: `200 OK`
  ```json
  {
    "connected": false,
    "status": "PX4_DISCONNECTED",
    "sitlAddress": "udp://127.0.0.1:14540",
    "ros2Enabled": false,
    "px4Enabled": false,
    "activeMissionWaypoints": 0
  }
  ```

#### `POST /api/px4/connect`
Attempts to establish connection with PX4 SITL over UDP or ROS 2 bridge.

#### `POST /api/px4/disconnect`
Terminates bridge connection.

#### `POST /api/px4/mission`
Forwards waypoints to autopilot. If PX4 SITL is not connected, safely returns:
```json
{
  "success": false,
  "connected": false,
  "status": "PX4_DISCONNECTED",
  "message": "PX4 SITL is not connected. Start SITL and connect bridge before exporting missions."
}
```

---

## 5. WebSocket Real-Time Events (`/ws`)

Connect via WebSocket to: `ws://localhost:3000/ws`.

The server broadcasts JSON events to all connected clients:

| Event Type | Description | Sample Payload |
| :--- | :--- | :--- |
| `connection_established` | Sent upon initial client handshake | `{ "message": "Connected to Rover Navigation Backend" }` |
| `mission_started` | Emitted when mission starts | `{ "mission": { "missionId": "...", "status": "ACTIVE" } }` |
| `rover_position` | High-frequency rover position update | `{ "position": { "x": 5, "y": 0, "z": 8 }, "metrics": {...} }` |
| `waypoint_updated` | New path calculated | `{ "count": 28, "algorithm": "A*" }` |
| `replanning_completed` | Dynamic obstacle avoided | `{ "replanningCount": 1, "waypointCount": 26, "reason": "..." }` |
| `mission_completed` | Rover reached target destination | `{ "summary": { "status": "COMPLETED", "fuel": 34.2 } }` |
| `px4_status` | Autopilot connection state changed | `{ "px4": { "connected": false, "status": "PX4_DISCONNECTED" } }` |

---

## 6. Frontend Integration & Offline Fallback Mechanics

The frontend simulation is designed with **zero-dependency graceful degradation**:
1. When the backend is **online (`http://localhost:3000`)**:
   - The frontend automatically establishes a WebSocket connection and pushes waypoints, mission state, and kinematics.
   - The top header status indicator updates to: `Backend: ● Online`.
2. When the backend is **offline or not running**:
   - The frontend catches network failures silently.
   - The status indicator displays: `Backend: ● Offline`.
   - **100% of 3D simulation features (A*, Dijkstra, terrain, rover animation, fuel metrics) continue executing without error**.

---

## 7. PX4 & ROS 2 Architecture

### Optional Nature of PX4
PX4 SITL and ROS 2 are **strictly optional**. The full web simulation runs out-of-the-box with Node.js and a web browser alone.

### How PX4 Integration Operates
When PX4 SITL is enabled (`PX4_ENABLED=true`):
1. **Frontend**: Calculates fuel-optimal 3D path coordinates (`x, y, z`).
2. **Backend**: Converts local coordinates to WGS-84 GPS coordinates (Latitude, Longitude, Altitude).
3. **Bridge Layer**: Forwards `MISSION_ITEM_INT` messages over MAVLink UDP (`127.0.0.1:14540`) or publishes to ROS 2 topic `/mavros/mission/waypoints`.
4. **SITL / Gazebo**: PX4 autonomous rover model drives in Gazebo physics engine.

If PX4 is not running, the bridge truthfully reports `PX4_DISCONNECTED`.

# PX4 Autopilot & ROS 2 Integration Architecture

This document describes the optional **PX4 Software-In-The-Loop (SITL)** and **ROS 2** integration layer for the **"Rover Path Planning in Simulated Terrain"** prototype.

---

## 1. What PX4 Is
**PX4** is an industry-standard, open-source flight and vehicle control software (autopilot) used for autonomous drones, ground rovers, submersibles, and robotic vehicles. It manages:
- **Low-level vehicle state estimation** (EKF2 fusing IMU, GPS, wheel odometry, and magnetometer).
- **Control loops** (attitude, position, and rate controllers for skid-steer and Ackermann ground rovers).
- **Autonomous mission execution** (waypoint following, geofencing, fail-safe return-to-launch).
- **Vehicle communication** via the MAVLink protocol and micro-XRCE-DDS (ROS 2 native bridge).

---

## 2. What PX4 SITL Means
**SITL** stands for **Software-In-The-Loop**. 
In standard hardware deployment, the PX4 autopilot binary runs on an embedded flight controller microcontroller (such as a Pixhawk). 
In SITL mode, the exact same C++ autopilot codebase runs natively as a user-space process on a Linux/macOS/Windows host machine. It receives simulated sensor data from a physics engine (Gazebo) and outputs simulated motor commands back to the simulator, allowing full testing of autonomous behavior without physical hardware.

---

## 3. What ROS 2 Does
**ROS 2 (Robot Operating System 2)** is a modular robotic middleware. In the PX4 ecosystem:
- PX4 natively communicates with ROS 2 via **micro-XRCE-DDS** Client/Agent architecture.
- PX4 uORB internal topics (such as `TrajectorySetpoint`, `VehicleCommand`, `VehicleGlobalPosition`, `VehicleStatus`) are mapped directly to standard ROS 2 messages (`px4_msgs`).
- High-level autonomy nodes (such as our path planner) can send position and velocity setpoints to PX4 without dealing with raw serial MAVLink packets.

---

## 4. What Gazebo Does
**Gazebo** is a 3D multi-body physics and sensor simulation environment:
- It simulates the rigid-body dynamics, terrain collision, motor torque, wheel friction, and gravity acting on the rover.
- It simulates sensors (GPS, IMUs, LIDAR, depth cameras) and feeds realistic measurement noise to PX4's EKF2 state estimator.
- When PX4 computes steering and throttle commands, Gazebo renders the rover physically driving across the 3D terrain.

---

## 5. How the Existing Path Planner Connects to PX4
The browser prototype remains the **primary interactive interface**. The connection is mediated through an external decoupled bridge:

```
┌────────────────────────────────┐
│   Browser Simulation UI        │  (HTML5 / CSS / Three.js)
│   - A* & Dijkstra Planner      │
└───────────────┬────────────────┘
                │ HTTP POST /api/waypoints
                ▼
┌────────────────────────────────┐
│   PX4 Integration Bridge       │  (px4_bridge/bridge_server.py)
│   - Coordinate Transformations │
└───────────────┬────────────────┘
                │ MAVLink (UDP 14540) OR ROS 2 (micro-XRCE-DDS)
                ▼
┌────────────────────────────────┐
│   PX4 Autopilot SITL           │  (PX4 Firmware running locally)
│   - Navigator / Offboard Mode  │
└───────────────┬────────────────┘
                │ Actuator Control & Sensor Feedback
                ▼
┌────────────────────────────────┐
│   Gazebo Simulation            │  (Physics & 3D Rover Model)
└────────────────────────────────┘
```

The browser application does not directly touch PX4 hardware or network sockets; it communicates via standard REST/JSON with the decoupled bridge.

---

## 6. How A* / Dijkstra Paths Become Waypoints

### Coordinate Frame Transformation
The browser simulation operates in a **Right-Handed 3D World Frame** centered at $(0, 0, 0)$:
- $X$: East / Lateral axis (meters)
- $Y$: Upward Elevation axis (meters)
- $Z$: South / Longitudinal axis (meters)

PX4 uses standard aviation / robotics **Local NED (North-East-Down)** and **WGS-84 Geodetic (Latitude, Longitude, Altitude)** frames.

#### Step 1: 3D Grid to Local NED
For each waypoint $(x, y, z)$ on the calculated path:
$$\text{North} = -z$$
$$\text{East} = x$$
$$\text{Down} = -y$$

#### Step 2: Local NED to WGS-84 GPS
Using a Tangent Plane (Equirectangular approximation) around reference origin $(\text{Lat}_0, \text{Lon}_0, \text{Alt}_0)$ (Default: Zurich Gazebo Home $47.397742^\circ\text{N}, 8.545594^\circ\text{E}, 488.0\,\text{m}$):
$$\Delta\text{Lat} = \frac{\text{North}}{R_{\text{earth}}} \times \left(\frac{180}{\pi}\right)$$
$$\Delta\text{Lon} = \frac{\text{East}}{R_{\text{earth}} \cdot \cos(\text{Lat}_0 \cdot \frac{\pi}{180})} \times \left(\frac{180}{\pi}\right)$$
$$\text{Lat}_i = \text{Lat}_0 + \Delta\text{Lat}$$
$$\text{Lon}_i = \text{Lon}_0 + \Delta\text{Lon}$$
$$\text{Alt}_i = \text{Alt}_0 + y_i$$

#### Step 3: Heading / Yaw Calculation
For consecutive waypoints $i$ and $i+1$:
$$\text{Heading} = \text{atan2}(\Delta\text{East}, \Delta\text{North})$$

---

## 7. How Waypoints Reach PX4 Through ROS 2
When using the ROS 2 pipeline:
1. The bridge server translates the JSON waypoint list into ROS 2 `geometry_msgs/msg/PoseArray` or `nav_msgs/msg/Path`.
2. For mission upload: `px4_msgs/msg/Mission` items are published to the micro-XRCE-DDS agent.
3. For real-time offboard trajectory tracking:
   ```python
   trajectory_msg = TrajectorySetpoint()
   trajectory_msg.position = [wp.north, wp.east, wp.down]
   trajectory_msg.yaw = wp.heading
   publisher.publish(trajectory_msg)
   ```

---

## 8. How PX4 Executes the Simulated Mission
1. **Arming & Mode Switch**:
   PX4 is commanded into **AUTO.MISSION** mode (for autonomous plan execution) or **OFFBOARD** mode (for active waypoint streaming).
2. **Path Tracking**:
   The rover's L1 / pure-pursuit guidance logic generates steering angle commands and target wheel speeds to track each waypoint.
3. **Acceptance Radius**:
   When the rover comes within `acceptance_radius` ($1.0\,\text{m}$) of waypoint $k$, PX4 advances to waypoint $k+1$.
4. **Mission Completion**:
   Upon reaching the final destination waypoint, the rover brakes to a complete halt and enters `HOLD` mode.

---

## 9. How Dynamic Replanning Updates the Mission
When the browser simulation detects a dynamic obstacle on the rover's active path:
1. The browser's A* / Dijkstra engine computes an alternate route from the rover's current coordinates to the destination.
2. The Waypoint Converter converts the new route into an updated set of NED / GPS waypoints.
3. If the PX4 Bridge is connected, an HTTP POST `/api/waypoints` payload with `"isReplanned": true` is dispatched automatically.
4. The bridge clears previous mission items via MAVLink (`MISSION_CLEAR_ALL`) or pushes updated `TrajectorySetpoint` stream in ROS 2.
5. PX4 immediately steers the simulated rover around the obstacle in Gazebo without requiring vehicle reboot.

---

## 10. How to Run the PX4 Integration Separately

### Prerequisites
- Ubuntu 22.04 LTS (Native or via WSL2 on Windows)
- Python 3.8+ with `pip install -r px4_bridge/requirements.txt`
- (Optional for full SITL) PX4-Autopilot repository with Gazebo Harmonic or Classic

### Step-by-Step Execution Guide

#### Step 1: Start the Browser Simulation
In Windows, run:
```bash
python -m http.server 8080
```
Open **`http://localhost:8080`**.

#### Step 2: Start the Bridge Server
Open a terminal in the project directory:
```bash
cd px4_bridge
pip install -r requirements.txt
python bridge_server.py
```
*Note: The browser UI will immediately detect the bridge and the status badge will update from `● PX4 Disconnected` to `● PX4 Connected`.*

#### Step 3: (Optional) Launch PX4 SITL & Gazebo Rover
In your Ubuntu / WSL2 environment:
```bash
git clone https://github.com/PX4/PX4-Autopilot.git --recursive
cd PX4-Autopilot
make px4_sitl gz_rover
```

#### Step 4: Export Waypoints or Run Live Integration
1. On the web application, select your terrain and click **Plan Path**.
2. Click **"Export PX4 Waypoints"** to inspect or download:
   - **`mission.plan`**: Load directly in **QGroundControl** via `Plan View -> File -> Open`.
   - **`mission.waypoints`**: Upload via MAVLink CLI or Mission Planner.
   - **`waypoints.json`**: For ROS 2 path follower nodes.
3. Click **"Send to PX4 SITL Bridge"** to stream the route directly into the active simulation.
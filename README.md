# NAVIRO - Intelligent Navigation for Autonomous Rovers

> **Local Project Documentation**  
> **Application Name**: NAVIRO  
> **Subtitle**: Intelligent Navigation for Autonomous Rovers  

---

## 📌 Project Overview

**NAVIRO** is an intelligent rover path planning and simulated terrain navigation system. It combines an **AI Neural Risk Prediction Engine** with a **Risk-Weighted A* Pathfinding Algorithm** to find safe and optimal routes across hazardous terrains.

Live link:   https://naviro-b0kt.onrender.com/

---

## 🛠️ Features & Functional Requirements

### 1. Grid Map & Terrain System
- Interactive grid map ($15 \times 15$, $20 \times 20$, $25 \times 25$) with selectable start and destination nodes.
- **6 Distinct Cell Types**:
  - ⬜ **Free Space** (`#1E293B` Dark Slate): Clear ground | Base Cost: `1.0` | Risk: 🟢 Safe
  - 🏜️ **Desert Sand** (`#E0C068` Sandle): Soft sand dunes | Base Cost: `2.0` | Risk: 🟢 Safe / 🟡 Moderate
  - 🪨 **Rocky Terrain** (`#808080` Grey): Loose gravel & rocks | Base Cost: `5.0` | Risk: 🟡 Moderate
  - 🌲 **Dense Forest** (`#1E4620` Dark Green): Heavy vegetation | Base Cost: `3.5` | Risk: 🟡 Moderate
  - ⛰️ **Mountain Peak** (`#8B4513` Brown): Steep slope | Base Cost: `8.0` | Risk: 🔴 High
  - ⛔ **Restricted Area** (`#E63946` Red): Impassable zone | Base Cost: `9999` | Risk: 🔴 High

---

### 2. AI Risk Prediction Pipeline

$$\text{Terrain Data} \longrightarrow \text{AI Risk Prediction} \longrightarrow \text{Risk Map} \longrightarrow \text{A* Path Planning} \longrightarrow \text{Safe + Efficient Route}$$

- Analyzes cell terrain friction and 3x3 surrounding hazard proximity.
- Predicts dynamic risk level:
  - 🟢 **Safe**
  - 🟡 **Moderate risk**
  - 🔴 **High risk**
- **AI Risk Heatmap**: Visual overlay toggle to inspect risk predictions live across the map.

---

### 3. Obstacle Configuration & Random Generator
- **Manual Paint/Erase**: Interactive brush tools for placing obstacles, Start node (🚀), and End node (🎯).
- **Random Obstacles Button**: Generates a balanced ~22–25% obstacle coverage ("it show more i need less not too less").

---

### 4. A* Algorithm & Real-Time Metrics
- **Risk-Weighted A\***: Integrates AI risk penalties into traversal cost $g(n)$, steering the rover away from dangerous mountain/rocky terrain when safer paths are open.
- **Metrics Telemetry**:
  - 📏 **Distance**: Path length in cells (`cell`)
  - 👣 **Step**: Nodes evaluated (`steps`)
  - ⏱️ **Time**: Execution time (`second`)
  - 🚦 **Status**: `Path Found` / `No Path`
  - ⚡ **Cost Effectiveness**: Total path energy cost, safety score %, and 🟢/🟡/🔴 node counts.

---

### 5. Line Draw Animation & Rover Movement
- **Line Draw Animation**: Glowing green line (`#00FF66`) animates segment-by-segment from start to destination.
- **Rover Traversal**: Animated vehicle icon (🤖) traversing along path nodes.
- **Speed Controls**:
  - 🐢 **Slow** (400 ms/step)
  - 🚶 **Normal** (200 ms/step)
  - ⚡ **Fast** (80 ms/step)
  - 🚀 **Turbo** (25 ms/step)

---

### 6. Dynamic Re-Planning (Real-time)
- Re-runs A* search automatically whenever obstacles or start/end positions change.

---

## 📊 Terrain Cost Matrix

| Terrain | Color | Base Cost | Risk Level | Description |
| :--- | :--- | :---: | :---: | :--- |
| **Free Space** | Dark Slate (`#1E293B`) | `1.0` | 🟢 Safe | Clear terrain, max speed |
| **Desert** | Sandle (`#E0C068`) | `2.0` | 🟢 Safe | Sandy dunes, mild drag |
| **Forest** | Dark Green (`#1E4620`) | `3.5` | 🟡 Moderate | Tree roots, limited traction |
| **Rocky** | Grey (`#808080`) | `5.0` | 🟡 Moderate | Loose gravel, vibration hazard |
| **Mountain** | Brown (`#8B4513`) | `8.0` | 🔴 High | Steep cliffs, rollover hazard |
| **Restricted** | Red (`#E63946`) | Prohibited | 🔴 High | Hazardous / impassable zone |

---

## 📂 Project Directory Structure

```
Naviro/
├── index.html            # Main HTML Dashboard & Canvas Interface
├── server.js             # Entry point loading backend server
├── run.bat               # Windows execution script
├── README.md             # Local project README documentation
├── css/
│   └── style.css         # Styling & tactical grid themes
├── js/
│   ├── main.js           # Main initializer
│   ├── app.js            # Master application state
│   ├── simulation.js     # Simulation step loop
│   ├── pathfinding.js    # Risk-weighted A* algorithm
│   ├── priorityQueue.js  # Min-Priority Queue implementation
│   ├── grid.js           # Grid matrix state & Canvas drawing
│   ├── terrain.js        # Terrain specs & AI risk model
│   ├── rover.js          # Rover vehicle position & animation
│   ├── ui.js             # Event handlers & telemetry UI
│   └── constants.js      # App configuration constants
├── backend/
│   ├── server.js         # Node.js + Express backend (Port 3000)
│   ├── package.json      # Express, WebSocket, CORS dependencies
│   ├── routes/           # REST endpoints
│   ├── controllers/      # API logic handlers
│   └── websocket/        # Telemetry WebSocket server (ws://localhost:3000/ws)
└── px4_bridge/
    ├── bridge_server.py  # Python PX4 / MAVLink bridge
    └── config.yaml       # Bridge config
```

---

## 🚀 How to Run Locally

1. **Frontend Simulation**:
   ```bash
   python -m http.server 8080
   ```
   Open browser at: `http://localhost:8080`

2. **Backend Server**:
   ```bash
   node server.js
   ```
   REST API: `http://localhost:3000/api`  
   WebSocket: `ws://localhost:3000/ws`

---

*Local documentation for NAVIRO project workspace.*

# NAVIRO - Intelligent Navigation for Autonomous Rovers

![NAVIRO Header](https://img.shields.io/badge/NAVIRO-Autonomous%20Rover%20Navigation-emerald?style=for-the-badge)
![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)
![Status](https://img.shields.io/badge/Status-Active-brightgreen?style=for-the-badge)

**NAVIRO** is an intelligent rover path planning and simulated terrain navigation system. It combines an **AI Neural Risk Analysis Engine** with a **Risk-Weighted A* Pathfinding Algorithm** to navigate complex terrains safely and efficiently.

---

## 🚀 Key Features

- **Grid Map Simulation**: Customizable grid map with interactive cell editing.
- **Dynamic Terrain Types**:
  - 🏜️ **Desert Sand** (`#E0C068` Sandle) - Soft sand drag
  - 🪨 **Rocky Terrain** (`#808080` Grey) - Loose gravel hazard
  - 🌲 **Dense Forest** (`#1E4620` Dark Green) - Restricted vegetation
  - ⛰️ **Mountain Peak** (`#8B4513` Brown) - Steep rollover risk
  - ⛔ **Restricted Zone** (`#E63946` Red) - Prohibited / impassable hazard
- **AI Risk Engine**: Analyzes terrain cell data and surrounding hazard proximities to classify cells into:
  - 🟢 **Safe**
  - 🟡 **Moderate Risk**
  - 🔴 **High Risk**
- **Risk-Weighted A* Path Planning**: Calculates safe + energy-efficient optimal routes.
- **Random Obstacles Generator**: Generates balanced terrain distributions (~22-25% density) ensuring paths remain navigable.
- **Line Draw & Rover Animation**: Visual segment-by-segment path line drawing (`#00FF66`) and smooth animated rover traversal with customizable speed controls.
- **Real-Time Telemetry & Metrics**: Displays distance (cells), steps evaluated, execution time (seconds), path status, safety rating %, and energy cost breakdown.

---

## 🛠️ Architecture Pipeline

```
Terrain Data ──► AI Risk Prediction ──► Risk Map ──► A* Path Planning ──► Safe + Efficient Route
```

---

## 💻 Tech Stack

- **Frontend**: HTML5, Three.js / Canvas, CSS3, JavaScript (ES6+)
- **Backend**: Node.js, Express, WebSockets (`ws`)
- **Bridge Support**: PX4 SITL / ROS 2 Python Bridge

---

## 🏁 Getting Started

### 1. Clone the Repository
```bash
git clone https://github.com/kabishS/naviro.git
cd naviro
```

### 2. Start Backend Server
```bash
cd backend
npm install
npm start
```

### 3. Start Frontend Simulation
Open `index.html` in your web browser, or serve via Python / HTTP server:
```bash
python -m http.server 8080
```
Then visit `http://localhost:8080`.

---

## 📜 License
MIT License. Created for Autonomous Rover Simulation & Research.

/**
 * Waypoint Management Service (In-Memory)
 * Stores, validates, and manages path waypoints received from the frontend pathfinding engine.
 */

class WaypointService {
  constructor() {
    this.activeWaypoints = [];
    this.algorithm = 'A*';
    this.routeOptimization = 'best';
    this.updatedAt = null;
    this.replanningHistory = [];
  }

  setWaypoints(waypoints, metadata = {}) {
    this.activeWaypoints = Array.isArray(waypoints) ? waypoints.map(wp => ({
      x: Number(wp.x) || 0,
      y: Number(wp.y) || 0,
      z: Number(wp.z) || 0,
      col: typeof wp.col === 'number' ? wp.col : undefined,
      row: typeof wp.row === 'number' ? wp.row : undefined
    })) : [];

    this.algorithm = metadata.algorithm || this.algorithm;
    this.routeOptimization = metadata.routeOptimization || this.routeOptimization;
    this.updatedAt = new Date().toISOString();

    return {
      success: true,
      count: this.activeWaypoints.length,
      algorithm: this.algorithm,
      routeOptimization: this.routeOptimization,
      updatedAt: this.updatedAt,
      waypoints: this.activeWaypoints
    };
  }

  getWaypoints() {
    return {
      count: this.activeWaypoints.length,
      algorithm: this.algorithm,
      routeOptimization: this.routeOptimization,
      updatedAt: this.updatedAt,
      waypoints: this.activeWaypoints
    };
  }

  clearWaypoints() {
    const previousCount = this.activeWaypoints.length;
    this.activeWaypoints = [];
    this.updatedAt = new Date().toISOString();
    return {
      success: true,
      message: 'Waypoints cleared',
      clearedCount: previousCount,
      count: 0
    };
  }

  replanWaypoints(data) {
    const previousCount = this.activeWaypoints.length;
    const newWaypoints = Array.isArray(data.waypoints) ? data.waypoints.map(wp => ({
      x: Number(wp.x) || 0,
      y: Number(wp.y) || 0,
      z: Number(wp.z) || 0,
      col: typeof wp.col === 'number' ? wp.col : undefined,
      row: typeof wp.row === 'number' ? wp.row : undefined
    })) : [];

    this.activeWaypoints = newWaypoints;
    this.updatedAt = new Date().toISOString();

    const historyEntry = {
      timestamp: this.updatedAt,
      replanningCount: Number(data.replanningCount) || (this.replanningHistory.length + 1),
      reason: data.reason || 'Dynamic obstacle detected',
      previousCount,
      newCount: newWaypoints.length
    };

    this.replanningHistory.push(historyEntry);
    if (this.replanningHistory.length > 50) this.replanningHistory.shift();

    return {
      success: true,
      replanningCount: historyEntry.replanningCount,
      reason: historyEntry.reason,
      waypointCount: newWaypoints.length,
      history: historyEntry,
      waypoints: this.activeWaypoints
    };
  }

  getReplanningHistory() {
    return [...this.replanningHistory];
  }
}

module.exports = new WaypointService();

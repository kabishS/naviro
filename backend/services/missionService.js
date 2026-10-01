/**
 * Mission State Service (In-Memory)
 * Manages the rover's active mission lifecycle, kinematics telemetry, and execution metrics.
 */

class MissionService {
  constructor() {
    this.resetState();
    this.missionHistory = [];
  }

  resetState() {
    this.currentMission = {
      missionId: null,
      status: 'IDLE',
      algorithm: 'A*',
      routeOptimization: 'best',
      start: { x: 0, y: 0, z: 0 },
      destination: { x: 0, y: 0, z: 0 },
      currentPosition: { x: 0, y: 0, z: 0 },
      orientation: { yaw: 0, pitch: 0, roll: 0 },
      distance: 0,
      steps: 0,
      movementCost: 0,
      fuelConsumed: 0,
      elevGain: 0,
      planningTimeMs: 0,
      replanningCount: 0,
      startTime: null,
      completionTime: null,
      topography: 'ridges',
      terrainMode: 'uneven'
    };
  }

  startMission(data) {
    this.currentMission = {
      ...this.currentMission,
      missionId: `mission_${Date.now()}`,
      status: 'ACTIVE',
      start: data.start,
      destination: data.destination,
      algorithm: data.algorithm || 'A*',
      routeOptimization: data.routeOptimization || 'best',
      topography: data.topography || 'ridges',
      terrainMode: data.terrainMode || 'uneven',
      currentPosition: { ...data.start },
      distance: 0,
      steps: 0,
      movementCost: 0,
      fuelConsumed: 0,
      elevGain: 0,
      replanningCount: 0,
      startTime: new Date().toISOString(),
      completionTime: null
    };

    return { ...this.currentMission };
  }

  getStatus() {
    return { ...this.currentMission };
  }

  updateTelemetry(data) {
    if (!this.currentMission.missionId) {
      // Auto-initialize default mission if telemetry arrives before explicit start
      this.currentMission.missionId = `mission_${Date.now()}`;
      this.currentMission.status = 'ACTIVE';
      this.currentMission.startTime = new Date().toISOString();
    }

    if (data.position) {
      this.currentMission.currentPosition = { ...data.position };
    }
    if (data.orientation) {
      this.currentMission.orientation = { ...data.orientation };
    }
    if (typeof data.distance === 'number') this.currentMission.distance = data.distance;
    if (typeof data.steps === 'number') this.currentMission.steps = data.steps;
    if (typeof data.movementCost === 'number') this.currentMission.movementCost = data.movementCost;
    if (typeof data.fuelConsumed === 'number') this.currentMission.fuelConsumed = data.fuelConsumed;
    if (typeof data.elevGain === 'number') this.currentMission.elevGain = data.elevGain;
    if (typeof data.replanningCount === 'number') this.currentMission.replanningCount = data.replanningCount;
    if (data.status) this.currentMission.status = data.status;

    return { ...this.currentMission };
  }

  recordReplanning(reason = 'Dynamic obstacle detected') {
    this.currentMission.replanningCount += 1;
    this.currentMission.status = 'REPLANNING';
    return {
      replanningCount: this.currentMission.replanningCount,
      reason,
      timestamp: new Date().toISOString()
    };
  }

  completeMission(metrics = {}) {
    this.currentMission.status = 'COMPLETED';
    this.currentMission.completionTime = new Date().toISOString();

    if (typeof metrics.distance === 'number') this.currentMission.distance = metrics.distance;
    if (typeof metrics.fuelConsumed === 'number') this.currentMission.fuelConsumed = metrics.fuelConsumed;
    if (typeof metrics.steps === 'number') this.currentMission.steps = metrics.steps;
    if (typeof metrics.movementCost === 'number') this.currentMission.movementCost = metrics.movementCost;

    const summary = { ...this.currentMission };
    this.missionHistory.push(summary);
    if (this.missionHistory.length > 50) this.missionHistory.shift();

    return summary;
  }

  failMission(reason = 'Route blocked or navigation failed') {
    this.currentMission.status = 'FAILED';
    this.currentMission.failureReason = reason;
    this.currentMission.completionTime = new Date().toISOString();
    return { ...this.currentMission };
  }

  resetMission() {
    this.resetState();
    return { status: 'IDLE', message: 'Mission reset successfully' };
  }
}

module.exports = new MissionService();

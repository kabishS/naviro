/**
 * PX4 Service
 * Service layer coordinating PX4 bridge operations and status reporting.
 */

const px4Bridge = require('../px4/px4Bridge');

class PX4Service {
  constructor() {
    this.bridge = px4Bridge;
  }

  getStatus() {
    return this.bridge.getPX4Status();
  }

  async connect() {
    return await this.bridge.connectToPX4();
  }

  async disconnect() {
    return await this.bridge.disconnectFromPX4();
  }

  async forwardMission(waypoints, algorithm) {
    if (!Array.isArray(waypoints) || waypoints.length === 0) {
      return {
        success: false,
        message: 'No waypoints provided to forward to PX4.'
      };
    }
    return await this.bridge.sendWaypointsToPX4(waypoints);
  }

  async forwardReplan(waypoints) {
    return await this.bridge.updatePX4Mission(waypoints);
  }
}

module.exports = new PX4Service();

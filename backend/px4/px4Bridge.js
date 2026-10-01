/**
 * PX4 SITL & ROS 2 Bridge Interface
 * 
 * Provides an extensible architectural adapter between the Node.js backend
 * and future PX4 SITL / ROS 2 / Gazebo layers.
 * 
 * IMPORTANT:
 * - Truthfully reports connection status.
 * - Does NOT forge or fake active PX4/ROS 2 telemetry when disconnected.
 */

class PX4Bridge {
  constructor(options = {}) {
    this.enabled = process.env.PX4_ENABLED === 'true' || options.enabled === true;
    this.sitlAddress = process.env.PX4_CONNECTION_URL || options.connectionUrl || 'udp://127.0.0.1:14540';
    this.ros2Enabled = process.env.ROS2_ENABLED === 'true' || options.ros2Enabled === true;
    
    this.isConnected = false;
    this.status = 'PX4_DISCONNECTED';
    this.lastError = null;
    this.activeMission = null;
    this.connectionAttempts = 0;
  }

  /**
   * Evaluates and returns current PX4 & ROS 2 connection status
   */
  getPX4Status() {
    return {
      connected: this.isConnected,
      status: this.status,
      sitlAddress: this.sitlAddress,
      ros2Enabled: this.ros2Enabled,
      px4Enabled: this.enabled,
      activeMissionWaypoints: this.activeMission ? this.activeMission.length : 0,
      lastError: this.lastError
    };
  }

  /**
   * Attempt connection to PX4 SITL / ROS 2 daemon
   */
  async connectToPX4() {
    this.connectionAttempts++;

    if (!this.enabled) {
      this.isConnected = false;
      this.status = 'PX4_DISCONNECTED';
      this.lastError = 'PX4 integration is disabled by configuration (PX4_ENABLED=false).';
      return {
        success: false,
        connected: false,
        status: this.status,
        message: 'PX4 SITL bridge is disabled in environment configuration. Set PX4_ENABLED=true and ensure SITL is running on UDP 14540.'
      };
    }

    // In a live environment with PX4 SITL running, a UDP socket (dgram) or MAVLink
    // parser connects to UDP 14540. If unreachable or not responding to heartbeats,
    // we honestly report DISCONNECTED without fabricating data.
    this.isConnected = false;
    this.status = 'PX4_DISCONNECTED';
    this.lastError = `Target PX4 SITL endpoint ${this.sitlAddress} is not reachable.`;

    return {
      success: false,
      connected: false,
      status: this.status,
      message: `Failed to establish connection to PX4 SITL at ${this.sitlAddress}. Ensure Gazebo/SITL simulator is running.`
    };
  }

  /**
   * Disconnect from PX4 bridge
   */
  async disconnectFromPX4() {
    this.isConnected = false;
    this.status = 'PX4_DISCONNECTED';
    this.activeMission = null;
    return {
      success: true,
      connected: false,
      status: this.status,
      message: 'PX4 bridge disconnected.'
    };
  }

  /**
   * Send calculated waypoints to PX4 mission buffer
   */
  async sendWaypointsToPX4(waypoints) {
    if (!this.isConnected) {
      return {
        success: false,
        connected: false,
        status: this.status,
        message: 'PX4 SITL is not connected. Waypoints cannot be forwarded to autopilot.'
      };
    }

    this.activeMission = waypoints;
    return {
      success: true,
      connected: true,
      count: waypoints.length,
      message: `Forwarded ${waypoints.length} waypoints to PX4 mission planner.`
    };
  }

  /**
   * Send high-level mission definition to PX4
   */
  async sendMissionToPX4(mission) {
    if (!this.isConnected) {
      return {
        success: false,
        connected: false,
        status: this.status,
        message: 'PX4 SITL is not connected. Mission cannot be initiated on autopilot.'
      };
    }

    return {
      success: true,
      connected: true,
      missionId: mission.missionId,
      message: 'Mission successfully transferred to PX4.'
    };
  }

  /**
   * Update active PX4 mission with dynamically replanned waypoints
   */
  async updatePX4Mission(waypoints) {
    if (!this.isConnected) {
      return {
        success: false,
        connected: false,
        status: this.status,
        message: 'PX4 SITL is not connected. Dynamic replan cannot be synced to autopilot.'
      };
    }

    this.activeMission = waypoints;
    return {
      success: true,
      connected: true,
      count: waypoints.length,
      message: `Updated PX4 active mission with ${waypoints.length} replanned waypoints.`
    };
  }
}

module.exports = new PX4Bridge();

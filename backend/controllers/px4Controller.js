/**
 * PX4 Controller
 * Handles HTTP requests for PX4 SITL / ROS 2 bridge interactions.
 */

const px4Service = require('../services/px4Service');
const wsManager = require('../websocket/websocketServer');

class PX4Controller {
  getStatus(req, res) {
    try {
      const status = px4Service.getStatus();
      return res.status(200).json(status);
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  async connect(req, res) {
    try {
      const result = await px4Service.connect();
      wsManager.broadcastPX4Status(px4Service.getStatus());
      const statusCode = result.connected ? 200 : 503;
      return res.status(statusCode).json(result);
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  async disconnect(req, res) {
    try {
      const result = await px4Service.disconnect();
      wsManager.broadcastPX4Status(px4Service.getStatus());
      return res.status(200).json(result);
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  async sendMission(req, res) {
    try {
      const { waypoints, algorithm } = req.body || {};
      const status = px4Service.getStatus();

      if (!status.connected) {
        return res.status(200).json({
          success: false,
          connected: false,
          status: status.status,
          message: 'PX4 SITL is not connected. Start SITL and connect bridge before exporting missions.'
        });
      }

      const result = await px4Service.forwardMission(waypoints, algorithm);
      return res.status(200).json(result);
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }
}

module.exports = new PX4Controller();

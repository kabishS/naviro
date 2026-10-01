/**
 * Waypoint Controller
 * Handles HTTP requests for waypoint management and dynamic replanning updates.
 */

const waypointService = require('../services/waypointService');
const missionService = require('../services/missionService');
const wsManager = require('../websocket/websocketServer');

class WaypointController {
  setWaypoints(req, res) {
    try {
      const { waypoints, algorithm, routeOptimization } = req.body;
      const result = waypointService.setWaypoints(waypoints, { algorithm, routeOptimization });

      wsManager.broadcastWaypointUpdated(result.count, result.waypoints, result.algorithm);

      return res.status(200).json(result);
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  getWaypoints(req, res) {
    try {
      const result = waypointService.getWaypoints();
      return res.status(200).json(result);
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  clearWaypoints(req, res) {
    try {
      const result = waypointService.clearWaypoints();
      wsManager.broadcast('waypoints_cleared', { timestamp: new Date().toISOString() });
      return res.status(200).json(result);
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  replanWaypoints(req, res) {
    try {
      const { reason, replanningCount, waypoints } = req.body;
      const result = waypointService.replanWaypoints(req.body);

      // Also update missionService replanning count and status
      missionService.recordReplanning(reason);

      wsManager.broadcastReplanningCompleted(
        result.replanningCount,
        result.waypointCount,
        reason || 'Dynamic obstacle detected'
      );

      return res.status(200).json(result);
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  getHistory(req, res) {
    try {
      const history = waypointService.getReplanningHistory();
      return res.status(200).json({ count: history.length, history });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }
}

module.exports = new WaypointController();

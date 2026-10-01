/**
 * Mission Controller
 * Handles HTTP requests for mission lifecycle, metrics, and telemetry.
 */

const missionService = require('../services/missionService');
const wsManager = require('../websocket/websocketServer');

class MissionController {
  startMission(req, res) {
    try {
      const mission = missionService.startMission(req.body);
      wsManager.broadcastMissionStarted(mission);
      return res.status(200).json({
        success: true,
        message: 'Mission initialized and started',
        mission
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  getStatus(req, res) {
    try {
      const status = missionService.getStatus();
      return res.status(200).json(status);
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  updateTelemetry(req, res) {
    try {
      const updated = missionService.updateTelemetry(req.body);
      wsManager.broadcastRoverPosition(
        updated.currentPosition,
        updated.orientation,
        {
          distance: updated.distance,
          fuelConsumed: updated.fuelConsumed,
          steps: updated.steps,
          movementCost: updated.movementCost
        }
      );
      return res.status(200).json({ success: true, mission: updated });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  completeMission(req, res) {
    try {
      const summary = missionService.completeMission(req.body.metrics || req.body);
      wsManager.broadcastMissionCompleted(summary);
      return res.status(200).json({
        success: true,
        message: 'Mission completed successfully',
        summary
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  resetMission(req, res) {
    try {
      const result = missionService.resetMission();
      wsManager.broadcast('mission_reset', { timestamp: new Date().toISOString() });
      return res.status(200).json({
        success: true,
        message: 'Mission reset successfully',
        status: result.status
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  failMission(req, res) {
    try {
      const { reason } = req.body || {};
      const failed = missionService.failMission(reason);
      wsManager.broadcastMissionFailed(reason || 'Mission failed');
      return res.status(200).json({
        success: true,
        message: 'Mission marked as failed',
        mission: failed
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }
}

module.exports = new MissionController();

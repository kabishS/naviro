/**
 * Mission Routes
 * API routes for managing mission lifecycle and telemetry.
 */

const express = require('express');
const router = express.Router();
const missionController = require('../controllers/missionController');
const validation = require('../middleware/validation');

// POST /api/mission/start
router.post('/start', validation.validateStartMission, (req, res) => missionController.startMission(req, res));

// GET /api/mission/status
router.get('/status', (req, res) => missionController.getStatus(req, res));

// POST /api/mission/telemetry
router.post('/telemetry', validation.validateTelemetry, (req, res) => missionController.updateTelemetry(req, res));

// POST /api/mission/complete
router.post('/complete', (req, res) => missionController.completeMission(req, res));

// POST /api/mission/reset
router.post('/reset', (req, res) => missionController.resetMission(req, res));

// POST /api/mission/fail
router.post('/fail', (req, res) => missionController.failMission(req, res));

module.exports = router;

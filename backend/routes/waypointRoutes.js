/**
 * Waypoint Routes
 * API routes for managing calculated path waypoints and dynamic replanning updates.
 */

const express = require('express');
const router = express.Router();
const waypointController = require('../controllers/waypointController');
const validation = require('../middleware/validation');

// POST /api/waypoints
router.post('/', validation.validateWaypoints, (req, res) => waypointController.setWaypoints(req, res));

// GET /api/waypoints
router.get('/', (req, res) => waypointController.getWaypoints(req, res));

// DELETE /api/waypoints
router.delete('/', (req, res) => waypointController.clearWaypoints(req, res));

// POST /api/waypoints/replan
router.post('/replan', validation.validateReplanning, (req, res) => waypointController.replanWaypoints(req, res));

// GET /api/waypoints/history
router.get('/history', (req, res) => waypointController.getHistory(req, res));

module.exports = router;

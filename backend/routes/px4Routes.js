/**
 * PX4 Routes
 * API routes for PX4 SITL & ROS 2 bridge interactions.
 */

const express = require('express');
const router = express.Router();
const px4Controller = require('../controllers/px4Controller');

// GET /api/px4/status
router.get('/status', (req, res) => px4Controller.getStatus(req, res));

// POST /api/px4/connect
router.post('/connect', (req, res) => px4Controller.connect(req, res));

// POST /api/px4/disconnect
router.post('/disconnect', (req, res) => px4Controller.disconnect(req, res));

// POST /api/px4/mission
router.post('/mission', (req, res) => px4Controller.sendMission(req, res));

module.exports = router;

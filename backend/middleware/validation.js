/**
 * Input Validation Middleware
 * Validates incoming JSON payloads for coordinates, algorithms, waypoints, and telemetry.
 */

function isValidCoordinate(obj) {
  return obj &&
    typeof obj === 'object' &&
    typeof obj.x === 'number' && !isNaN(obj.x) &&
    typeof obj.y === 'number' && !isNaN(obj.y) &&
    typeof obj.z === 'number' && !isNaN(obj.z);
}

const ALLOWED_ALGORITHMS = ['A*', 'Dijkstra', 'a_star', 'dijkstra'];

const validation = {
  validateStartMission(req, res, next) {
    const { start, destination, algorithm } = req.body || {};
    const errors = [];

    if (!isValidCoordinate(start)) {
      errors.push('Field "start" must be an object with numeric x, y, z properties.');
    }

    if (!isValidCoordinate(destination)) {
      errors.push('Field "destination" must be an object with numeric x, y, z properties.');
    }

    if (algorithm && !ALLOWED_ALGORITHMS.includes(algorithm)) {
      errors.push(`Field "algorithm" must be one of: ${ALLOWED_ALGORITHMS.join(', ')}`);
    }

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        details: errors
      });
    }

    next();
  },

  validateWaypoints(req, res, next) {
    const { waypoints, algorithm } = req.body || {};
    const errors = [];

    if (!Array.isArray(waypoints)) {
      errors.push('Field "waypoints" must be an array of coordinate objects.');
    } else if (waypoints.length === 0) {
      errors.push('Field "waypoints" array cannot be empty.');
    } else {
      // Validate up to first 50 points to prevent DoS while ensuring integrity
      for (let i = 0; i < Math.min(waypoints.length, 50); i++) {
        if (!isValidCoordinate(waypoints[i])) {
          errors.push(`Waypoint at index ${i} is invalid. Expected numeric x, y, z properties.`);
          break;
        }
      }
    }

    if (algorithm && !ALLOWED_ALGORITHMS.includes(algorithm)) {
      errors.push(`Field "algorithm" must be one of: ${ALLOWED_ALGORITHMS.join(', ')}`);
    }

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        details: errors
      });
    }

    next();
  },

  validateReplanning(req, res, next) {
    const { waypoints, reason, replanningCount } = req.body || {};
    const errors = [];

    if (!Array.isArray(waypoints)) {
      errors.push('Field "waypoints" must be an array of coordinate objects.');
    }

    if (replanningCount !== undefined && (typeof replanningCount !== 'number' || replanningCount < 0)) {
      errors.push('Field "replanningCount" must be a positive number.');
    }

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        details: errors
      });
    }

    next();
  },

  validateTelemetry(req, res, next) {
    const { position } = req.body || {};
    if (position && !isValidCoordinate(position)) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        details: ['Field "position" must be an object with numeric x, y, z coordinates.']
      });
    }
    next();
  }
};

module.exports = validation;

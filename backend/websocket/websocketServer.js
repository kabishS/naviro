/**
 * WebSocket Server Manager
 * Coordinates real-time bidirectional messaging between frontend, backend, and external observers.
 */

const { WebSocketServer, WebSocket } = require('ws');

class WebSocketManager {
  constructor() {
    this.wss = null;
    this.clients = new Set();
  }

  /**
   * Initializes WebSocket server attached to HTTP server instance
   * @param {import('http').Server} httpServer
   */
  init(httpServer) {
    this.wss = new WebSocketServer({ server: httpServer, path: '/ws' });

    this.wss.on('connection', (ws, req) => {
      this.clients.add(ws);
      const clientIp = req.socket.remoteAddress;
      // console.log(`[WebSocket] Client connected: ${clientIp} (Total: ${this.clients.size})`);

      // Send initial welcome & status packet
      ws.send(JSON.stringify({
        type: 'connection_established',
        timestamp: new Date().toISOString(),
        message: 'Connected to Rover Navigation Backend WebSocket Server'
      }));

      // Set up heartbeat ping/pong
      ws.isAlive = true;
      ws.on('pong', () => { ws.isAlive = true; });

      ws.on('message', (message) => {
        try {
          const parsed = JSON.parse(message);
          this.handleClientMessage(ws, parsed);
        } catch (e) {
          // ignore malformed client packets
        }
      });

      ws.on('close', () => {
        this.clients.delete(ws);
        // console.log(`[WebSocket] Client disconnected (Remaining: ${this.clients.size})`);
      });

      ws.on('error', (err) => {
        this.clients.delete(ws);
      });
    });

    // Heartbeat monitor: terminates dead sockets every 30s
    this.heartbeatInterval = setInterval(() => {
      this.clients.forEach(ws => {
        if (!ws.isAlive) return ws.terminate();
        ws.isAlive = false;
        ws.ping();
      });
    }, 30000);
  }

  handleClientMessage(ws, data) {
    if (data.type === 'ping') {
      ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
    }
  }

  /**
   * Broadcast an event payload to all currently connected clients
   * @param {string} type - Event type name
   * @param {object} payload - Event data
   */
  broadcast(type, payload = {}) {
    if (!this.wss) return;

    const message = JSON.stringify({
      type,
      timestamp: new Date().toISOString(),
      ...payload
    });

    for (const client of this.clients) {
      if (client.readyState === WebSocket.OPEN) {
        try {
          client.send(message);
        } catch (err) {
          // Client write error, will be cleaned up on close
        }
      }
    }
  }

  /**
   * Helper methods for specific domain events
   */
  broadcastMissionStarted(mission) {
    this.broadcast('mission_started', { mission });
  }

  broadcastRoverPosition(position, orientation = {}, metrics = {}) {
    this.broadcast('rover_position', { position, orientation, metrics });
  }

  broadcastWaypointUpdated(count, waypointsSample = [], algorithm = 'A*') {
    this.broadcast('waypoint_updated', {
      count,
      algorithm,
      sample: waypointsSample.slice(0, 5)
    });
  }

  broadcastObstacleDetected(col, row, type = 'rock') {
    this.broadcast('obstacle_detected', { col, row, obstacleType: type });
  }

  broadcastReplanningStarted(reason) {
    this.broadcast('replanning_started', { reason });
  }

  broadcastReplanningCompleted(replanningCount, waypointCount, reason) {
    this.broadcast('replanning_completed', { replanningCount, waypointCount, reason });
  }

  broadcastMissionCompleted(summary) {
    this.broadcast('mission_completed', { summary });
  }

  broadcastMissionFailed(reason) {
    this.broadcast('mission_failed', { reason });
  }

  broadcastPX4Status(status) {
    this.broadcast('px4_status', { px4: status });
  }
}

module.exports = new WebSocketManager();

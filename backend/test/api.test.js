/**
 * Backend API & WebSocket Test Suite
 * Validates all REST endpoints, validation rules, state transitions, and WebSocket events.
 */

const http = require('http');
const { WebSocket } = require('ws');

const TEST_PORT = 3099;
process.env.PORT = TEST_PORT;
process.env.PX4_ENABLED = 'false';

const { server } = require('../server');

function makeRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const req = http.request({
      hostname: '127.0.0.1',
      port: TEST_PORT,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {})
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, body: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });

    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function runTests() {
  console.log('\n======================================================');
  console.log('🧪 RUNNING ROVER BACKEND API & WEBSOCKET TEST SUITE');
  console.log('======================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ [PASS] ${message}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${message}`);
      failed++;
    }
  }

  try {
    // Wait for server to listen
    await new Promise(r => setTimeout(r, 600));

    // 1. Health check
    const health = await makeRequest('GET', '/api/health');
    assert(health.status === 200 && health.body.status === 'HEALTHY', 'GET /api/health returns HEALTHY');

    // 2. Initial Mission Status
    const initialStatus = await makeRequest('GET', '/api/mission/status');
    assert(initialStatus.status === 200 && initialStatus.body.status === 'IDLE', 'GET /api/mission/status returns IDLE on boot');

    // 3. Start Mission Validation
    const invalidStart = await makeRequest('POST', '/api/mission/start', { start: "bad_coord" });
    assert(invalidStart.status === 400 && invalidStart.body.success === false, 'POST /api/mission/start rejects invalid coordinates');

    // 4. Start Mission Valid
    const startRes = await makeRequest('POST', '/api/mission/start', {
      start: { x: 2, y: 0, z: 2 },
      destination: { x: 22, y: 1.2, z: 22 },
      algorithm: 'A*',
      routeOptimization: 'best'
    });
    assert(startRes.status === 200 && startRes.body.mission.status === 'ACTIVE', 'POST /api/mission/start creates ACTIVE mission');

    // 5. Send Waypoints Validation
    const invalidWaypoints = await makeRequest('POST', '/api/waypoints', { waypoints: [] });
    assert(invalidWaypoints.status === 400, 'POST /api/waypoints rejects empty array');

    // 6. Send Waypoints Valid
    const waypointsData = [
      { x: 2, y: 0, z: 2 },
      { x: 4, y: 0.2, z: 3 },
      { x: 8, y: 0.8, z: 6 },
      { x: 22, y: 1.2, z: 22 }
    ];
    const wpRes = await makeRequest('POST', '/api/waypoints', {
      algorithm: 'A*',
      waypoints: waypointsData
    });
    assert(wpRes.status === 200 && wpRes.body.count === 4, 'POST /api/waypoints stores 4 waypoints in memory');

    // 7. Get Waypoints
    const getWp = await makeRequest('GET', '/api/waypoints');
    assert(getWp.status === 200 && getWp.body.waypoints.length === 4, 'GET /api/waypoints returns stored list');

    // 8. Dynamic Replanning
    const replanWaypoints = [
      { x: 4, y: 0.2, z: 3 },
      { x: 5, y: 0.3, z: 5 },
      { x: 9, y: 0.7, z: 7 },
      { x: 22, y: 1.2, z: 22 }
    ];
    const replanRes = await makeRequest('POST', '/api/waypoints/replan', {
      reason: 'Dynamic rock obstacle detected at [4, 4]',
      replanningCount: 1,
      waypoints: replanWaypoints
    });
    assert(replanRes.status === 200 && replanRes.body.replanningCount === 1, 'POST /api/waypoints/replan logs replanning event');

    // 9. Rover Telemetry Update
    const telemRes = await makeRequest('POST', '/api/mission/telemetry', {
      position: { x: 5.2, y: 0.35, z: 5.1 },
      orientation: { yaw: 0.78, pitch: -0.1, roll: 0.05 },
      distance: 6.4,
      fuelConsumed: 7.2,
      steps: 4
    });
    assert(telemRes.status === 200 && telemRes.body.mission.distance === 6.4, 'POST /api/mission/telemetry updates rover position & fuel');

    // 10. Complete Mission
    const completeRes = await makeRequest('POST', '/api/mission/complete', {
      metrics: { distance: 38.5, fuelConsumed: 42.1, steps: 22, movementCost: 38.5 }
    });
    assert(completeRes.status === 200 && completeRes.body.summary.status === 'COMPLETED', 'POST /api/mission/complete marks COMPLETED');

    // 11. Reset Mission
    const resetRes = await makeRequest('POST', '/api/mission/reset');
    assert(resetRes.status === 200 && resetRes.body.status === 'IDLE', 'POST /api/mission/reset resets mission to IDLE');

    // 12. Clear Waypoints
    const clearWp = await makeRequest('DELETE', '/api/waypoints');
    assert(clearWp.status === 200 && clearWp.body.count === 0, 'DELETE /api/waypoints clears waypoints');

    // 13. PX4 Status (Must truthfully report disconnected)
    const px4Status = await makeRequest('GET', '/api/px4/status');
    assert(px4Status.status === 200 && px4Status.body.connected === false && px4Status.body.status === 'PX4_DISCONNECTED',
      'GET /api/px4/status truthfully returns connected=false and PX4_DISCONNECTED');

    // 14. PX4 Connect (Graceful diagnostic failure when SITL offline)
    const px4Connect = await makeRequest('POST', '/api/px4/connect');
    assert(px4Connect.body.connected === false, 'POST /api/px4/connect reports clean failure without crashing');

    // 15. PX4 Mission Export (Clean rejection when SITL offline)
    const px4Mission = await makeRequest('POST', '/api/px4/mission', { waypoints: waypointsData });
    assert(px4Mission.status === 200 && px4Mission.body.success === false,
      'POST /api/px4/mission rejects gracefully when PX4 is not connected');

    // 16. WebSocket Event Verification
    const wsPromise = new Promise((resolve, reject) => {
      const ws = new WebSocket(`ws://127.0.0.1:${TEST_PORT}/ws`);
      let receivedWelcome = false;

      ws.on('open', () => {
        // Send a ping message
        ws.send(JSON.stringify({ type: 'ping' }));
      });

      ws.on('message', (data) => {
        const msg = JSON.parse(data.toString());
        if (msg.type === 'connection_established') {
          receivedWelcome = true;
        } else if (msg.type === 'pong' && receivedWelcome) {
          ws.close();
          resolve(true);
        }
      });

      ws.on('error', reject);
      setTimeout(() => reject(new Error('WebSocket connection timed out')), 3000);
    });

    const wsOk = await wsPromise;
    assert(wsOk, 'WebSocket server accepts connection, emits connection_established, and handles ping/pong');

  } catch (err) {
    console.error('Test execution error:', err);
    failed++;
  } finally {
    server.close(() => {
      console.log('\n======================================================');
      console.log(`📊 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
      console.log('======================================================\n');
      process.exit(failed > 0 ? 1 : 0);
    });
  }
}

runTests();

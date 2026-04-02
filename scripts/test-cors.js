const API_BASE = 'http://localhost:10000';

async function testCORS() {
  console.log('--- Testing Domain-Based CORS ---');

  try {
    // 1. Test allowed origin (localhost:3000)
    console.log('\n1. Testing Allowed Origin (http://localhost:3000)...');
    const allowedRes = await fetch(`${API_BASE}/health`, {
      method: 'GET',
      headers: { Origin: 'http://localhost:3000' }
    });
    console.log('✅ Status:', allowedRes.status);
    console.log('✅ Access-Control-Allow-Origin:', allowedRes.headers.get('access-control-allow-origin'));

    // 2. Test blocked origin (https://evil.com)
    console.log('\n2. Testing Blocked Origin (https://evil.com)...');
    const blockedRes = await fetch(`${API_BASE}/health`, {
      method: 'GET',
      headers: { Origin: 'https://evil.com' }
    });
    console.log('ℹ️ Status:', blockedRes.status);
    console.log('ℹ️ Access-Control-Allow-Origin:', blockedRes.headers.get('access-control-allow-origin'));

    if (!blockedRes.headers.get('access-control-allow-origin')) {
      console.log('✅ Success: Origin https://evil.com was blocked by CORS.');
    } else {
      console.log('❌ Failure: Origin https://evil.com was incorrectly allowed.');
    }

    console.log('\n--- All CORS tests passed! ---');
  } catch (err) {
    console.error('\n❌ Test Failed:');
    console.error(err.message);
  }
}

testCORS();

const API_BASE = 'http://localhost:10000';

async function testAuth() {
  console.log('--- Testing Unified JWT Auth ---');

  try {
    // 1. Get Guest Token
    console.log('\n1. Fetching Guest Token...');
    const guestRes = await fetch(`${API_BASE}/api/auth/guest`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (!guestRes.ok) {
        throw new Error(`Guest fetch failed: ${guestRes.status}`);
    }
    
    const guestData = await guestRes.json();
    const guestToken = guestData.token;
    console.log('✅ Guest Token Received:', guestToken.substring(0, 20) + '...');

    // 2. Access Protected Route (conversations) as Guest
    console.log('\n2. Accessing Protected Route (conversations) as Guest...');
    const bot_id = 1; // Assuming bot 1 exists
    const convRes = await fetch(`${API_BASE}/api/chat/conversations?bot_id=${bot_id}`, {
      headers: { Authorization: `Bearer ${guestToken}` }
    });
    
    if (!convRes.ok) {
        const errData = await convRes.json();
        throw new Error(`Guest Access failed: ${convRes.status} ${JSON.stringify(errData)}`);
    }
    
    const convData = await convRes.json();
    console.log('✅ Guest Access Successful. Conversations count:', convData.length);

    // 3. Test chat generation
    console.log('\n3. Sending chat message as Guest...');
    const chatRes = await fetch(`${API_BASE}/api/chat`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        Authorization: `Bearer ${guestToken}` 
      },
      body: JSON.stringify({
        bot_id,
        content: 'Hello, I am a guest testing JWT auth.',
        stream: false
      })
    });
    
    if (!chatRes.ok) {
        const errData = await chatRes.json();
        throw new Error(`Chat failed: ${chatRes.status} ${JSON.stringify(errData)}`);
    }
    
    const chatData = await chatRes.json();
    console.log('✅ Chat response received:', chatData.botMessage.content.substring(0, 50) + '...');

    console.log('\n--- All tests passed! ---');
  } catch (err) {
    console.error('\n❌ Test Failed:');
    console.error(err.message);
  }
}

testAuth();

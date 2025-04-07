const fetch = require('node-fetch');
const fs = require('fs');

async function login() {
  try {
    console.log('Logging in as admin...');
    const response = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin', password: 'password123' })
    });
    
    if (!response.ok) {
      const error = await response.json();
      console.error('Login failed:', error);
      process.exit(1);
    }
    
    const cookies = response.headers.get('set-cookie');
    fs.writeFileSync('cookies.txt', cookies);
    console.log('Login successful. Auth cookie saved.');
    
    // Return the user data
    return await response.json();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

login().then(user => {
  console.log(`Logged in as ${user.name} (${user.role})`);
});

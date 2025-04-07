import fetch from 'node-fetch';
import fs from 'fs';

async function login() {
  console.log("Starting login process...");
  
  const LOGIN_URL = 'http://localhost:5000/api/auth/login';
  const CREDENTIALS = {
    username: 'admin',
    password: 'password123'
  };
  
  try {
    // Login to get session cookie
    const loginResponse = await fetch(LOGIN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(CREDENTIALS)
    });
    
    if (!loginResponse.ok) {
      throw new Error(`Login failed with status: ${loginResponse.status}`);
    }
    
    const loginData = await loginResponse.json();
    console.log('Login successful:', loginData);
    
    // Get cookies
    const cookies = loginResponse.headers.get('set-cookie');
    console.log('Cookies received:', cookies);
    
    // Save cookies to file for reuse
    fs.writeFileSync('verification-logs/cookies.txt', cookies);
    console.log('Cookies saved to verification-logs/cookies.txt');
    
    return cookies;
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
}

login().catch(console.error);
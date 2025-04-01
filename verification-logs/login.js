const axios = require('axios');
const fs = require('fs');

async function login() {
  try {
    const response = await axios.post('http://localhost:5000/api/auth/login', {
      username: 'admin',
      password: 'password123'
    });
    
    if (response.status === 200) {
      const cookies = response.headers['set-cookie'];
      if (cookies) {
        fs.writeFileSync('verification-logs/auth-cookies.txt', cookies.join('; '));
        console.log('Login successful, cookies saved');
        return cookies.join('; ');
      } else {
        console.error('No cookies in response');
        return null;
      }
    } else {
      console.error('Login failed with status:', response.status);
      return null;
    }
  } catch (error) {
    console.error('Login error:', error.message);
    return null;
  }
}

login().then(cookie => {
  if (cookie) {
    console.log('Auth cookie acquired');
  } else {
    console.log('Failed to get auth cookie');
  }
});
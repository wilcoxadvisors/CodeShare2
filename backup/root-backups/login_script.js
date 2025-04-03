const fetch = require("node-fetch");

// Login credentials
const credentials = {
  username: "admin",
  password: "password123"
};

// Function to login and save cookie to file
async function login() {
  try {
    const response = await fetch("http://localhost:5000/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(credentials),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Login failed: ${error.message}`);
    }
    
    const cookies = response.headers.get("set-cookie");
    if (!cookies) {
      throw new Error("No cookies returned from login");
    }
    
    // Save the cookie to a file
    const fs = require("fs");
    fs.writeFileSync("cookies.txt", cookies);
    
    console.log("Login successful. Auth cookie saved.");
    
    // Return the user object
    const userData = await response.json();
    return userData;
  } catch (error) {
    console.error(`Error during login: ${error.message}`);
    process.exit(1);
  }
}

// Execute login
(async () => {
  console.log(`Logging in as ${credentials.username}...`);
  const user = await login();
  console.log(`Logged in as ${user.name} (${user.role})`);
})();

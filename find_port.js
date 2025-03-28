async function findPort() {
    for (let port = 3000; port <= 4000; port++) {
      try {
        const response = await fetch(`http://localhost:${port}`);
        if (response.ok) {
          console.log(`Found server on port ${port}`);
          return;
        }
      } catch (e) {
        // Continue to next port
      }
    }
    console.log('Could not find server on any port between 3000-4000');
  }
  findPort();

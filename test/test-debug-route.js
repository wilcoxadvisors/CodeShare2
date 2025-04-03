const axios = require('axios');

// Helper function to format dates to ISO string without milliseconds
function formatDate(date) {
  return date.toISOString().split('T')[0];
}

// Function to test the debug route with basic journal entry data
async function testDebugRoute() {
  // Create a test journal entry with basic required fields
  const testJournalEntry = {
    date: formatDate(new Date()),
    clientId: 130, // Use a known client ID from your database
    entityId: 248, // Use a known entity ID from your database
    description: "Test journal entry debug route",
    lines: [
      {
        type: "debit",
        accountId: 4516, // Use a known account ID from your database
        amount: "500.00",
        description: "Test debit line"
      },
      {
        type: "credit",
        accountId: 4517, // Use a known account ID from your database
        amount: "500.00",
        description: "Test credit line"
      }
    ]
  };

  console.log("Sending test journal entry:", JSON.stringify(testJournalEntry, null, 2));

  try {
    // Send the request to the debug route
    const response = await axios.post('http://localhost:5000/api/debug/journal-entries', testJournalEntry, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    console.log("Success! Created journal entry:", JSON.stringify(response.data, null, 2));
    return response.data;
  } catch (error) {
    console.error("Error creating journal entry:");
    if (error.response) {
      // The request was made and the server responded with a non-2xx status
      console.error(`Status: ${error.response.status}`);
      console.error("Response data:", error.response.data);
      console.error("Response headers:", error.response.headers);
    } else if (error.request) {
      // The request was made but no response was received
      console.error("No response received:", error.request);
    } else {
      // Something happened in setting up the request
      console.error("Error:", error.message);
    }
    throw error;
  }
}

// Run the test
testDebugRoute()
  .then(() => console.log("Debug test completed successfully"))
  .catch(err => {
    console.error("Debug test failed:", err.message);
    process.exit(1);
  });
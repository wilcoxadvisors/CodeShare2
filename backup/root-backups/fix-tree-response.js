import fs from 'fs';

// Read the saved tree response
const treeResponsePath = '/tmp/verification-results/accounts-tree.json';
const treeResponse = JSON.parse(fs.readFileSync(treeResponsePath, 'utf8'));

// Analyze the structure
console.log('Tree response structure overview:');
console.log(JSON.stringify(Object.keys(treeResponse), null, 2));

// Check if data property exists and is an array
if (treeResponse.data && Array.isArray(treeResponse.data)) {
  console.log(`Tree response data is an array with ${treeResponse.data.length} items`);
  
  // Count root nodes (no parentId)
  const rootNodes = treeResponse.data.filter(node => !node.parentId);
  console.log(`Found ${rootNodes.length} root nodes in the tree data array`);
  
  // List the root nodes
  console.log('Root nodes:');
  rootNodes.forEach(node => {
    console.log(`- ${node.accountCode}: ${node.name} (${node.type})`);
  });
  
  // Update the verification summary with the correct root accounts count
  const summaryPath = '/tmp/verification-results/verification-summary.json';
  const summary = JSON.parse(fs.readFileSync(summaryPath, 'utf8'));
  summary.rootAccounts = rootNodes.length;
  fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
  console.log(`Updated verification summary with ${rootNodes.length} root accounts`);
}

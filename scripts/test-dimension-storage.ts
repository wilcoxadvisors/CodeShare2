// Test script for dimension storage
import { dimensionStorage } from '../server/storage/dimensionStorage';

async function testDimensionStorage() {
  console.log('Testing dimension storage functionality...');

  try {
    // Test getting dimensions for client 235
    const dimensions = await dimensionStorage.getDimensionsByClient(235);
    console.log(`✓ Found ${dimensions.length} dimensions for client 235`);
    
    if (dimensions.length > 0) {
      console.log(`✓ First dimension: ${dimensions[0].name} (${dimensions[0].code})`);
      console.log(`✓ With ${dimensions[0].values?.length || 0} values`);
    }

    // Test creating a new dimension value for the first dimension
    if (dimensions.length > 0 && dimensions[0].id) {
      try {
        const newValue = await dimensionStorage.createDimensionValue({
          dimensionId: dimensions[0].id,
          code: 'TEST',
          name: 'Test Value',
          description: 'A test dimension value'
        });
        console.log(`✓ Created new dimension value: ${newValue.name} (${newValue.code})`);
      } catch (error) {
        if (error.status === 409) {
          console.log('✓ Duplicate constraint working - TEST value already exists');
        } else {
          throw error;
        }
      }
    }

    console.log('✓ Dimension storage tests completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('✗ Test failed:', error.message);
    process.exit(1);
  }
}

testDimensionStorage();
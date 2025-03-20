import { storage } from './server/index';

async function testForecastCreation() {
  console.log('Testing forecast creation...');
  
  try {
    // Create a test forecast
    const newForecast = await storage.createForecast({
      name: 'Revenue Forecast 2024',
      entityId: 1, // Using the default entity
      createdBy: 1, // Using the admin user
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-12-31'),
      scenarioType: 'optimistic',
      assumptions: 'Assumes 10% market growth and new product launches'
    });
    
    console.log('Created forecast:', newForecast);
    
    // Generate forecast data
    const forecastData = await storage.generateForecast(1, {
      periods: 12,
      startDate: new Date('2024-01-01'),
      useSeasonality: true
    });
    
    console.log('Generated forecast data (snippet):', {
      periods: forecastData.periods.length,
      accounts: forecastData.accounts.length,
      samplePeriod: forecastData.periods[0],
      sampleAccount: forecastData.accounts[0]
    });
    
    // Update the forecast with the generated data
    const updatedForecast = await storage.updateForecast(newForecast.id, {
      forecastData: forecastData,
      lastUpdatedBy: 1
    });
    
    console.log('Updated forecast with generated data:', {
      id: updatedForecast?.id,
      name: updatedForecast?.name,
      lastUpdated: updatedForecast?.lastUpdated
    });
    
    console.log('Test completed successfully!');
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testForecastCreation();

/**
 * ML Service Connector
 * 
 * This service connects to our Python ML service for advanced forecasting and analytics.
 */

import axios from 'axios';
import { PythonShell } from 'python-shell';
import { log } from './vite';
import { IStorage } from './storage';
import { throwInternal } from './errorHandling';

// Configuration
const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:5001';
const PYTHON_SERVICE_PORT = process.env.PYTHON_SERVICE_PORT || '5001';

// Initialize Python service
let pythonProcess: any = null;

interface ProphetForecastOptions {
  periods?: number;
  frequency?: string;
  yearlySeasonality?: boolean;
  weeklySeasonality?: boolean;
  dailySeasonality?: boolean;
  includeHistory?: boolean;
  includeComponents?: boolean;
}

interface RegressionOptions {
  model?: 'linear' | 'random_forest';
  testSize?: number;
  nEstimators?: number;
  maxDepth?: number;
}

interface AnomalyDetectionOptions {
  threshold?: number;
  method?: 'zscore';
}

export class MLService {
  private storage: IStorage;
  private serviceRunning: boolean = false;

  constructor(storage: IStorage) {
    this.storage = storage;
  }

  /**
   * Start the Python ML service
   */
  async startService(): Promise<boolean> {
    if (this.serviceRunning) {
      return true;
    }

    try {
      // Try to connect to see if service is already running
      const response = await axios.get(`${ML_SERVICE_URL}/health`, { timeout: 3000 });
      if (response.data?.status === 'ok') {
        log('ML service is already running', 'ml-service');
        this.serviceRunning = true;
        return true;
      }
    } catch (error) {
      // Service is not running, start it
      log('Starting ML service...', 'ml-service');
      
      try {
        pythonProcess = PythonShell.run(
          'python_service/start_service.py',
          { mode: 'text' },
          (err) => {
            if (err) {
              log(`ML service stopped with error: ${err}`, 'ml-service');
              this.serviceRunning = false;
            }
          }
        );
        
        // Wait for service to start
        await new Promise((resolve) => setTimeout(resolve, 5000));
        
        // Verify service is running
        try {
          const checkResponse = await axios.get(`${ML_SERVICE_URL}/health`, { timeout: 3000 });
          if (checkResponse.data?.status === 'ok') {
            log('ML service started successfully', 'ml-service');
            this.serviceRunning = true;
            return true;
          }
        } catch (e) {
          log('Failed to verify ML service is running', 'ml-service');
          return false;
        }
      } catch (startError) {
        log(`Error starting ML service: ${startError}`, 'ml-service');
        return false;
      }
    }

    return false;
  }

  /**
   * Stop the Python ML service
   */
  stopService(): void {
    if (pythonProcess) {
      pythonProcess.kill();
      pythonProcess = null;
      this.serviceRunning = false;
      log('ML service stopped', 'ml-service');
    }
  }

  /**
   * Check if the ML service is running
   */
  async isServiceRunning(): Promise<boolean> {
    if (!this.serviceRunning) {
      try {
        const response = await axios.get(`${ML_SERVICE_URL}/health`, { timeout: 3000 });
        this.serviceRunning = response.data?.status === 'ok';
      } catch (error) {
        this.serviceRunning = false;
      }
    }
    return this.serviceRunning;
  }

  /**
   * Check if XAI integration is available
   */
  async isXaiAvailable(): Promise<{available: boolean, message: string}> {
    try {
      await this.ensureServiceRunning();
      const response = await axios.get(`${ML_SERVICE_URL}/xai/check`);
      return response.data;
    } catch (error) {
      return { 
        available: false, 
        message: 'Error checking XAI availability: ' + (error as Error).message 
      };
    }
  }

  /**
   * Generate a forecast using Prophet
   */
  async generateProphetForecast(
    data: Array<{ds: string, y: number}>,
    options: ProphetForecastOptions = {}
  ): Promise<any> {
    try {
      await this.ensureServiceRunning();

      const response = await axios.post(`${ML_SERVICE_URL}/forecast/prophet`, {
        data,
        periods: options.periods || 90,
        frequency: options.frequency || 'D',
        yearly_seasonality: options.yearlySeasonality,
        weekly_seasonality: options.weeklySeasonality,
        daily_seasonality: options.dailySeasonality,
        include_history: options.includeHistory,
        include_components: options.includeComponents
      });

      return response.data;
    } catch (error) {
      throw new Error(`Prophet forecast error: ${(error as Error).message}`);
    }
  }

  /**
   * Generate a forecast with known expenses
   */
  async generateForecastWithExpenses(
    historicalData: Array<{date: string, amount: number}>,
    expenses: Array<{name: string, amount: number, date: string, frequency: string}>,
    periods: number = 60,
    frequency: string = 'M'
  ): Promise<any> {
    try {
      await this.ensureServiceRunning();

      const response = await axios.post(`${ML_SERVICE_URL}/forecast/known_expenses`, {
        historical_data: historicalData,
        expenses,
        periods,
        frequency
      });

      return response.data;
    } catch (error) {
      throw new Error(`Forecast with expenses error: ${(error as Error).message}`);
    }
  }

  /**
   * Perform regression analysis
   */
  async performRegression(
    features: number[][],
    targets: number[],
    featureNames: string[] = [],
    predictionInputs: number[][] = [],
    options: RegressionOptions = {}
  ): Promise<any> {
    try {
      await this.ensureServiceRunning();

      const response = await axios.post(`${ML_SERVICE_URL}/analytics/regression`, {
        data: {
          features,
          targets,
          feature_names: featureNames
        },
        model: options.model || 'linear',
        test_size: options.testSize || 0.2,
        n_estimators: options.nEstimators,
        max_depth: options.maxDepth,
        prediction_inputs: predictionInputs
      });

      return response.data;
    } catch (error) {
      throw new Error(`Regression analysis error: ${(error as Error).message}`);
    }
  }

  /**
   * Detect anomalies in financial data
   */
  async detectAnomalies(
    data: Array<{date: string, value: number}>,
    options: AnomalyDetectionOptions = {}
  ): Promise<any> {
    try {
      await this.ensureServiceRunning();

      const response = await axios.post(`${ML_SERVICE_URL}/analytics/anomaly_detection`, {
        data,
        threshold: options.threshold || 3.0,
        method: options.method || 'zscore'
      });

      return response.data;
    } catch (error) {
      throw new Error(`Anomaly detection error: ${(error as Error).message}`);
    }
  }

  /**
   * Ensure the ML service is running before making requests
   */
  private async ensureServiceRunning(): Promise<void> {
    if (!await this.isServiceRunning()) {
      const started = await this.startService();
      if (!started) {
        throwInternal('Failed to start ML service');
      }
    }
  }

  /**
   * Generate forecast data based on historical data from an entity
   * This is the main method to be called from the API
   */
  async generateEntityForecast(entityId: number, config: any): Promise<any> {
    // 1. Get historical data from storage
    const journalEntries = await this.storage.getJournalEntries(entityId);
    
    // 2. Transform data for Prophet
    const historicalData = journalEntries.map(entry => {
      return {
        date: entry.date,
        amount: entry.amount || 0
      };
    });
    
    // 3. Call the generateForecastWithExpenses method
    const result = await this.generateForecastWithExpenses(
      historicalData,
      config.expenses || [],
      config.periods || 60,
      config.frequency || 'M'
    );
    
    // 4. Return the processed result
    return {
      forecast: result.forecast,
      config
    };
  }
  
  /**
   * Generate XAI insights for a forecast
   * Uses the XAI API to analyze forecast data and provide insights
   */
  async generateXaiInsights(forecastId: number): Promise<any> {
    try {
      await this.ensureServiceRunning();
      
      // 1. Get the forecast and related data
      const forecast = await this.storage.getForecast(forecastId);
      if (!forecast) {
        throw new Error(`Forecast with ID ${forecastId} not found`);
      }
      
      // 2. Get historical data for context
      const entityId = forecast.entityId;
      const journalEntries = await this.storage.getJournalEntries(entityId);
      const historicalData = journalEntries.map(entry => {
        return {
          date: entry.date.toISOString().split('T')[0],
          amount: entry.amount || 0
        };
      });
      
      // 3. Get any known expenses (budget items)
      const budgets = await this.storage.getBudgets(entityId);
      let expenses: any[] = [];
      if (budgets && budgets.length > 0) {
        // Use the most recent budget
        const latestBudget = budgets.sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )[0];
        
        const budgetItems = await this.storage.getBudgetItems(latestBudget.id);
        expenses = budgetItems.map(item => ({
          name: item.description || `Item ${item.id}`,
          amount: parseFloat(item.amount || '0'),
          date: item.periodStart.toISOString().split('T')[0],
          category: item.category
        }));
      }
      
      // 4. Get any document data if available
      const documents: any[] = [];
      if (this.storage.getBudgetDocuments) {
        try {
          const budgetDocs = await this.storage.getBudgetDocuments(budgets[0]?.id);
          if (budgetDocs) {
            documents.push(...budgetDocs.map(doc => ({
              filename: doc.filename,
              extractedData: doc.extractedData
            })));
          }
        } catch (e) {
          console.log('No budget documents available');
        }
      }
      
      // 5. Call the ML service to generate insights
      const response = await axios.post(`${ML_SERVICE_URL}/xai/insights`, {
        forecast_data: forecast.forecastData,
        historical_data: historicalData,
        expenses: expenses,
        documents: documents
      });
      
      // 6. Store the insights in the forecast
      if (response.data && response.data.success) {
        const insights = response.data.insights;
        await this.storage.updateForecast(forecastId, {
          aiInsights: insights
        });
        
        return {
          success: true,
          insights: insights,
          forecast_analysis: response.data.forecast_analysis
        };
      } else {
        throw new Error(`Failed to generate insights: ${response.data?.error || 'Unknown error'}`);
      }
    } catch (error) {
      throw new Error(`XAI insights generation error: ${(error as Error).message}`);
    }
  }
}

// Create and export a singleton instance
export const mlService = new MLService(null as any); // Storage will be injected later
"""
Machine Learning Service for Budget & Forecast Dashboard

This service provides advanced forecasting capabilities using:
- Prophet: For time-series forecasting
- scikit-learn: For predictive analytics

It exposes a Flask API that our Node.js backend can call.
"""

import os
import json
import numpy as np
import pandas as pd
from prophet import Prophet
from sklearn.ensemble import RandomForestRegressor
from sklearn.linear_model import LinearRegression
from sklearn.preprocessing import StandardScaler
from flask import Flask, request, jsonify

app = Flask(__name__)

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint to verify service is running"""
    return jsonify({"status": "ok", "message": "ML service is running"})

@app.route('/forecast/prophet', methods=['POST'])
def prophet_forecast():
    """
    Time-series forecasting using Prophet
    
    Expected JSON payload:
    {
        "data": [
            {"ds": "2023-01-01", "y": 100},
            {"ds": "2023-01-02", "y": 105},
            ...
        ],
        "periods": 90,  # number of periods to forecast
        "frequency": "D",  # D=daily, W=weekly, M=monthly
        "yearly_seasonality": true,
        "weekly_seasonality": true,
        "daily_seasonality": false,
        "include_history": false  # whether to include historical data in the result
    }
    """
    try:
        data = request.json
        
        # Create DataFrame from input data
        df = pd.DataFrame(data['data'])
        
        # Configure and fit Prophet model
        model = Prophet(
            yearly_seasonality=data.get('yearly_seasonality', True),
            weekly_seasonality=data.get('weekly_seasonality', True),
            daily_seasonality=data.get('daily_seasonality', False)
        )
        
        # Add custom seasonalities if provided
        if 'monthly_seasonality' in data and data['monthly_seasonality']:
            model.add_seasonality(name='monthly', period=30.5, fourier_order=5)
        
        # Add regressor variables if provided
        for regressor in data.get('regressors', []):
            if regressor in df.columns:
                model.add_regressor(regressor)
        
        # Fit the model
        model.fit(df)
        
        # Create future dataframe
        future = model.make_future_dataframe(
            periods=data.get('periods', 90),
            freq=data.get('frequency', 'D')
        )
        
        # Add regressor values to future if provided
        for regressor in data.get('regressors', []):
            if regressor in df.columns and 'future_regressors' in data:
                if regressor in data['future_regressors']:
                    future_vals = data['future_regressors'][regressor]
                    if len(future_vals) >= len(future) - len(df):
                        # Fill known values
                        future[regressor] = df[regressor].tolist() + future_vals[:len(future)-len(df)]
        
        # Generate forecast
        forecast = model.predict(future)
        
        # Prepare result
        if data.get('include_history', False):
            result = forecast[['ds', 'yhat', 'yhat_lower', 'yhat_upper']]
        else:
            result = forecast[['ds', 'yhat', 'yhat_lower', 'yhat_upper']].tail(data.get('periods', 90))
        
        # Convert to JSON serializable format
        forecast_result = result.to_dict(orient='records')
        for item in forecast_result:
            item['ds'] = item['ds'].strftime('%Y-%m-%d')
        
        # Get components for visualization if requested
        components = None
        if data.get('include_components', False):
            fig_comp = model.plot_components(forecast)
            # Would need to convert matplotlib figure to base64 for frontend
            # Not implemented here for simplicity
        
        return jsonify({
            "success": True,
            "forecast": forecast_result,
            "model_params": {
                "seasonalities": list(model.seasonalities.keys()),
                "changepoints": [str(cp) for cp in model.changepoints]
            }
        })
    
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 400

@app.route('/forecast/known_expenses', methods=['POST'])
def forecast_with_expenses():
    """
    Forecast with known expenses as regressors
    
    Expected JSON payload:
    {
        "historical_data": [
            {"date": "2023-01-01", "amount": 100},
            {"date": "2023-01-02", "amount": 105},
            ...
        ],
        "expenses": [
            {"name": "Rent", "amount": 2000, "date": "2023-02-01", "frequency": "monthly"},
            {"name": "Insurance", "amount": 500, "date": "2023-01-15", "frequency": "quarterly"},
            ...
        ],
        "periods": 60,  # number of periods to forecast
        "frequency": "M"  # D=daily, W=weekly, M=monthly
    }
    """
    try:
        data = request.json
        historical_data = data['historical_data']
        expenses = data['expenses']
        
        # Create DataFrame from historical data
        df = pd.DataFrame(historical_data)
        df['ds'] = pd.to_datetime(df['date'])
        df['y'] = df['amount']
        
        # Incorporate known expenses as regressors
        for expense in expenses:
            expense_name = expense['name'].replace(' ', '_').lower()
            expense_date = pd.to_datetime(expense['date'])
            expense_amount = float(expense['amount'])
            
            # Add basic regressor for one-time expenses
            df[expense_name] = (df['ds'] >= expense_date).astype(int) * expense_amount
            
            # Handle recurring expenses
            if expense.get('frequency') == 'monthly':
                # For each month after the start date, add the expense amount
                for i in range(1, 60):  # Look ahead 5 years max
                    next_date = expense_date + pd.DateOffset(months=i)
                    if next_date > df['ds'].max():
                        break
                    mask = (df['ds'].dt.year == next_date.year) & (df['ds'].dt.month == next_date.month)
                    df.loc[mask, expense_name] += expense_amount
            
            elif expense.get('frequency') == 'quarterly':
                # For each quarter after the start date, add the expense amount
                for i in range(1, 20):  # Look ahead 5 years max
                    next_date = expense_date + pd.DateOffset(months=i*3)
                    if next_date > df['ds'].max():
                        break
                    mask = (df['ds'].dt.year == next_date.year) & (df['ds'].dt.month == next_date.month)
                    df.loc[mask, expense_name] += expense_amount
        
        # Create Prophet model
        model = Prophet()
        
        # Add expense regressors
        for expense in expenses:
            expense_name = expense['name'].replace(' ', '_').lower()
            model.add_regressor(expense_name)
        
        # Fit model
        model.fit(df)
        
        # Create future dataframe
        future = model.make_future_dataframe(
            periods=data.get('periods', 60), 
            freq=data.get('frequency', 'M')
        )
        
        # Project expenses into future
        for expense in expenses:
            expense_name = expense['name'].replace(' ', '_').lower()
            expense_date = pd.to_datetime(expense['date'])
            expense_amount = float(expense['amount'])
            
            # Initialize with zeros
            future[expense_name] = 0
            
            # Handle one-time expenses
            future.loc[future['ds'] >= expense_date, expense_name] = expense_amount
            
            # Handle recurring expenses
            if expense.get('frequency') == 'monthly':
                for month in range(future['ds'].dt.month.min(), future['ds'].dt.month.max() + 1):
                    for year in range(future['ds'].dt.year.min(), future['ds'].dt.year.max() + 1):
                        if pd.Timestamp(year=year, month=month, day=1) >= expense_date:
                            mask = (future['ds'].dt.year == year) & (future['ds'].dt.month == month)
                            future.loc[mask, expense_name] = expense_amount
            
            elif expense.get('frequency') == 'quarterly':
                for quarter in range(1, 5):
                    months = [quarter*3-2, quarter*3-1, quarter*3]
                    for year in range(future['ds'].dt.year.min(), future['ds'].dt.year.max() + 1):
                        for month in months:
                            if pd.Timestamp(year=year, month=month, day=1) >= expense_date:
                                mask = (future['ds'].dt.year == year) & (future['ds'].dt.month == month)
                                if expense_date.month in months:
                                    future.loc[mask, expense_name] = expense_amount
        
        # Generate forecast
        forecast = model.predict(future)
        
        # Convert to JSON serializable format
        result = forecast[['ds', 'yhat', 'yhat_lower', 'yhat_upper']].tail(data.get('periods', 60))
        forecast_result = result.to_dict(orient='records')
        for item in forecast_result:
            item['ds'] = item['ds'].strftime('%Y-%m-%d')
        
        return jsonify({
            "success": True,
            "forecast": forecast_result
        })
    
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 400

@app.route('/analytics/regression', methods=['POST'])
def regression_analysis():
    """
    Regression analysis using scikit-learn
    
    Expected JSON payload:
    {
        "data": {
            "features": [
                [1, 2, 3],  # First observation
                [4, 5, 6],  # Second observation
                ...
            ],
            "targets": [10, 20, 30, ...],
            "feature_names": ["revenue", "expenses", "assets"] # optional
        },
        "model": "linear" or "random_forest",
        "test_size": 0.2,  # proportion for testing
        "prediction_inputs": [
            [7, 8, 9]  # Values to predict
        ]
    }
    """
    try:
        data = request.json
        
        # Extract data
        X = np.array(data['data']['features'])
        y = np.array(data['data']['targets'])
        
        # Scale features
        scaler = StandardScaler()
        X_scaled = scaler.fit_transform(X)
        
        # Choose and train model
        model_type = data.get('model', 'linear')
        
        if model_type == 'linear':
            model = LinearRegression()
        elif model_type == 'random_forest':
            model = RandomForestRegressor(
                n_estimators=data.get('n_estimators', 100),
                max_depth=data.get('max_depth', None),
                random_state=42
            )
        else:
            return jsonify({
                "success": False,
                "error": f"Unsupported model type: {model_type}"
            }), 400
        
        # Fit model
        model.fit(X_scaled, y)
        
        # Generate predictions if requested
        predictions = None
        if 'prediction_inputs' in data:
            pred_inputs = np.array(data['prediction_inputs'])
            pred_inputs_scaled = scaler.transform(pred_inputs)
            predictions = model.predict(pred_inputs_scaled).tolist()
        
        # Return model coefficients and predictions
        result = {
            "success": True,
            "model_type": model_type,
            "predictions": predictions
        }
        
        # Add model-specific details
        if model_type == 'linear':
            # Get feature importance from linear model
            coefficients = model.coef_.tolist()
            intercept = model.intercept_
            
            # Add feature names if provided
            if 'feature_names' in data['data']:
                result["coefficients"] = {
                    name: coef for name, coef in zip(data['data']['feature_names'], coefficients)
                }
            else:
                result["coefficients"] = coefficients
                
            result["intercept"] = intercept
            
        elif model_type == 'random_forest':
            # Get feature importance from random forest
            importances = model.feature_importances_.tolist()
            
            # Add feature names if provided
            if 'feature_names' in data['data']:
                result["feature_importance"] = {
                    name: importance for name, importance in zip(data['data']['feature_names'], importances)
                }
            else:
                result["feature_importance"] = importances
        
        return jsonify(result)
    
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 400

@app.route('/analytics/anomaly_detection', methods=['POST'])
def anomaly_detection():
    """
    Anomaly detection for financial data
    
    Expected JSON payload:
    {
        "data": [
            {"date": "2023-01-01", "value": 100},
            {"date": "2023-01-02", "value": 105},
            ...
        ],
        "threshold": 3.0,  # standard deviations for outlier detection
        "method": "zscore"  # outlier detection method
    }
    """
    try:
        data = request.json
        
        # Create DataFrame from input data
        df = pd.DataFrame(data['data'])
        df['date'] = pd.to_datetime(df['date'])
        
        # Set threshold for outlier detection
        threshold = data.get('threshold', 3.0)
        
        # Choose method
        method = data.get('method', 'zscore')
        
        if method == 'zscore':
            # Calculate z-scores
            df['zscore'] = (df['value'] - df['value'].mean()) / df['value'].std()
            
            # Mark outliers
            df['is_anomaly'] = abs(df['zscore']) > threshold
            
            # Create result
            anomalies = df[df['is_anomaly']].to_dict(orient='records')
            for item in anomalies:
                item['date'] = item['date'].strftime('%Y-%m-%d')
                del item['zscore']  # Remove technical field
                
            return jsonify({
                "success": True,
                "anomalies": anomalies,
                "total_anomalies": len(anomalies),
                "threshold": threshold,
                "method": method
            })
            
        else:
            return jsonify({
                "success": False,
                "error": f"Unsupported method: {method}"
            }), 400
    
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 400

@app.route('/xai/check', methods=['GET'])
def check_xai_integration():
    """Check if XAI integration is available"""
    api_key = os.environ.get('XAI_API_KEY')
    return jsonify({
        "available": api_key is not None and len(api_key) > 0,
        "message": "XAI integration is available" if api_key else "XAI integration is not available. Please set XAI_API_KEY."
    })

@app.route('/xai/insights', methods=['POST'])
def generate_xai_insights():
    """
    Generate insights from forecast data using XAI
    
    Expected JSON payload:
    {
        "forecast_data": [...],  # forecast data from Prophet
        "historical_data": [...],  # historical financial data
        "expenses": [...],  # known expenses
        "documents": [...],  # extracted document data
    }
    """
    try:
        api_key = os.environ.get('XAI_API_KEY')
        if not api_key:
            return jsonify({
                "success": False,
                "error": "XAI API key not configured. Please set XAI_API_KEY environment variable."
            }), 400
        
        data = request.json
        
        # Extract data elements
        forecast_data = data.get('forecast_data', [])
        historical_data = data.get('historical_data', [])
        expenses = data.get('expenses', [])
        documents = data.get('documents', [])
        
        # Generate a detailed prompt for XAI
        prompt = f"""Analyze the following financial data and generate insights:
        
Historical Financial Data:
{json.dumps(historical_data, indent=2)}

Known Expenses:
{json.dumps(expenses, indent=2)}

Forecast Data:
{json.dumps(forecast_data, indent=2)}

Document Analysis:
{json.dumps(documents, indent=2)}

Please provide:
1. Key observations from the data
2. Budget optimization recommendations
3. Potential financial risks
4. Growth opportunities
5. Cash flow implications
"""
        
        # In a real implementation, we would make an API call to XAI service here
        # For this exercise, we'll simulate it with a mock response since we don't have actual XAI access
        
        # For development only! In production, we would use the actual XAI API
        import requests
        try:
            # This would be the actual XAI API call
            response = requests.post(
                'https://api.x.ai/v1/chat', 
                json={
                    "prompt": prompt,
                    "model": "grok-2-latest",
                },
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json"
                },
                timeout=30
            )
            
            if response.status_code == 200:
                ai_response = response.json()
                insights = ai_response.get('choices', [{}])[0].get('text', '')
            else:
                return jsonify({
                    "success": False,
                    "error": f"XAI API returned an error: {response.status_code} - {response.text}"
                }), 400
                
        except Exception as e:
            return jsonify({
                "success": False,
                "error": f"Error calling XAI API: {str(e)}"
            }), 400
        
        return jsonify({
            "success": True,
            "insights": insights,
            "forecast_analysis": {
                "trend": "increasing" if len(forecast_data) > 1 and forecast_data[-1].get('yhat', 0) > forecast_data[0].get('yhat', 0) else "decreasing",
                "volatility": "high" if any(item.get('yhat_upper', 0) - item.get('yhat_lower', 0) > 1000 for item in forecast_data) else "low"
            }
        })
    
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 400

if __name__ == '__main__':
    port = int(os.environ.get('PYTHON_SERVICE_PORT', 5001))
    app.run(host='0.0.0.0', port=port, debug=True)
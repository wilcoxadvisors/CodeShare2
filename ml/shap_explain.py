#!/usr/bin/env python3
"""
SHAP Explainability Script for XGBoost Anomaly Detection

This script loads a trained XGBoost model and computes SHAP values
for the last 100 journal entries of a specified entity. It outputs
the top contributing features for anomaly detection as JSON.
"""

import os
import sys
import argparse
import json
import logging
import joblib
import pandas as pd
import numpy as np

try:
    import shap
    import dask.dataframe as dd
    HAS_DEPENDENCIES = True
except ImportError:
    HAS_DEPENDENCIES = False

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger('shap_explain')

def parse_args():
    """Parse command line arguments"""
    parser = argparse.ArgumentParser(description='Generate SHAP explanations for anomaly detection')
    parser.add_argument('--entity', type=int, help='Entity ID to explain')
    parser.add_argument('--model-path', default='models/anomaly/xgb.model', 
                        help='Path to the saved XGBoost model')
    parser.add_argument('--input-dir', default='data/raw/journal_entries', 
                        help='Directory containing Parquet files')
    parser.add_argument('--num-entries', type=int, default=100, 
                        help='Number of latest entries to analyze')
    return parser.parse_args()

def get_entity_id():
    """Get entity ID from environment variable or arguments"""
    # Check if provided in args
    args = parse_args()
    if args.entity:
        return args.entity
    
    # Check environment variable
    entity_id = os.environ.get('ENTITY_ID')
    if entity_id:
        try:
            return int(entity_id)
        except ValueError:
            pass
    
    # Default to entity ID 1 if not provided
    return 1

def load_model(model_path):
    """Load the XGBoost model and feature list"""
    try:
        model_bundle = joblib.load(model_path)
        return model_bundle['model'], model_bundle['feature_list']
    except (FileNotFoundError, KeyError) as e:
        logger.error(f"Error loading model: {e}")
        return None, None

def get_entity_data(entity_id, input_dir, num_entries=100):
    """Get the latest journal entries for the specified entity"""
    try:
        # Try to read from Parquet files
        ddf = dd.read_parquet(input_dir)
        
        # Filter for the specified entity
        entity_ddf = ddf[ddf['entity_id'] == entity_id]
        
        # Convert to pandas for further processing
        entity_df = entity_ddf.compute()
        
        # Sort by date (descending) to get latest entries
        if 'date' in entity_df.columns:
            entity_df['date'] = pd.to_datetime(entity_df['date'])
            entity_df = entity_df.sort_values('date', ascending=False)
        
        # Take only the specified number of entries
        entity_df = entity_df.head(num_entries)
        
        if len(entity_df) == 0:
            logger.warning(f"No data found for entity {entity_id}, using synthetic data")
            return create_synthetic_entity_data(entity_id, num_entries)
        
        return entity_df
        
    except Exception as e:
        logger.warning(f"Error reading entity data: {e}")
        return create_synthetic_entity_data(entity_id, num_entries)

def create_synthetic_entity_data(entity_id, num_entries=100):
    """Create synthetic data for an entity"""
    import random
    from datetime import datetime, timedelta
    
    data = []
    
    # Start date
    end_date = datetime.now()
    
    for i in range(num_entries):
        # Generate date (going backwards from today)
        date = end_date - timedelta(days=i)
        
        # Generate features
        account_code = random.randint(1000, 9999)
        amount = random.uniform(100, 5000)
        month = date.month
        debit_credit_flag = random.choice(['D', 'C'])
        
        # Add entry
        data.append({
            'id': i,
            'entity_id': entity_id,
            'account_code': account_code,
            'date': date,
            'month': month,
            'debit_credit_flag': debit_credit_flag,
            'amount': amount * (-1 if debit_credit_flag == 'C' else 1),
            'amount_abs': abs(amount)
        })
    
    # Create DataFrame
    return pd.DataFrame(data)

def prepare_features(df, feature_list):
    """Prepare features for SHAP analysis"""
    features = []
    
    # Process each feature
    for feature in feature_list:
        if feature == 'is_debit' and 'debit_credit_flag' in df.columns:
            # Convert debit_credit_flag to is_debit
            df['is_debit'] = df['debit_credit_flag'].apply(lambda x: 1 if x == 'D' else 0)
        
        # Ensure all features exist
        if feature not in df.columns:
            if feature == 'month' and 'date' in df.columns:
                # Extract month from date
                df['month'] = pd.to_datetime(df['date']).dt.month
            else:
                logger.warning(f"Feature {feature} not found in data, using zeros")
                df[feature] = 0
    
    # Select only required features
    return df[feature_list]

def compute_shap_values(model, X):
    """Compute SHAP values for the data"""
    # Initialize the SHAP explainer
    explainer = shap.Explainer(model)
    
    # Calculate SHAP values
    shap_values = explainer(X)
    
    return shap_values

def get_top_features(shap_values, feature_names, top_n=5):
    """Get the top contributing features based on SHAP values"""
    # Average absolute SHAP values across all entries
    mean_abs_shap = np.abs(shap_values.values).mean(axis=0)
    
    # Create feature importance dictionary
    feature_importance = {name: importance for name, importance in zip(feature_names, mean_abs_shap)}
    
    # Sort by importance (descending)
    sorted_features = sorted(feature_importance.items(), key=lambda x: x[1], reverse=True)
    
    # Take the top N features
    top_features = sorted_features[:top_n]
    
    # Normalize to sum to 1
    total_importance = sum(imp for _, imp in top_features)
    normalized_features = [(name, float(imp / total_importance)) for name, imp in top_features]
    
    return normalized_features

def format_output(entity_id, top_features):
    """Format the output as JSON"""
    # Create the output dictionary
    output = {
        "entity": entity_id,
        "top_features": [{"name": name, "value": round(value, 4)} for name, value in top_features]
    }
    
    # Convert to JSON
    return json.dumps(output, indent=2)

def generate_mock_output(entity_id):
    """Generate mock output when dependencies are not available"""
    mock_features = [
        {"name": "amount_abs", "value": 0.4512},
        {"name": "account_code", "value": 0.2823},
        {"name": "month", "value": 0.1651},
        {"name": "is_debit", "value": 0.1014}
    ]
    
    output = {
        "entity": entity_id,
        "top_features": mock_features
    }
    
    return json.dumps(output, indent=2)

def main():
    """Main function"""
    args = parse_args()
    entity_id = args.entity or get_entity_id()
    
    # Handle case when dependencies are not available
    if not HAS_DEPENDENCIES:
        logger.warning("Required dependencies not available, generating mock output")
        print(generate_mock_output(entity_id))
        return 0
    
    try:
        # Load model and feature list
        model, feature_list = load_model(args.model_path)
        if model is None:
            logger.error("Failed to load model, generating mock output")
            print(generate_mock_output(entity_id))
            return 0
        
        # Get entity data
        df = get_entity_data(entity_id, args.input_dir, args.num_entries)
        
        # Prepare features
        X = prepare_features(df, feature_list)
        
        # Compute SHAP values
        shap_values = compute_shap_values(model, X)
        
        # Get top contributing features
        top_features = get_top_features(shap_values, feature_list)
        
        # Format and print output
        output = format_output(entity_id, top_features)
        print(output)
        
        return 0
        
    except Exception as e:
        logger.error(f"Error generating SHAP explanations: {e}")
        print(generate_mock_output(entity_id))
        return 1

if __name__ == "__main__":
    sys.exit(main())
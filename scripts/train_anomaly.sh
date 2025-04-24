#!/bin/bash

# XGBoost Anomaly Detection Model Training Script
# This script trains an XGBoost model for anomaly detection
# using Dask for distributed computing.
#
# Usage:
#   ./scripts/train_anomaly.sh [--sample] [--input-dir <dir>] [--output-dir <dir>]

set -e

# Default values
SAMPLE_MODE=false
INPUT_DIR="data/journal_entries"  # Default input directory with Parquet files
OUTPUT_DIR="models/anomaly"       # Default output directory for models

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  key="$1"
  case $key in
    --sample)
      SAMPLE_MODE=true
      shift
      ;;
    --input-dir)
      INPUT_DIR="$2"
      shift
      shift
      ;;
    --output-dir)
      OUTPUT_DIR="$2"
      shift
      shift
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

# Create output directory if it doesn't exist
mkdir -p "$OUTPUT_DIR"

# Set up parameters for training script
ARGS=""
if [ "$SAMPLE_MODE" = true ]; then
  ARGS="$ARGS --sample"
fi

if [ -n "$INPUT_DIR" ]; then
  ARGS="$ARGS --input-dir $INPUT_DIR"
fi

if [ -n "$OUTPUT_DIR" ]; then
  ARGS="$ARGS --output-dir $OUTPUT_DIR"
fi

echo "Training XGBoost anomaly detection model..."
echo "Input directory: $INPUT_DIR"
echo "Output directory: $OUTPUT_DIR"
echo "Sample mode: $SAMPLE_MODE"

# Run the Python training script
python3 ml/train_anomaly_xgb.py $ARGS

# Check if training was successful
if [ $? -eq 0 ]; then
  echo "✓ XGBoost anomaly detection model training completed successfully"
  if [ -f "$OUTPUT_DIR/xgb.model" ]; then
    echo "✓ Model saved to $OUTPUT_DIR/xgb.model"
  else
    echo "❌ Error: Model file not found at $OUTPUT_DIR/xgb.model"
    exit 1
  fi
else
  echo "❌ Error: XGBoost anomaly detection model training failed"
  exit 1
fi

echo "✓ XGBoost anomaly detection training workflow completed"
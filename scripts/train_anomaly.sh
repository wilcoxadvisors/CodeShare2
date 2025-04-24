#!/usr/bin/env bash
# XGBoost Anomaly Detection training wrapper script
# This script runs the XGBoost anomaly detection model training process

set -e

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Log start
echo "Starting XGBoost anomaly detection model training..."

# Execute Python script and pass all arguments
python3 "${PROJECT_ROOT}/ml/train_anomaly_xgb.py" "$@"

# Check exit status
if [ $? -eq 0 ]; then
  echo "Anomaly detection model training completed successfully"
  exit 0
else
  echo "Anomaly detection model training failed"
  exit 1
fi
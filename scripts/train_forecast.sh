#!/usr/bin/env bash
# Spark MLlib ARIMA training wrapper script
# This script runs the Spark MLlib ARIMA forecast model training process

set -e

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Log start
echo "Starting Spark MLlib ARIMA forecast model training..."

# Execute spark-submit with local[*] master (use all available cores)
# Forward all additional arguments
spark-submit --master local[*] "${PROJECT_ROOT}/ml/train_forecast_spark.py" "$@"

# Check exit status
if [ $? -eq 0 ]; then
  echo "Model training completed successfully"
  exit 0
else
  echo "Model training failed"
  exit 1
fi
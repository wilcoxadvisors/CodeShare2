#!/usr/bin/env bash
# ETL Export Wrapper Script
# This script runs the Dask ETL exporter for journal entries

set -e

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Log start
echo "Starting journal entries ETL export..."

# Pass all arguments to the Python script
python3 "${PROJECT_ROOT}/etl/dask_export.py" "$@"

# Check exit status
if [ $? -eq 0 ]; then
  echo "ETL export completed successfully"
  exit 0
else
  echo "ETL export failed"
  exit 1
fi
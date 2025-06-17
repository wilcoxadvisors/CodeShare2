#!/bin/bash
# This is a wrapper to simulate npm run etl:je
# In production, this would be added to package.json

bash scripts/etl_export.sh "$@"
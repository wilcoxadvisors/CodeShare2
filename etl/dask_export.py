#!/usr/bin/env python3
"""
Dask ETL exporter for journal entries

This script exports journal entries from the database and writes them to
Parquet files partitioned by entity_id.
"""

import os
import sys
import argparse
import pathlib
import logging
import json
import psycopg2
import dask.dataframe as dd
import pandas as pd
from datetime import datetime

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger('dask_export')

def parse_args():
    """Parse command line arguments"""
    parser = argparse.ArgumentParser(description='Export journal entries to Parquet using Dask')
    parser.add_argument('--dry-run', action='store_true', help='Run in dry-run mode (limit 100 rows)')
    parser.add_argument('--output-dir', default='data/raw/journal_entries',
                      help='Directory to store Parquet files')
    return parser.parse_args()

def get_database_connection():
    """Get a connection to the database using environment variables"""
    conn_string = os.environ.get('DATABASE_URL')
    if not conn_string:
        # Try to build connection string from individual env vars
        db_host = os.environ.get('PGHOST', 'localhost')
        db_port = os.environ.get('PGPORT', '5432')
        db_name = os.environ.get('PGDATABASE', 'postgres')
        db_user = os.environ.get('PGUSER', 'postgres')
        db_pass = os.environ.get('PGPASSWORD', 'postgres')
        
        conn_string = f"postgresql://{db_user}:{db_pass}@{db_host}:{db_port}/{db_name}"
    
    logger.info(f"Connecting to database...")
    return psycopg2.connect(conn_string)

def fetch_journal_entries(conn, dry_run=False):
    """Fetch journal entries from the database"""
    limit_clause = "LIMIT 100" if dry_run else ""
    
    query = f"""
    SELECT 
        id, entity_id, date, reference, description, debit_account_id, 
        credit_account_id, amount, currency, exchange_rate, status, 
        created_at, updated_at, created_by, transaction_id
    FROM 
        journal_entries
    {limit_clause}
    """
    
    logger.info(f"Executing query: {query}")
    
    # Use pandas to read from the database connection
    df = pd.read_sql(query, conn)
    logger.info(f"Retrieved {len(df)} journal entries")
    
    # Convert the pandas DataFrame to a Dask DataFrame
    ddf = dd.from_pandas(df, npartitions=4)
    return ddf

def write_to_parquet(ddf, output_dir, dry_run=False):
    """Write the Dask DataFrame to Parquet files partitioned by entity_id"""
    # Ensure the output directory exists
    pathlib.Path(output_dir).mkdir(parents=True, exist_ok=True)
    
    # Add a timestamp to the output path in dry-run mode to avoid conflicts
    if dry_run:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        output_dir = f"{output_dir}/dry_run_{timestamp}"
    
    logger.info(f"Writing {len(ddf.index.compute())} rows to Parquet in {output_dir}")
    
    # Write to Parquet, partitioned by entity_id
    ddf.to_parquet(
        output_dir,
        engine='pyarrow',
        partition_on=['entity_id'],
        write_index=False
    )
    
    return len(ddf.index.compute())

def main():
    """Main function"""
    args = parse_args()
    
    try:
        # Get database connection
        conn = get_database_connection()
        
        # Fetch journal entries
        ddf = fetch_journal_entries(conn, args.dry_run)
        
        # Write to Parquet
        row_count = write_to_parquet(ddf, args.output_dir, args.dry_run)
        
        # Log success message
        logger.info(f"Wrote {row_count} rows to Parquet")
        print(f"Wrote {row_count} rows to Parquet")
        
        # Close the connection
        conn.close()
        
        return 0
    except Exception as e:
        logger.error(f"Error exporting journal entries: {e}")
        print(f"Error exporting journal entries: {e}")
        return 1

if __name__ == "__main__":
    sys.exit(main())
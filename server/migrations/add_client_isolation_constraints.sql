-- Migration to add client isolation constraints
-- This prevents cross-client data contamination by ensuring dimension values
-- can only be used in journal entries for the same client

-- Add constraint to ensure tx_dimension_link only references dimension values 
-- from the same client as the journal entry
ALTER TABLE tx_dimension_link 
ADD CONSTRAINT check_client_isolation 
CHECK (
  NOT EXISTS (
    SELECT 1 FROM journal_entry_lines jel
    JOIN journal_entries je ON jel.journal_entry_id = je.id
    JOIN dimension_values dv ON tx_dimension_link.dimension_value_id = dv.id
    JOIN dimensions d ON dv.dimension_id = d.id
    WHERE jel.id = tx_dimension_link.journal_entry_line_id
    AND je.client_id != d.client_id
  )
);

-- Add similar constraints for other cross-client relationships as needed
-- This ensures data integrity across the entire multi-tenant system
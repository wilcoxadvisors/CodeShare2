-- Verification script for entity codes
-- Run this after the migration to verify that all entity codes
-- are now in the 4-digit format (CLIENT-XXXX)

-- Check all entity codes to verify the format
SELECT 
    id, 
    name, 
    entity_code,
    -- Extract the number part of the entity code
    SUBSTRING(entity_code FROM POSITION('-' IN entity_code) + 1) AS number_part,
    -- Determine if the format is correct (4 digits after the hyphen)
    LENGTH(SUBSTRING(entity_code FROM POSITION('-' IN entity_code) + 1)) = 4 
        AND SUBSTRING(entity_code FROM POSITION('-' IN entity_code) + 1) ~ '^[0-9]{4}$' 
        AS has_correct_format
FROM 
    entities
ORDER BY 
    client_id, 
    entity_code
LIMIT 50;

-- Count of entities with correct and incorrect format
SELECT 
    COUNT(*) AS total_entities,
    SUM(CASE 
          WHEN LENGTH(SUBSTRING(entity_code FROM POSITION('-' IN entity_code) + 1)) = 4 
               AND SUBSTRING(entity_code FROM POSITION('-' IN entity_code) + 1) ~ '^[0-9]{4}$' 
          THEN 1 
          ELSE 0 
        END) AS entities_with_correct_format,
    SUM(CASE 
          WHEN LENGTH(SUBSTRING(entity_code FROM POSITION('-' IN entity_code) + 1)) != 4 
               OR SUBSTRING(entity_code FROM POSITION('-' IN entity_code) + 1) !~ '^[0-9]{4}$' 
          THEN 1 
          ELSE 0 
        END) AS entities_with_incorrect_format
FROM 
    entities;
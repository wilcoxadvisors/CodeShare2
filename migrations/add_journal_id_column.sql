-- Add journal_id column to journal_entries table
ALTER TABLE journal_entries ADD COLUMN journal_id INTEGER;
ALTER TABLE journal_entries ADD CONSTRAINT journal_entries_journal_id_journals_id_fk FOREIGN KEY (journal_id) REFERENCES journals(id);
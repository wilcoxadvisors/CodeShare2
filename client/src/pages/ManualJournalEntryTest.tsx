import React from 'react';
import ManualJournalEntry from '../components/forms/ManualJournalEntry';

export default function ManualJournalEntryTest() {
  return (
    <div className="container mx-auto py-6 px-4">
      <h1 className="text-2xl font-bold mb-6">Manual Journal Entry Form</h1>
      <ManualJournalEntry />
    </div>
  );
}
// src/components/sections/ChecklistSection.jsx
import React from 'react';

export default function ChecklistSection({ setShowChecklistForm }) {
  return (
    <section className="py-16 bg-gray-100">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 w-full text-center">
        <h2 className="text-3xl font-bold text-blue-800 mb-4">Free Financial Checklist</h2>
        <p className="text-lg text-gray-700 mb-6 max-w-2xl mx-auto">
          Download our checklist to streamline your small business finances—simple steps to save time and money!
        </p>
        <button 
          onClick={() => setShowChecklistForm(true)} 
          className="bg-blue-800 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-900 transition duration-200"
        >
          Get It Now
        </button>
      </div>
    </section>
  );
}

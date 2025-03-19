// src/components/sections/TestimonialsSection.jsx
import React from 'react';

export default function TestimonialsSection() {
  return (
    <section className="py-16 bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 w-full">
        <h2 className="text-3xl font-bold text-blue-800 mb-10 text-center">What Small Businesses Say</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-gray-50 p-6 rounded-lg shadow-sm">
            <p className="text-gray-700 italic">"Wilcox Advisors made our finances manageable—perfect for my small shop!"</p>
            <p className="mt-4 text-gray-900 font-medium">— Local Retail Owner</p>
          </div>
          <div className="bg-gray-50 p-6 rounded-lg shadow-sm">
            <p className="text-gray-700 italic">"Their cash flow help kept my startup alive. Amazing support!"</p>
            <p className="mt-4 text-gray-900 font-medium">— Tech Founder</p>
          </div>
        </div>
      </div>
    </section>
  );
}

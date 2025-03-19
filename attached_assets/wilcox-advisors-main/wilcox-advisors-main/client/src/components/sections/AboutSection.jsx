// src/components/sections/AboutSection.jsx
import React from 'react';

export default function AboutSection({ aboutText }) {
  return (
    <section id="about" className="py-16 bg-gray-100">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 w-full text-center">
        <h2 className="text-3xl font-bold text-blue-800 mb-8">About Wilcox Advisors</h2>
        <p className="text-lg text-gray-700 max-w-3xl mx-auto">{aboutText}</p>
      </div>
    </section>
  );
}

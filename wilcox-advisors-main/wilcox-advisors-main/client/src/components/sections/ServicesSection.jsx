// src/components/sections/ServicesSection.jsx
import React from 'react';

export default function ServicesSection({ servicesList }) {
  return (
    <section id="services" className="py-16 bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 w-full">
        <h2 className="text-3xl font-bold text-blue-800 mb-10 text-center">Our Small Business Services</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {servicesList.map((service) => (
            <div key={service.id} className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition duration-200">
              <h3 className="text-xl font-semibold text-gray-900 mb-3">{service.title}</h3>
              <p className="text-gray-600">{service.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

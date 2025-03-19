import React from 'react';

const StatsSection = () => {
  return (
    <section className="py-12 bg-gray-50">
      <div className="max-w-6xl mx-auto px-4">
        <div className="bg-white shadow-md rounded-md overflow-hidden border-l-4 border-blue-800">
          <div className="p-8">
            <div className="text-center mb-4">
              <div className="bg-gray-200 py-4 mb-6 rounded">Business Analytics Image</div>
            </div>
            
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Maximize Your Financial Potential</h2>
            <p className="text-gray-700 mb-8">
              Our strategic approach to financial management has helped businesses increase profitability by an
              average of 24% in the first year.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-800">98%</div>
                <div className="text-gray-600">Client Retention</div>
              </div>
              
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-800">24%</div>
                <div className="text-gray-600">Profit Increase</div>
              </div>
              
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-800">15+</div>
                <div className="text-gray-600">Years Experience</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default StatsSection;
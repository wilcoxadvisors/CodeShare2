import React from 'react';

const LeadershipSection = () => {
  return (
    <section className="py-16 bg-white">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Our Leadership Team</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Sarah Wilcox */}
          <div className="flex flex-col">
            <div className="bg-gray-200 aspect-square rounded-md mb-4 flex items-center justify-center">
              <div className="h-20 w-20 bg-gray-300 rounded-full flex items-center justify-center">
                <span className="text-gray-600 text-xl font-medium">SW</span>
              </div>
            </div>
            <h3 className="text-xl font-semibold mb-1">Sarah Wilcox</h3>
            <p className="text-blue-800 font-medium mb-3">Founder & CEO</p>
            <p className="text-gray-600 text-sm">
              With over 20 years of accounting and financial advisory experience, Sarah founded Wilcox Advisors with a vision to empower small businesses through strategic financial guidance.
            </p>
          </div>
          
          {/* Michael Chen */}
          <div className="flex flex-col">
            <div className="bg-gray-200 aspect-square rounded-md mb-4 flex items-center justify-center">
              <div className="h-20 w-20 bg-gray-300 rounded-full flex items-center justify-center">
                <span className="text-gray-600 text-xl font-medium">MC</span>
              </div>
            </div>
            <h3 className="text-xl font-semibold mb-1">Michael Chen</h3>
            <p className="text-blue-800 font-medium mb-3">Senior Tax Advisor</p>
            <p className="text-gray-600 text-sm">
              Michael specializes in tax planning and compliance for small businesses, with expertise in minimizing tax liabilities while ensuring full regulatory compliance.
            </p>
          </div>
          
          {/* Jessica Rodriguez */}
          <div className="flex flex-col">
            <div className="bg-gray-200 aspect-square rounded-md mb-4 flex items-center justify-center">
              <div className="h-20 w-20 bg-gray-300 rounded-full flex items-center justify-center">
                <span className="text-gray-600 text-xl font-medium">JR</span>
              </div>
            </div>
            <h3 className="text-xl font-semibold mb-1">Jessica Rodriguez</h3>
            <p className="text-blue-800 font-medium mb-3">Financial Controller</p>
            <p className="text-gray-600 text-sm">
              Jessica brings 15 years of experience in financial reporting and analysis, helping clients transform financial data into actionable business insights.
            </p>
          </div>
          
          {/* David Thompson */}
          <div className="flex flex-col">
            <div className="bg-gray-200 aspect-square rounded-md mb-4 flex items-center justify-center">
              <div className="h-20 w-20 bg-gray-300 rounded-full flex items-center justify-center">
                <span className="text-gray-600 text-xl font-medium">DT</span>
              </div>
            </div>
            <h3 className="text-xl font-semibold mb-1">David Thompson</h3>
            <p className="text-blue-800 font-medium mb-3">Business Advisory Lead</p>
            <p className="text-gray-600 text-sm">
              David focuses on strategic planning and growth initiatives, helping businesses identify opportunities and develop sustainable growth strategies.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default LeadershipSection;
import React, { useState } from 'react';

const ChecklistSection = () => {
  const [checkedItems, setCheckedItems] = useState({});
  
  const checklistItems = [
    {
      id: 1,
      title: 'Financial Statements & Reporting',
      description: 'Regular, accurate financial statements are the foundation of sound business decisions.',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      )
    },
    {
      id: 2,
      title: 'Tax Planning & Compliance',
      description: 'Strategic tax planning can significantly impact your bottom line and future growth.',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
        </svg>
      )
    },
    {
      id: 3,
      title: 'Cash Flow Management',
      description: 'Effective cash flow management ensures your business can meet obligations and invest in growth.',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    },
    {
      id: 4,
      title: 'Business Valuation',
      description: 'Knowing your business\'s true value is essential for strategic planning, financing, or exit strategies.',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      )
    },
    {
      id: 5,
      title: 'Strategic Business Planning',
      description: 'A well-crafted business plan aligns your team and provides a roadmap for achieving your goals.',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      )
    },
    {
      id: 6,
      title: 'Retirement & Succession Planning',
      description: 'Planning for the future ensures business continuity and secures your financial well-being.',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      )
    },
  ];
  
  const handleCheckboxChange = (id) => {
    setCheckedItems(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };
  
  const checkedCount = Object.values(checkedItems).filter(Boolean).length;
  
  return (
    <section className="py-20 bg-gray-50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Financial Success Checklist</h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            How many of these crucial financial practices have you implemented in your business? Check all that apply to see where Wilcox Advisors can help strengthen your financial foundation.
          </p>
        </div>
        
        <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-md p-8">
          <div className="grid gap-6">
            {checklistItems.map((item) => (
              <div 
                key={item.id} 
                className={`flex items-start p-4 border rounded-lg transition-all duration-300 ${
                  checkedItems[item.id] 
                    ? 'border-green-500 bg-green-50' 
                    : 'border-gray-200 hover:border-blue-300'
                }`}
              >
                <div className="flex-shrink-0 mr-3">
                  <div
                    className={`w-6 h-6 border rounded flex items-center justify-center cursor-pointer ${
                      checkedItems[item.id] 
                        ? 'bg-green-500 border-green-500 text-white' 
                        : 'border-gray-300'
                    }`}
                    onClick={() => handleCheckboxChange(item.id)}
                  >
                    {checkedItems[item.id] && (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex items-center mb-1">
                    <div className="mr-2 text-blue-800">
                      {item.icon}
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900">{item.title}</h3>
                  </div>
                  <p className="text-gray-600">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-8 pt-6 border-t border-gray-200">
            <div className="flex flex-col sm:flex-row items-center justify-between">
              <div className="mb-4 sm:mb-0">
                <div className="text-gray-700">
                  You've checked <span className="font-bold text-blue-800">{checkedCount}</span> out of <span className="font-bold">{checklistItems.length}</span> items
                </div>
                <div className="mt-2 bg-gray-200 h-2 rounded-full overflow-hidden">
                  <div 
                    className="bg-blue-800 h-full transition-all duration-500"
                    style={{ width: `${(checkedCount / checklistItems.length) * 100}%` }}
                  ></div>
                </div>
              </div>
              <a 
                href="#contact" 
                className="px-6 py-3 bg-blue-800 text-white font-medium rounded-md hover:bg-blue-700 transition-colors"
              >
                Get Expert Help
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ChecklistSection;
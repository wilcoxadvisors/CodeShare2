import React, { useState } from 'react';

const ChecklistSection = () => {
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    companyName: '',
    revenueRange: ''
  });
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('Form submitted:', formData);
    // Here you would typically send the data to your backend
    setIsSubmitted(true);
    
    // Reset form after 3 seconds
    setTimeout(() => {
      setIsSubmitted(false);
      setShowModal(false);
      setFormData({
        name: '',
        email: '',
        companyName: '',
        revenueRange: ''
      });
    }, 3000);
  };

  return (
    <section className="w-full py-16 bg-gray-100">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Free Financial Checklist
          </h2>
          <p className="text-lg text-gray-700 mb-8">
            Get our comprehensive checklist to help streamline your business finances. This valuable resource will guide you through key steps to optimize your financial processes and identify areas for improvement.
          </p>
          <button
            onClick={() => setShowModal(true)}
            className="px-6 py-3 bg-blue-800 text-white rounded-md font-semibold hover:bg-blue-700 transition-colors"
          >
            Get It Now
          </button>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-900">
                Get Your Free Financial Checklist
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {isSubmitted ? (
              <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
                <p>Thank you! Your checklist has been sent to your email.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <div className="mb-4">
                  <label htmlFor="name" className="block text-gray-700 font-medium mb-2">
                    Name *
                  </label>
                  <input
                    id="name"
                    type="text"
                    name="name"
                    required
                    value={formData.name}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div className="mb-4">
                  <label htmlFor="email" className="block text-gray-700 font-medium mb-2">
                    Email *
                  </label>
                  <input
                    id="email"
                    type="email"
                    name="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div className="mb-4">
                  <label htmlFor="companyName" className="block text-gray-700 font-medium mb-2">
                    Company Name *
                  </label>
                  <input
                    id="companyName"
                    type="text"
                    name="companyName"
                    required
                    value={formData.companyName}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div className="mb-6">
                  <label htmlFor="revenueRange" className="block text-gray-700 font-medium mb-2">
                    Revenue Range *
                  </label>
                  <select
                    id="revenueRange"
                    name="revenueRange"
                    required
                    value={formData.revenueRange}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="">Select a range...</option>
                    <option value="under100k">Under $100k</option>
                    <option value="100k-500k">$100k - $500k</option>
                    <option value="500k-1m">$500k - $1M</option>
                    <option value="1m-5m">$1M - $5M</option>
                    <option value="over5m">Over $5M</option>
                  </select>
                </div>
                <button
                  type="submit"
                  className="w-full px-4 py-2 bg-blue-800 text-white rounded-md font-semibold hover:bg-blue-700 transition-colors"
                >
                  Submit
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </section>
  );
};

export default ChecklistSection;
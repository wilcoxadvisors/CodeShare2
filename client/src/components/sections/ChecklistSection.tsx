import React, { useState } from 'react';
import { X, CheckCircle, Download } from 'lucide-react';

interface ChecklistSectionProps {
  setShowChecklistForm?: (show: boolean) => void;
}

const ChecklistSection: React.FC<ChecklistSectionProps> = ({ setShowChecklistForm }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    revenueRange: ''
  });
  
  const [showModal, setShowModal] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prevData => ({
      ...prevData,
      [name]: value
    }));
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Submit to our backend API
      const response = await fetch('/api/checklist', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });
      
      if (!response.ok) {
        throw new Error('Failed to submit form');
      }
      
      const data = await response.json();
      console.log('Form submitted successfully:', data);
      
      // Store the download URL if provided
      if (data.downloadUrl) {
        setDownloadUrl(data.downloadUrl);
      }
      
      setSubmitted(true);
      
      // Only reset form after 10 seconds, keeping the download URL available
      setTimeout(() => {
        setSubmitted(false);
        setShowModal(false);
        setDownloadUrl(null);
        setFormData({
          name: '',
          email: '',
          company: '',
          revenueRange: ''
        });
      }, 10000);
    } catch (error) {
      console.error('Error submitting checklist form:', error);
      alert('There was an error submitting the form. Please try again.');
    }
  };
  
  return (
    <section className="py-20 bg-gray-50 relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-blue-100 rounded-full opacity-20 -mr-32 -mt-32"></div>
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-100 rounded-full opacity-20 -ml-32 -mb-32"></div>
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="bg-white rounded-2xl shadow-xl p-10 max-w-4xl mx-auto">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Free Financial Checklist</h2>
            <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
              Download our checklist to streamline your small business finances—simple steps to save time and money!
            </p>
            <button 
              onClick={() => setShowModal(true)}
              className="bg-[#1E3A8A] text-white px-8 py-4 rounded font-medium hover:bg-blue-700 transition-colors shadow-md"
            >
              Get It Now
            </button>
          </div>
        </div>
      </div>
      
      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-8 max-w-md w-full relative">
            <button 
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-800"
            >
              <X className="h-6 w-6" />
            </button>
            
            {submitted ? (
              <div className="text-center py-8">
                <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Thank You!</h3>
                <p className="text-gray-600 mb-4">
                  Your financial checklist is ready for download!
                </p>
                {downloadUrl && (
                  <a 
                    href={downloadUrl}
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center bg-[#1E3A8A] text-white px-6 py-3 rounded font-medium hover:bg-blue-700 transition-colors shadow-md"
                  >
                    <Download className="h-5 w-5 mr-2" />
                    Download Your Checklist
                  </a>
                )}
              </div>
            ) : (
              <>
                <h3 className="text-xl font-bold text-gray-900 mb-4">Get Your Free Financial Checklist</h3>
                <p className="text-gray-600 mb-6">
                  Fill out the form below to receive our comprehensive financial checklist for small businesses.
                </p>
                
                <form onSubmit={handleSubmit}>
                  <div className="mb-4">
                    <label htmlFor="name" className="block text-gray-700 font-medium mb-2">
                      Full Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  
                  <div className="mb-4">
                    <label htmlFor="email" className="block text-gray-700 font-medium mb-2">
                      Email Address <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  
                  <div className="mb-4">
                    <label htmlFor="company" className="block text-gray-700 font-medium mb-2">
                      Company Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="company"
                      name="company"
                      value={formData.company}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  
                  <div className="mb-6">
                    <label htmlFor="revenueRange" className="block text-gray-700 font-medium mb-2">
                      Annual Revenue Range <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="revenueRange"
                      name="revenueRange"
                      value={formData.revenueRange}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <option value="">Select Revenue Range</option>
                      <option value="0-100k">$0 - $100,000</option>
                      <option value="100k-500k">$100,000 - $500,000</option>
                      <option value="500k-1m">$500,000 - $1 Million</option>
                      <option value="1m-5m">$1 Million - $5 Million</option>
                      <option value="5m+">$5 Million+</option>
                    </select>
                  </div>
                  
                  <button
                    type="submit"
                    className="w-full bg-[#1E3A8A] text-white font-medium py-3 rounded hover:bg-blue-700 transition-colors"
                  >
                    Download Checklist
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </section>
  );
};

export default ChecklistSection;
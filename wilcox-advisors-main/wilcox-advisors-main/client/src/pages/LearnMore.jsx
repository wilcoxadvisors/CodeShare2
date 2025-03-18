import React from 'react';
import { useNavigate } from 'react-router-dom';

function LearnMore() {
  const navigate = useNavigate();

  const handleContactClick = () => {
    // Navigate to home page first
    navigate('/');
    
    // Then scroll to contact section after a short delay to ensure page loads
    setTimeout(() => {
      const contactSection = document.getElementById('contact');
      if (contactSection) {
        contactSection.scrollIntoView({ behavior: 'smooth' });
      }
    }, 100);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-12">
        <section className="space-y-6">
          <p className="text-lg text-gray-700 leading-relaxed">
            Wilcox Advisors specializes in providing top-tier financial and accounting services tailored for small businesses. 
            Our expert team is dedicated to helping you save money, manage your finances effectively, and drive business growth.
          </p>
          <p className="text-lg text-gray-700 leading-relaxed">
            Explore our comprehensive services, including bookkeeping, cash flow management, custom reporting, budgeting & forecasting, 
            monthly financial packages, and outsourced controller/CFO support. Whether you're a startup or a growing company, 
            we offer solutions designed to scale with your business needs. Contact us today to discover how we can help your business thrive!
          </p>
          <div className="mt-8">
            <button
              onClick={handleContactClick}
              className="bg-blue-800 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-900 transition duration-200"
            >
              Contact Us
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}

export default LearnMore;

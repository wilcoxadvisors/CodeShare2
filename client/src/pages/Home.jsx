import React, { useState } from 'react';

// Since we might not have the component files yet, we'll use placeholder components
const TestimonialsSection = () => (
  <section id="testimonials" className="py-16 bg-gray-50">
    <div className="container mx-auto px-4">
      <h2 className="text-3xl font-bold text-center mb-8">Client Testimonials</h2>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
        <div className="bg-white p-6 rounded-lg shadow">
          <p className="italic mb-4">
            "Wilcox Advisors transformed our financial processes, saving us time and money. Their expertise has been invaluable to our business growth."
          </p>
          <div>
            <p className="font-semibold">Sarah Johnson</p>
            <p className="text-sm text-gray-600">CEO, Tech Solutions Inc.</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <p className="italic mb-4">
            "Working with the team at Wilcox has been a game-changer for our small business. They've helped us navigate complex tax situations with ease."
          </p>
          <div>
            <p className="font-semibold">Michael Robertson</p>
            <p className="text-sm text-gray-600">Owner, Robertson Retail</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow">
          <p className="italic mb-4">
            "The financial insights provided by Wilcox Advisors have helped us make better business decisions. Highly recommend their services!"
          </p>
          <div>
            <p className="font-semibold">Lisa Chen</p>
            <p className="text-sm text-gray-600">CFO, Healthcare Partners</p>
          </div>
        </div>
      </div>
    </div>
  </section>
);

const ContactSection = () => (
  <section id="contact" className="py-16 bg-white">
    <div className="container mx-auto px-4">
      <div className="max-w-3xl mx-auto">
        <h2 className="text-3xl font-bold text-center mb-8">Contact Us</h2>
        <form className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="name" className="block mb-2 text-sm font-medium">Name</label>
              <input 
                type="text" 
                id="name" 
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" 
                required 
              />
            </div>
            <div>
              <label htmlFor="email" className="block mb-2 text-sm font-medium">Email</label>
              <input 
                type="email" 
                id="email" 
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" 
                required 
              />
            </div>
          </div>
          <div>
            <label htmlFor="message" className="block mb-2 text-sm font-medium">Message</label>
            <textarea 
              id="message" 
              rows="4" 
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" 
              required
            ></textarea>
          </div>
          <button 
            type="submit" 
            className="w-full bg-[#1E3A8A] text-white py-3 rounded-md hover:bg-blue-800 transition-colors"
          >
            Send Message
          </button>
        </form>
      </div>
    </div>
  </section>
);

const ChatWidget = ({ isOpen, onClose }) => (
  <div className={`fixed bottom-4 right-4 bg-white rounded-lg shadow-xl w-80 z-50 transition-all ${isOpen ? 'block' : 'hidden'}`}>
    <div className="bg-[#1E3A8A] text-white p-4 rounded-t-lg flex justify-between items-center">
      <h3 className="font-medium">Chat with Us</h3>
      <button onClick={onClose} className="text-white hover:text-gray-200">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </button>
    </div>
    <div className="p-4 h-64 overflow-y-auto border-b">
      <div className="mb-3">
        <div className="bg-gray-100 p-3 rounded-lg inline-block">
          <p className="text-sm">Hi there! How can I help with your financial needs today?</p>
        </div>
      </div>
      {/* Chat messages will be displayed here */}
    </div>
    <div className="p-4">
      <div className="flex items-center">
        <input 
          type="text" 
          placeholder="Type your message..." 
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button className="ml-2 bg-[#1E3A8A] text-white p-2 rounded-lg">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
          </svg>
        </button>
      </div>
    </div>
  </div>
);

const HeroSection = ({ onConsultClick }) => {
  return (
    <section className="bg-[#1E3A8A] py-24 relative overflow-hidden">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white rounded-full -mr-48 -mt-48"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-white rounded-full -ml-48 -mb-48"></div>
      </div>
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="grid md:grid-cols-1 gap-12 items-center">
          <div className="text-white text-center max-w-3xl mx-auto">
            <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
              Financial Expertise for Your Business Success
            </h1>
            <p className="text-xl mb-10 text-blue-100">
              Professional accounting and financial services tailored for small businesses. We handle the numbers so you can focus on growth.
            </p>
            <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-6 justify-center">
              <button 
                onClick={onConsultClick}
                className="bg-white text-[#1E3A8A] hover:bg-blue-50 transition-colors px-8 py-4 rounded-full font-medium text-center shadow-lg"
              >
                Schedule Free Consultation
              </button>
              <a 
                href="#services" 
                className="border-2 border-white text-white hover:bg-white hover:text-[#1E3A8A] transition-colors px-8 py-4 rounded-full font-medium text-center"
              >
                Learn More
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

const ServicesSection = () => {
  const services = [
    {
      title: "Tax Planning & Preparation",
      description: "Strategic tax planning and preparation services for businesses and individuals to minimize tax liabilities while ensuring full compliance.",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-14 w-14 text-[#1E3A8A] mb-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2zM10 8.5a.5.5 0 11-1 0 .5.5 0 011 0zm5 5a.5.5 0 11-1 0 .5.5 0 011 0z" />
        </svg>
      )
    },
    {
      title: "Accounting & Bookkeeping",
      description: "Comprehensive accounting services including bookkeeping, financial statement preparation, and management reporting tailored to your business needs.",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-14 w-14 text-[#1E3A8A] mb-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    },
    {
      title: "Business Advisory",
      description: "Expert guidance on financial management, business growth strategies, budgeting, forecasting, and operational efficiency improvements.",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-14 w-14 text-[#1E3A8A] mb-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
      )
    },
    {
      title: "Audit & Assurance",
      description: "Professional audit services providing independent assessments of financial statements and internal controls to enhance credibility with stakeholders.",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-14 w-14 text-[#1E3A8A] mb-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      )
    },
    {
      title: "Financial Planning",
      description: "Personalized financial planning services to help you achieve your long-term financial goals through investment strategies and retirement planning.",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-14 w-14 text-[#1E3A8A] mb-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      )
    },
    {
      title: "CFO Services",
      description: "Part-time CFO services providing expert financial leadership, strategic planning, and management without the cost of a full-time executive.",
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-14 w-14 text-[#1E3A8A] mb-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      )
    }
  ];

  return (
    <section id="services" className="py-16 bg-gray-50 relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute bottom-0 right-0 w-72 h-72 bg-blue-100 rounded-full opacity-20 -mr-20 -mb-20 transform rotate-45"></div>
      <div className="absolute top-0 left-0 w-72 h-72 bg-blue-100 rounded-full opacity-20 -ml-20 -mt-20"></div>
      
      <div className="max-w-6xl mx-auto px-4 relative z-10">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold text-[#1E3A8A] mb-4">Our Services</h2>
          <p className="text-lg text-gray-700 leading-relaxed max-w-2xl mx-auto">
            We offer a comprehensive range of financial and accounting services designed to support your business at every stage of growth.
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {services.map((service, index) => (
            <div 
              key={index} 
              className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition duration-200 flex flex-col h-full"
            >
              <div className="flex justify-center">{service.icon}</div>
              <h3 className="text-xl font-bold text-[#1E3A8A] mb-3 text-center">{service.title}</h3>
              <p className="text-gray-700 leading-relaxed text-center">{service.description}</p>
              <div className="mt-4 pt-4 border-t border-gray-100 text-center mt-auto">
                <a 
                  href="#contact" 
                  className="text-[#1E3A8A] hover:text-[#1E40AF] hover:underline font-medium transition duration-200"
                >
                  Learn more →
                </a>
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-12 text-center">
          <a 
            href="#contact" 
            className="inline-block bg-[#1E3A8A] text-white px-6 py-3 rounded-lg hover:bg-[#1E40AF] transition duration-200 font-medium shadow-md"
          >
            Request a Consultation
          </a>
        </div>
      </div>
    </section>
  );
};

const FreeFinancialChecklist = () => {
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
            <button className="bg-[#1E3A8A] text-white px-8 py-4 rounded-full font-medium hover:bg-blue-700 transition-colors shadow-md">
              Get It Now
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

const StatsSection = () => {
  return (
    <section className="py-20 bg-[#1E3A8A] text-white relative overflow-hidden">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute bottom-0 right-0 w-72 h-72 bg-white rounded-full -mr-20 -mb-20"></div>
        <div className="absolute top-0 left-0 w-72 h-72 bg-white rounded-full -ml-20 -mt-20"></div>
      </div>
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="flex flex-wrap justify-center">
          <div className="flex flex-col md:flex-row md:flex-wrap md:justify-around w-full">
            <div className="text-center px-8 py-6 md:w-1/4">
              <div className="text-5xl font-bold mb-3">15+</div>
              <p className="text-blue-100 font-light text-lg">Years in Business</p>
            </div>
            
            <div className="text-center px-8 py-6 md:w-1/4">
              <div className="text-5xl font-bold mb-3">500+</div>
              <p className="text-blue-100 font-light text-lg">Satisfied Clients</p>
            </div>
            
            <div className="text-center px-8 py-6 md:w-1/4">
              <div className="text-5xl font-bold mb-3">$100M+</div>
              <p className="text-blue-100 font-light text-lg">Tax Savings Delivered</p>
            </div>
            
            <div className="text-center px-8 py-6 md:w-1/4">
              <div className="text-5xl font-bold mb-3">25+</div>
              <p className="text-blue-100 font-light text-lg">Industry Experts</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

const AboutSection = () => {
  return (
    <section id="about" className="py-16 bg-white relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute top-0 right-0 w-72 h-72 bg-blue-100 rounded-full opacity-10 -mr-20 -mt-20 transform rotate-45"></div>
      
      <div className="max-w-6xl mx-auto px-4 relative z-10">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-[#1E3A8A] mb-4">About Wilcox Advisors</h2>
            <p className="text-lg text-gray-700 leading-relaxed">
              Founded in 2005, Wilcox Advisors has grown from a small accounting practice to a comprehensive financial advisory firm serving businesses across multiple industries.
            </p>
          </div>
          
          <div className="bg-gray-50 rounded-lg shadow-md p-8 mb-8">
            <div className="space-y-6">
              <p className="text-lg text-gray-700 leading-relaxed">
                Our team of experienced CPAs, financial analysts, and business advisors brings decades of combined expertise to help our clients navigate complex financial challenges and capitalize on opportunities for growth.
              </p>
              <p className="text-lg text-gray-700 leading-relaxed">
                What sets us apart is our commitment to building lasting relationships with our clients, providing personalized service, and delivering innovative solutions that drive real business results.
              </p>
            </div>
          </div>
          
          <div className="grid md:grid-cols-2 gap-6 mt-10">
            <div className="bg-white border border-gray-100 shadow-sm rounded-lg p-5 flex items-center hover:shadow-md transition duration-200">
              <div className="bg-blue-100 p-3 rounded-full mr-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-[#1E3A8A]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <span className="text-gray-700 font-medium">Certified Professionals</span>
            </div>
            
            <div className="bg-white border border-gray-100 shadow-sm rounded-lg p-5 flex items-center hover:shadow-md transition duration-200">
              <div className="bg-blue-100 p-3 rounded-full mr-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-[#1E3A8A]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <span className="text-gray-700 font-medium">Tailored Solutions</span>
            </div>
            
            <div className="bg-white border border-gray-100 shadow-sm rounded-lg p-5 flex items-center hover:shadow-md transition duration-200">
              <div className="bg-blue-100 p-3 rounded-full mr-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-[#1E3A8A]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <span className="text-gray-700 font-medium">Industry Expertise</span>
            </div>
            
            <div className="bg-white border border-gray-100 shadow-sm rounded-lg p-5 flex items-center hover:shadow-md transition duration-200">
              <div className="bg-blue-100 p-3 rounded-full mr-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-[#1E3A8A]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <span className="text-gray-700 font-medium">Client-First Approach</span>
            </div>
          </div>
          
          {/* No button here - removed Meet Our Team button */}
        </div>
      </div>
    </section>
  );
};

const Home = ({ setShowConsultationForm }) => {
  const [showChat, setShowChat] = useState(false);

  const handleConsultClick = () => {
    if (setShowConsultationForm) {
      setShowConsultationForm(true);
    }
  };

  return (
    <div>
      <HeroSection onConsultClick={handleConsultClick} />
      <FreeFinancialChecklist />
      <ServicesSection />
      <AboutSection />
      <TestimonialsSection />
      <ContactSection />
      <ChatWidget isOpen={showChat} onClose={() => setShowChat(false)} />
      
      {/* This button would typically be positioned in a fixed spot at bottom right */}
      <button 
        onClick={() => setShowChat(true)}
        className="fixed bottom-4 right-4 bg-[#1E3A8A] text-white p-3 rounded-full shadow-lg z-40"
        style={{ display: showChat ? 'none' : 'block' }}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
        </svg>
      </button>
    </div>
  );
};

export default Home;
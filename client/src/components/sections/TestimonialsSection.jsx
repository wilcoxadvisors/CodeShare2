import React from 'react';

const TestimonialsSection = () => {
  const testimonials = [
    {
      id: 1,
      name: 'Sarah Thompson',
      company: 'GreenTech Solutions',
      position: 'CFO',
      quote: 'Wilcox Advisors transformed our financial operations. Their strategic guidance helped us optimize cash flow and identify growth opportunities we hadn\'t considered.',
      image: 'https://images.unsplash.com/photo-1597223557154-721c1cecc4b0?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=300&q=80'
    },
    {
      id: 2,
      name: 'Marcus Daniels',
      company: 'Radius Construction',
      position: 'Owner',
      quote: 'The tax planning strategies implemented by Wilcox Advisors saved our company significant money while ensuring full compliance. Their proactive approach is refreshing.',
      image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=300&q=80'
    },
    {
      id: 3,
      name: 'Jennifer Wu',
      company: 'Innovate Health',
      position: 'CEO',
      quote: 'As a healthcare startup, we needed financial advisors who understood our industry challenges. Wilcox provides insights that directly impact our business decisions and growth trajectory.',
      image: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=300&q=80'
    },
  ];

  return (
    <section className="bg-blue-800 py-20">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-white mb-4">Client Success Stories</h2>
          <p className="text-xl text-blue-100 max-w-3xl mx-auto">
            See what our clients have to say about how our financial advisory services have helped transform their businesses.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          {testimonials.map((testimonial) => (
            <div key={testimonial.id} className="bg-white rounded-lg p-8 shadow-xl">
              <div className="flex items-center mb-6">
                <img 
                  src={testimonial.image} 
                  alt={testimonial.name} 
                  className="h-16 w-16 rounded-full object-cover mr-4"
                />
                <div>
                  <h4 className="text-lg font-bold text-gray-900">{testimonial.name}</h4>
                  <p className="text-blue-800">{testimonial.position}, {testimonial.company}</p>
                </div>
              </div>
              <div className="relative">
                <svg 
                  className="absolute -top-4 -left-4 h-10 w-10 text-blue-800 opacity-20" 
                  fill="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
                </svg>
                <p className="text-gray-600 relative z-10">
                  "{testimonial.quote}"
                </p>
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-16 text-center">
          <a 
            href="#contact" 
            className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-blue-800 bg-white hover:bg-gray-100 transition-colors"
          >
            Become a Success Story
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              className="h-5 w-5 ml-2" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M14 5l7 7m0 0l-7 7m7-7H3" 
              />
            </svg>
          </a>
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;
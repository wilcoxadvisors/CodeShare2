import React from 'react';

const TestimonialsSection = () => {
  const testimonials = [
    {
      id: 1,
      name: 'Jennifer Martinez',
      company: 'Bright Home Designs',
      position: 'Founder & CEO',
      text: 'Wilcox Advisors transformed our financial management. Their strategic guidance helped us improve cash flow and make better business decisions. Highly recommend their services to any growing business.',
      image: '/images/testimonials/jennifer.jpg'
    },
    {
      id: 2,
      name: 'Robert Wilson',
      company: 'Tech Solutions Inc.',
      position: 'CFO',
      text: 'Working with the Wilcox team has been a game-changer for our company. Their attention to detail and proactive tax planning has saved us thousands. They truly understand the challenges tech startups face.',
      image: '/images/testimonials/robert.jpg'
    },
    {
      id: 3,
      name: 'Amanda Johnson',
      company: 'Green Earth Landscaping',
      position: 'Owner',
      text: 'As a small business owner, I needed accounting help that was both affordable and professional. Wilcox Advisors delivered exactly that. They have helped me organize my finances and plan for growth.',
      image: '/images/testimonials/amanda.jpg'
    }
  ];

  return (
    <section id="testimonials" className="py-20 bg-blue-800 text-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">Client Success Stories</h2>
          <p className="text-lg text-blue-100 max-w-2xl mx-auto">
            Hear from businesses who have transformed their financial management with our services.
          </p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-8">
          {testimonials.map(testimonial => (
            <div 
              key={testimonial.id} 
              className="bg-blue-700 rounded-lg p-6 shadow-md"
            >
              <div className="mb-4 flex items-center">
                <div className="w-12 h-12 bg-blue-500 rounded-full mr-4 flex items-center justify-center text-white font-bold">
                  {testimonial.name.charAt(0)}
                </div>
                <div>
                  <h4 className="font-bold">{testimonial.name}</h4>
                  <p className="text-sm text-blue-200">{testimonial.position}, {testimonial.company}</p>
                </div>
              </div>
              
              <p className="italic text-blue-100">"{testimonial.text}"</p>
              
              <div className="mt-4 flex">
                {[...Array(5)].map((_, i) => (
                  <svg 
                    key={i} 
                    xmlns="http://www.w3.org/2000/svg" 
                    className="h-5 w-5 text-yellow-400" 
                    viewBox="0 0 20 20" 
                    fill="currentColor"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-12 text-center">
          <a 
            href="#contact" 
            className="inline-block bg-white text-blue-800 px-6 py-3 rounded-md font-medium hover:bg-gray-100 transition-colors"
          >
            Join Our Success Stories
          </a>
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;
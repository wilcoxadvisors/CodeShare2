import React, { useState } from 'react';

const TestimonialsSection = () => {
  const testimonials = [
    {
      id: 1,
      name: 'Jennifer Reynolds',
      company: 'TechStart Solutions',
      role: 'CEO',
      text: 'Wilcox Advisors transformed our financial operations completely. Their strategic guidance helped us increase profitability by 28% in just one year.',
      rating: 5
    },
    {
      id: 2,
      name: 'Michael Donovan',
      company: 'GreenLeaf Landscaping',
      role: 'Owner',
      text: 'As a small business owner, I was struggling to keep up with finances while growing my company. The team at Wilcox Advisors simplified everything.',
      rating: 5
    },
    {
      id: 3,
      name: 'Sophia Chen',
      company: 'Innovative Retail Group',
      role: 'CFO',
      text: 'Their expertise in tax planning saved us over $45,000 last year alone. The team is responsive, thorough, and always ahead of regulatory changes.',
      rating: 5
    }
  ];

  const [activeIndex, setActiveIndex] = useState(0);

  const nextTestimonial = () => {
    setActiveIndex((prevIndex) => (prevIndex + 1) % testimonials.length);
  };

  const prevTestimonial = () => {
    setActiveIndex((prevIndex) => (prevIndex - 1 + testimonials.length) % testimonials.length);
  };

  // Function to render rating stars
  const renderRatingStars = (rating) => {
    return Array(5).fill(0).map((_, index) => (
      <svg 
        key={index} 
        xmlns="http://www.w3.org/2000/svg" 
        className={`h-5 w-5 ${index < rating ? 'text-yellow-400' : 'text-gray-300'}`}
        viewBox="0 0 20 20" 
        fill="currentColor"
      >
        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
      </svg>
    ));
  };

  return (
    <section id="testimonials" className="py-20 bg-blue-50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">What Our Clients Say</h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Don't just take our word for it. Hear directly from the businesses we've helped grow and succeed.
          </p>
        </div>
        
        {/* Testimonial Carousel */}
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-8">
            <div className="flex justify-center mb-4">
              {renderRatingStars(testimonials[activeIndex].rating)}
            </div>
            
            <p className="text-gray-600 italic mb-6 text-center text-lg">
              "{testimonials[activeIndex].text}"
            </p>
            
            <div className="text-center">
              <h4 className="font-bold text-gray-900">{testimonials[activeIndex].name}</h4>
              <p className="text-blue-800">{testimonials[activeIndex].role}, {testimonials[activeIndex].company}</p>
            </div>
          </div>
          
          {/* Navigation Controls */}
          <div className="flex justify-center mt-8 space-x-4">
            <button
              onClick={prevTestimonial}
              className="bg-white rounded-full p-2 shadow hover:bg-gray-50 transition-colors"
              aria-label="Previous testimonial"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            
            {/* Navigation Dots */}
            <div className="flex items-center space-x-2">
              {testimonials.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setActiveIndex(index)}
                  className={`w-3 h-3 rounded-full ${
                    index === activeIndex ? 'bg-blue-800' : 'bg-gray-300'
                  }`}
                  aria-label={`Go to testimonial ${index + 1}`}
                />
              ))}
            </div>
            
            <button
              onClick={nextTestimonial}
              className="bg-white rounded-full p-2 shadow hover:bg-gray-50 transition-colors"
              aria-label="Next testimonial"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
        
        {/* CTA Section */}
        <div className="mt-16 text-center">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Ready to experience the same results?</h3>
          <a 
            href="#contact" 
            className="inline-block bg-blue-800 text-white px-8 py-3 rounded-md font-medium hover:bg-blue-700 transition-colors"
          >
            Get Started Today
          </a>
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;
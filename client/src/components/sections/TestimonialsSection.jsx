import React from 'react';

const TestimonialsSection = () => {
  const testimonials = [
    {
      id: 1,
      quote: "Wilcox Advisors made our finances manageable—perfect for my small shop!",
      author: "Local Retail Owner"
    },
    {
      id: 2,
      quote: "Their cash flow help kept my startup alive. Amazing support!",
      author: "Tech Founder"
    },
    {
      id: 3,
      quote: "The monthly financial reports give me clarity I never had before. Highly recommend!",
      author: "Construction Company CEO"
    },
    {
      id: 4,
      quote: "They transformed our accounting process and saved us thousands in tax planning.",
      author: "Healthcare Practice Owner"
    }
  ];
  
  return (
    <section id="testimonials" className="py-16 bg-white">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-bold text-center text-blue-800 mb-12">What Small Businesses Say</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {testimonials.map(testimonial => (
            <div 
              key={testimonial.id} 
              className="bg-gray-50 p-6 rounded-lg border border-gray-100"
            >
              <p className="text-gray-700 italic mb-4">"{testimonial.quote}"</p>
              <p className="text-blue-800 font-medium">— {testimonial.author}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;
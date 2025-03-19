import React from 'react';

const TestimonialsSection = () => {
  const testimonials = [
    {
      quote: "Wilcox Advisors transformed our financial operations. Their team helped us implement effective accounting processes that saved us both time and money. We now have clear visibility into our financial health.",
      author: "Sarah Johnson",
      company: "Bright Innovations LLC"
    },
    {
      quote: "Working with Wilcox Advisors has been a game-changer for our business. Their expert guidance helped us navigate complex tax situations and develop a sustainable financial strategy for growth.",
      author: "Michael Chen",
      company: "Elevate Solutions"
    }
  ];

  return (
    <section className="w-full py-16 bg-white">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">
          What Small Businesses Say
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {testimonials.map((testimonial, index) => (
            <div key={index} className="bg-gray-50 p-6 rounded-lg shadow-sm">
              <p className="text-gray-700 italic mb-4">
                "{testimonial.quote}"
              </p>
              <div className="font-medium text-gray-900">
                {testimonial.author} - {testimonial.company}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;
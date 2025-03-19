import React from 'react';

interface Testimonial {
  quote: string;
  author: string;
  position: string;
  company: string;
}

interface TestimonialsSectionProps {
  testimonials?: Testimonial[];
}

const TestimonialsSection: React.FC<TestimonialsSectionProps> = ({ testimonials }) => {
  // Default testimonials if none provided
  const defaultTestimonials: Testimonial[] = [
    {
      quote: "Wilcox Advisors transformed our financial processes, saving us time and money. Their expertise has been invaluable to our business growth.",
      author: "Sarah Johnson",
      position: "CEO",
      company: "Tech Solutions Inc."
    },
    {
      quote: "Working with the team at Wilcox has been a game-changer for our small business. They've helped us navigate complex tax situations with ease.",
      author: "Michael Robertson",
      position: "Owner",
      company: "Robertson Retail"
    }
  ];

  const testimonialList = testimonials || defaultTestimonials;

  return (
    <section id="testimonials" className="py-16 bg-white">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">What Small Businesses Say</h2>
          <p className="text-gray-700 max-w-2xl mx-auto">
            Here's what our clients have to say about their experience working with Wilcox Advisors.
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 gap-8">
          {testimonialList.map((testimonial, index) => (
            <div key={index} className="bg-gray-50 p-6 rounded-lg shadow-sm">
              <p className="italic text-gray-700 mb-4">"{testimonial.quote}"</p>
              <div>
                <p className="font-medium text-gray-900">{testimonial.author}</p>
                <p className="text-sm text-gray-600">{testimonial.position}, {testimonial.company}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;
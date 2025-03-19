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
    },
    {
      quote: "The financial insights provided by Wilcox Advisors have helped us make better business decisions. Highly recommend their services!",
      author: "Lisa Chen",
      position: "CFO",
      company: "Healthcare Partners"
    }
  ];

  const testimonialList = testimonials || defaultTestimonials;

  return (
    <section id="testimonials" className="py-16 bg-white relative overflow-hidden">
      {/* Background pattern */}
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-blue-100 rounded-full opacity-10 -mr-48 -mb-48"></div>
      <div className="absolute top-0 left-0 w-96 h-96 bg-blue-100 rounded-full opacity-10 -ml-48 -mt-48"></div>
      
      <div className="max-w-6xl mx-auto px-4 relative z-10">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-blue-800 mb-4">Client Testimonials</h2>
          <p className="text-lg text-gray-700 max-w-2xl mx-auto">
            Don't just take our word for it. Here's what our clients have to say about working with Wilcox Advisors.
          </p>
        </div>
        
        <div className="grid md:grid-cols-3 gap-8">
          {testimonialList.map((testimonial, index) => (
            <div key={index} className="bg-gray-50 p-6 rounded-lg shadow-sm">
              <svg className="h-10 w-10 text-blue-300 mb-3" fill="currentColor" viewBox="0 0 32 32">
                <path d="M9.352 4C4.456 7.456 1 13.12 1 19.36c0 5.088 3.072 8.064 6.624 8.064 3.36 0 5.856-2.688 5.856-5.856 0-3.168-2.208-5.472-5.088-5.472-.576 0-1.344.096-1.536.192.48-3.264 3.552-7.104 6.624-9.024L9.352 4zm16.512 0c-4.8 3.456-8.256 9.12-8.256 15.36 0 5.088 3.072 8.064 6.624 8.064 3.264 0 5.856-2.688 5.856-5.856 0-3.168-2.304-5.472-5.184-5.472-.576 0-1.248.096-1.44.192.48-3.264 3.456-7.104 6.528-9.024L25.864 4z" />
              </svg>
              <p className="italic text-gray-700 mb-4">"{testimonial.quote}"</p>
              <div>
                <p className="font-semibold text-gray-900">{testimonial.author}</p>
                <p className="text-sm text-gray-600">{testimonial.position}, {testimonial.company}</p>
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-12 text-center">
          <a 
            href="#contact" 
            className="inline-block bg-blue-800 text-white px-6 py-3 rounded-lg hover:bg-blue-900 transition duration-200 font-medium shadow-md"
          >
            Start Your Financial Journey
          </a>
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;
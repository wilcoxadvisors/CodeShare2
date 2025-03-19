import React from 'react';

const AboutSection = () => {
  return (
    <section id="about" className="w-full py-16 bg-gray-100">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">
            About Wilcox Advisors
          </h2>
          <p className="text-lg text-gray-700 mb-4">
            Wilcox Advisors was founded with a clear mission: to provide small businesses with the financial expertise they need to thrive in today's competitive landscape.
          </p>
          <p className="text-lg text-gray-700 mb-4">
            Our team combines decades of experience in accounting, tax planning, and financial advisory services. We understand the unique challenges small businesses face and offer tailored solutions that drive growth and ensure compliance.
          </p>
          <p className="text-lg text-gray-700">
            We believe in building long-term relationships with our clients, becoming trusted advisors who help navigate complex financial decisions and identify opportunities for improvement and growth.
          </p>
        </div>
      </div>
    </section>
  );
};

export default AboutSection;
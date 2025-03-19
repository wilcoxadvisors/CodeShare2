import React from 'react';

interface AboutSectionProps {
  aboutText?: string;
}

const AboutSection: React.FC<AboutSectionProps> = ({ aboutText }) => {
  const defaultAboutText = "At Wilcox Advisors, we specialize in financial solutions for small businesses. " +
    "From startups to growing companies, we provide the expertise you need to succeed—built to scale with you every step of the way. " +
    "Our team of certified professionals brings decades of combined experience across diverse industries, " +
    "ensuring you receive tailored guidance that addresses your unique challenges and opportunities.";

  return (
    <section id="about" className="py-16 bg-gray-100">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">About Wilcox Advisors</h2>
          <p className="text-gray-700 leading-relaxed">
            {aboutText || defaultAboutText}
          </p>
        </div>
      </div>
    </section>
  );
};

export default AboutSection;
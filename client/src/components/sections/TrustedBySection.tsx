import React from 'react';

const TrustedBySection = () => {
  return (
    <section className="py-8 bg-gray-50">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center">
          <h3 className="text-lg text-gray-700 mb-6">Trusted by businesses across industries:</h3>
          <div className="flex flex-wrap justify-center gap-8 md:gap-12">
            <span className="text-xl text-gray-500 font-medium">TechStart</span>
            <span className="text-xl text-gray-500 font-medium">GreenLeaf</span>
            <span className="text-xl text-gray-500 font-medium">BuildCo</span>
            <span className="text-xl text-gray-500 font-medium">RetailPro</span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default TrustedBySection;
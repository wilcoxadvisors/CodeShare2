import React from 'react';

const BlogSection = () => {
  const blogPosts = [
    {
      title: "5 Tax-Saving Strategies for Small Businesses",
      preview: "Discover practical tax strategies that can help your small business retain more profits and achieve sustainable growth in the current economic climate."
    },
    {
      title: "Understanding Cash Flow Management",
      preview: "Effective cash flow management is critical for business success. Learn the essential techniques to maintain healthy cash flow and avoid common pitfalls."
    }
  ];

  return (
    <section id="blog" className="w-full py-16 bg-white">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">
          Blog & Updates
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {blogPosts.map((post, index) => (
            <div key={index} className="bg-gray-50 p-6 rounded-lg shadow-sm">
              <h3 className="text-xl font-semibold text-gray-900 mb-3">
                {post.title}
              </h3>
              <p className="text-gray-700 mb-4">
                {post.preview}
              </p>
              <a 
                href="#contact" 
                className="text-blue-800 font-medium hover:text-blue-700 transition-colors"
              >
                Contact us to learn more →
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default BlogSection;
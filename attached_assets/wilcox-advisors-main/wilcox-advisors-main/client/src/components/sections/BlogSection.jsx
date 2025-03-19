// src/components/sections/BlogSection.jsx
import React from 'react';

export default function BlogSection({ blogPosts }) {
  return (
    <section id="blog" className="py-16 bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 w-full">
        <h2 className="text-3xl font-bold text-blue-800 mb-10 text-center">Blog & Updates</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {blogPosts.map((post) => (
            <div key={post._id} className="bg-gray-50 p-6 rounded-lg shadow-sm">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">{post.title}</h3>
              <div className="text-gray-700" dangerouslySetInnerHTML={{ __html: post.content }} />
              <p className="mt-4 text-blue-800 font-medium">
                <a href="#contact">Contact us to learn more!</a>
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

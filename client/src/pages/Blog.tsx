import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, User, Clock, Tag } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

interface BlogPost {
  id: number;
  title: string;
  excerpt: string;
  publishedAt: string;
  author: string;
  category: string;
  imageUrl?: string;
  slug: string;
  readTime?: string;
}

// Default category filter
const ALL_CATEGORIES = "All";

export default function Blog() {
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = React.useState("All");
  const [searchTerm, setSearchTerm] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [subscribing, setSubscribing] = React.useState(false);
  const [subscriptionResult, setSubscriptionResult] = React.useState<{
    success: boolean;
    message: string;
  } | null>(null);

  // Fetch blog posts
  const { data, isLoading, isError } = useQuery<{ success: boolean, posts: BlogPost[] }>({
    queryKey: ['/api/blog/posts'],
    queryFn: async () => {
      const res = await axios.get('/api/blog/posts');
      return res.data;
    }
  });

  const blogPosts = data?.posts || [];

  // Derive unique categories from fetched blog posts
  const apiCategories = React.useMemo(() => {
    // Default categories if no posts are available
    if (!blogPosts.length) return [ALL_CATEGORIES];
    
    // Get unique categories
    const uniqueCategories = new Set<string>();
    blogPosts.forEach(post => {
      if (post.category) uniqueCategories.add(post.category);
    });
    
    // Convert to array and add "All" at the beginning
    return [ALL_CATEGORIES, ...Array.from(uniqueCategories)];
  }, [blogPosts]);

  // Filter posts based on category and search term
  const filteredPosts = blogPosts.filter((post) => {
    const matchesCategory = selectedCategory === "All" || post.category === selectedCategory;
    const matchesSearch = post.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         post.excerpt.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
  };
  
  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim()) {
      setSubscriptionResult({
        success: false,
        message: "Please enter a valid email address"
      });
      return;
    }
    
    try {
      setSubscribing(true);
      
      const response = await fetch('/api/blog/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email })
      });
      
      const data = await response.json();
      
      setSubscriptionResult({
        success: response.ok,
        message: data.message || (response.ok ? 
          "Successfully subscribed to blog updates!" : 
          "Failed to subscribe. Please try again.")
      });
      
      if (response.ok) {
        setEmail(''); // Clear the email field on success
      }
    } catch (error) {
      console.error("Subscription error:", error);
      setSubscriptionResult({
        success: false,
        message: "An error occurred. Please try again later."
      });
    } finally {
      setSubscribing(false);
    }
  };

  return (
    <div className="bg-gray-50 min-h-screen">
      {/* Blog subheader section */}
      <div className="bg-white shadow-sm pt-24 pb-8">
        <div className="max-w-6xl mx-auto px-4">
          <Link 
            to="/"
            className="flex items-center text-gray-600 hover:text-gray-900 mb-6"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Home
          </Link>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">Wilcox Advisors Blog</h1>
          <p className="text-gray-600 text-lg max-w-3xl">
            Expert insights on accounting, tax planning, and financial management for small businesses and entrepreneurs.
          </p>
        </div>
      </div>

      {/* Blog content */}
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm p-6 sticky top-24">
              <h3 className="font-semibold text-gray-900 mb-4">Search</h3>
              <div className="relative mb-6">
                <input
                  type="text"
                  placeholder="Search articles..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <h3 className="font-semibold text-gray-900 mb-4">Categories</h3>
              <div className="space-y-2">
                {apiCategories.map((category) => (
                  <button
                    key={category}
                    onClick={() => handleCategoryChange(category)}
                    className={`block w-full text-left px-3 py-2 rounded-md transition ${
                      selectedCategory === category
                        ? "bg-blue-100 text-blue-800 font-medium"
                        : "text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>

              <div className="mt-8 p-4 bg-blue-50 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-2">Subscribe to Updates</h3>
                <p className="text-sm text-gray-600 mb-4">Get our latest articles and insights delivered to your inbox.</p>
                {subscriptionResult ? (
                  <div className={`p-3 mb-4 rounded-md ${subscriptionResult.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    <p className="text-sm">{subscriptionResult.message}</p>
                    {subscriptionResult.success && (
                      <button 
                        onClick={() => setSubscriptionResult(null)} 
                        className="text-xs underline mt-1"
                      >
                        Subscribe another email
                      </button>
                    )}
                  </div>
                ) : (
                  <form onSubmit={handleSubscribe}>
                    <input
                      type="email"
                      placeholder="Your email address"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md mb-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                    <button 
                      type="submit" 
                      className="w-full px-4 py-2 bg-blue-800 text-white rounded-md hover:bg-blue-900 transition flex items-center justify-center"
                      disabled={subscribing}
                    >
                      {subscribing ? (
                        <>
                          <span className="animate-spin mr-2">⏳</span>
                          Subscribing...
                        </>
                      ) : 'Subscribe'}
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>

          {/* Blog posts grid */}
          <div className="lg:col-span-3">
            {isLoading ? (
              // Loading skeleton
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {Array(4).fill(0).map((_, index) => (
                  <div key={index} className="bg-white rounded-lg shadow-sm overflow-hidden">
                    <div className="h-48 bg-gray-200 animate-pulse"></div>
                    <div className="p-6">
                      <div className="h-4 bg-gray-200 rounded w-1/4 mb-2 animate-pulse"></div>
                      <div className="h-6 bg-gray-200 rounded w-3/4 mb-2 animate-pulse"></div>
                      <div className="h-4 bg-gray-200 rounded w-full mb-2 animate-pulse"></div>
                      <div className="h-4 bg-gray-200 rounded w-full mb-4 animate-pulse"></div>
                      <div className="flex justify-between">
                        <div className="h-4 bg-gray-200 rounded w-1/4 animate-pulse"></div>
                        <div className="h-4 bg-gray-200 rounded w-1/4 animate-pulse"></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredPosts.length === 0 ? (
              <div className="text-center py-12">
                <h3 className="text-xl font-medium text-gray-900 mb-2">No articles found</h3>
                <p className="text-gray-600">Try adjusting your search or category selection.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {filteredPosts.map((post) => (
                  <div key={post.id} className="bg-white rounded-lg shadow-sm overflow-hidden hover:shadow-md transition">
                    <div className="h-48 overflow-hidden">
                      <img
                        src={post.imageUrl || 'https://images.unsplash.com/photo-1579532537598-459ecdaf39cc?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80'}
                        alt={post.title}
                        className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                      />
                    </div>
                    <div className="p-6">
                      <div className="flex items-center text-sm text-gray-500 mb-2">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {post.category}
                        </span>
                        {post.readTime && (
                          <>
                            <span className="mx-2">•</span>
                            <span className="flex items-center">
                              <Clock className="w-4 h-4 mr-1" />
                              {post.readTime}
                            </span>
                          </>
                        )}
                      </div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-2 hover:text-blue-800 transition">
                        {post.title}
                      </h3>
                      <p className="text-gray-600 mb-4">{post.excerpt}</p>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center text-sm text-gray-500">
                          <User className="w-4 h-4 mr-1" />
                          {post.author}
                        </div>
                        <div className="flex items-center text-sm text-gray-500">
                          <Calendar className="w-4 h-4 mr-1" />
                          {new Date(post.publishedAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
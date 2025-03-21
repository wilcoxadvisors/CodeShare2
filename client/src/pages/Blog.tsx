import React from 'react';
import { Link, useLocation } from 'wouter';
import { ArrowLeft, Calendar, User, Clock, Tag } from 'lucide-react';

// Sample blog post data
const blogPosts = [
  {
    id: 1,
    title: "2025 Tax Planning Strategies for Small Businesses",
    author: "Sarah Johnson, CPA",
    date: "March 18, 2025",
    category: "Tax Planning",
    readTime: "8 min read",
    excerpt: "Discover the latest tax planning strategies for small businesses in 2025. Learn how recent tax code changes can benefit your business and maximize deductions.",
    imageUrl: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1011&q=80",
  },
  {
    id: 2,
    title: "Cloud Accounting Solutions: A Complete Guide",
    author: "Michael Wilson",
    date: "March 10, 2025",
    category: "Technology",
    readTime: "6 min read",
    excerpt: "Explore how cloud accounting solutions are transforming financial management for businesses of all sizes. Compare top solutions and implementation strategies.",
    imageUrl: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1115&q=80",
  },
  {
    id: 3,
    title: "Financial Forecasting Best Practices for 2025",
    author: "Jennifer Lee, MBA",
    date: "March 5, 2025",
    category: "Financial Planning",
    readTime: "10 min read",
    excerpt: "Learn how to create accurate financial forecasts that help your business navigate economic uncertainties and plan for sustainable growth in 2025 and beyond.",
    imageUrl: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1170&q=80",
  },
  {
    id: 4,
    title: "Understanding Business Entity Structures",
    author: "David Martinez, JD",
    date: "February 28, 2025",
    category: "Legal",
    readTime: "7 min read",
    excerpt: "Compare the pros and cons of different business entity structures including LLCs, S-Corps, and C-Corps to determine which is best for your business goals.",
    imageUrl: "https://images.unsplash.com/photo-1507679799987-c73779587ccf?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1171&q=80",
  },
  {
    id: 5,
    title: "The Small Business Guide to Cash Flow Management",
    author: "Amy Rodriguez, CFP",
    date: "February 15, 2025",
    category: "Cash Flow",
    readTime: "9 min read",
    excerpt: "Master cash flow management strategies to ensure your business maintains healthy liquidity and can weather unexpected financial challenges.",
    imageUrl: "https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1171&q=80",
  },
  {
    id: 6,
    title: "Accounting Automation Tools Every Business Needs",
    author: "Thomas Brown",
    date: "February 10, 2025",
    category: "Technology",
    readTime: "5 min read",
    excerpt: "Discover the essential accounting automation tools that can save your business time and money while improving accuracy and compliance.",
    imageUrl: "https://images.unsplash.com/photo-1563986768609-322da13575f3?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1170&q=80",
  },
];

// Categories for filter
const categories = [
  "All",
  "Tax Planning",
  "Technology",
  "Financial Planning",
  "Legal",
  "Cash Flow",
];

export default function Blog() {
  const [_, navigate] = useLocation();
  const [selectedCategory, setSelectedCategory] = React.useState("All");
  const [searchTerm, setSearchTerm] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [subscribing, setSubscribing] = React.useState(false);
  const [subscriptionResult, setSubscriptionResult] = React.useState<{
    success: boolean;
    message: string;
  } | null>(null);

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
                {categories.map((category) => (
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
            {filteredPosts.length === 0 ? (
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
                        src={post.imageUrl}
                        alt={post.title}
                        className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
                      />
                    </div>
                    <div className="p-6">
                      <div className="flex items-center text-sm text-gray-500 mb-2">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {post.category}
                        </span>
                        <span className="mx-2">•</span>
                        <span className="flex items-center">
                          <Clock className="w-4 h-4 mr-1" />
                          {post.readTime}
                        </span>
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
                          {post.date}
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
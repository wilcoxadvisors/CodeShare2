import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Eye, FileText, Pencil } from 'lucide-react';
import HomepageContentManager from './HomepageContentManager';
import BlogContentManager from './BlogContentManager';

/**
 * AdminWebsiteContent component for managing website content
 * Provides a unified interface for managing both homepage and blog content
 */
const AdminWebsiteContent: React.FC = () => {
  const [contentType, setContentType] = useState<'homepage' | 'blog'>('homepage');

  // Preview website function
  const previewWebsite = () => {
    window.open('/', '_blank');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight">Content Manager</h2>
          <p className="text-muted-foreground text-sm">Manage and publish website content</p>
        </div>
        <div className="flex space-x-2">
          <Button onClick={previewWebsite} variant="outline" size="sm" className="transition-all hover:shadow-md">
            <Eye className="mr-2 h-4 w-4" />
            Preview Site
          </Button>
        </div>
      </div>

      {/* Main content type tabs */}
      <Tabs value={contentType} onValueChange={(value) => setContentType(value as 'homepage' | 'blog')} className="w-full">
        <TabsList className="mb-6 w-full sm:w-auto grid grid-cols-2 sm:flex">
          <TabsTrigger value="homepage" className="flex items-center">
            <FileText className="h-4 w-4 mr-2 hidden sm:block" />
            Homepage Content
          </TabsTrigger>
          <TabsTrigger value="blog" className="flex items-center">
            <Pencil className="h-4 w-4 mr-2 hidden sm:block" />
            Blog Management
          </TabsTrigger>
        </TabsList>

        {/* Homepage Content Tab */}
        <TabsContent value="homepage" className="space-y-6">
          <HomepageContentManager />
        </TabsContent>

        {/* Blog Management Tab */}
        <TabsContent value="blog" className="space-y-6">
          <BlogContentManager />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminWebsiteContent;

import React from 'react';
import AdminWebsiteContent from './AdminWebsiteContent';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

/**
 * WebsiteContentManagement component that wraps the AdminWebsiteContent component
 * Enhanced with proper layout structure and responsive design
 * 
 * This component provides:
 * - A consistent grid layout adhering to responsive design principles
 * - Clear section separation with proper heading hierarchy
 * - Improved visual structure for better user experience
 */
const WebsiteContentManagement: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Website Content Management</h2>
        <p className="text-muted-foreground mt-1">
          Manage all website content including homepage sections and blog posts
        </p>
      </div>
      
      <Separator className="my-6" />
      
      <div className="grid grid-cols-1 gap-6">
        <Card className="border shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle>Content Management Console</CardTitle>
            <CardDescription>
              Organize, edit, and publish content across your website
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AdminWebsiteContent />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default WebsiteContentManagement;
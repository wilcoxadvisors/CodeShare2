import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import PageHeader from '../components/PageHeader';
import AIAnalyticsDashboard from '../components/AIAnalyticsDashboard';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

/**
 * AI Analytics Page - Restricted to admin and employee roles
 * This page provides advanced AI analytics for staff with full data access
 */
export default function AIAnalytics() {
  const { user } = useAuth();
  const isStaff = user && (user.role === 'admin' || user.role === 'employee');

  return (
    <div className="container mx-auto py-6 space-y-6">
      <PageHeader 
        title="AI Financial Analytics" 
        description="Use AI to analyze financial data, detect anomalies, and get insights with full data access"
      />

      {!isStaff && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Access Restricted</AlertTitle>
          <AlertDescription>
            This AI analytics feature is only available to staff members. 
            If you need analytical insights, please contact your advisor.
          </AlertDescription>
        </Alert>
      )}

      <AIAnalyticsDashboard />
    </div>
  );
}
import ClientOnboardingForm from '@/components/form/ClientOnboardingForm';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * Client Onboarding Page - For adding new clients and their entities
 */
export default function ClientOnboarding() {
  const navigate = useNavigate();
  const [success, setSuccess] = useState(false);

  const handleSuccess = () => {
    setSuccess(true);
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Client Onboarding</h1>
          <p className="text-muted-foreground">Add new clients and their business entities</p>
        </div>
        <Button variant="outline" onClick={() => navigate('/dashboard')}>
          Return to Dashboard
        </Button>
      </div>

      {success ? (
        <Card>
          <CardHeader>
            <CardTitle>Onboarding Complete</CardTitle>
            <CardDescription>
              The client has been successfully added to the system.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p>The client has been created with their initial entities. You can now:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Set up their chart of accounts</li>
                <li>Create consolidation groups</li>
                <li>Start entering financial data</li>
                <li>Invite them to access the platform</li>
              </ul>
              <div className="flex gap-4 pt-4">
                <Button onClick={() => navigate('/dashboard')}>
                  Go to Dashboard
                </Button>
                <Button variant="outline" onClick={() => setSuccess(false)}>
                  Add Another Client
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <ClientOnboardingForm onSuccess={handleSuccess} />
      )}
    </div>
  );
}
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useUI } from '../contexts/UIContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';

export default function LoginModal() {
  const navigate = useNavigate();
  const { login, isLoading } = useAuth();
  const { showLoginModal, setShowLoginModal } = useUI();
  const { toast } = useToast();
  
  const [formData, setFormData] = useState({
    username: 'admin', // Pre-filled for demo purposes
    password: 'password123' // Pre-filled for demo purposes
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.username || !formData.password) {
      toast({
        title: "Validation Error",
        description: "Username and password are required",
        variant: "destructive"
      });
      return;
    }
    
    // Use SPA-style login via the auth context
    const success = await login(formData.username, formData.password);
    
    if (success) {
      toast({
        title: "Success",
        description: "Logged in successfully",
        variant: "default"
      });
      // Close the modal and navigate via SPA navigation
      setShowLoginModal(false);
      navigate('/dashboard');
    } else {
      toast({
        title: "Authentication Error",
        description: "Invalid username or password",
        variant: "destructive"
      });
    }
  };

  return (
    <Dialog open={showLoginModal} onOpenChange={setShowLoginModal}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Sign In</DialogTitle>
          <DialogDescription>
            Access your Wilcox Advisors account
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="username" className="text-gray-700">Username</Label>
            <Input
              id="username"
              name="username"
              type="text"
              value={formData.username}
              onChange={handleChange}
              required
              placeholder="Enter your username"
              className="focus:ring-blue-800 focus:border-blue-800"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="password" className="text-gray-700">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleChange}
              required
              placeholder="Enter your password"
              className="focus:ring-blue-800 focus:border-blue-800"
            />
          </div>
          
          <DialogFooter className="flex-col sm:flex-row sm:justify-between mt-6">
            <div className="text-sm text-gray-500 mb-4 sm:mb-0">
              Demo: admin / password123
            </div>
            <Button 
              type="submit" 
              className="bg-blue-800 hover:bg-blue-900"
              disabled={isLoading}
            >
              {isLoading ? 'Signing In...' : 'Sign In'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
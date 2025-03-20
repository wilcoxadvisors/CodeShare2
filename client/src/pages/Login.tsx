import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';

function Login() {
  const [, setLocation] = useLocation();
  const { login, isLoading, user } = useAuth();
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [loginAttempted, setLoginAttempted] = useState(false);
  
  // Redirect if already logged in
  useEffect(() => {
    if (user && !isLoading) {
      // Add a small delay to ensure all state is updated
      const redirectTimer = setTimeout(() => {
        setLocation('/dashboard');
      }, 100);
      
      return () => clearTimeout(redirectTimer);
    }
  }, [user, isLoading, setLocation]);
  
  // Auto-fill demo credentials (remove in production)
  useEffect(() => {
    // For demo purposes
    setFormData({
      username: 'admin',
      password: 'password123'
    });
  }, []);
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginAttempted(true);
    
    if (!formData.username || !formData.password) {
      toast({
        title: "Validation Error",
        description: "Username and password are required",
        variant: "destructive"
      });
      return;
    }
    
    console.log('Attempting login with:', formData.username);
    const success = await login(formData.username, formData.password);
    
    if (success) {
      toast({
        title: "Success",
        description: "Logged in successfully",
        variant: "default"
      });
      // The useEffect will handle the redirect, so we don't need to do it here
      // This prevents the double redirect
    } else {
      toast({
        title: "Authentication Error",
        description: "Invalid username or password",
        variant: "destructive"
      });
    }
  };
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md shadow-md">
        <CardHeader className="space-y-1 bg-gradient-to-r from-blue-800 to-blue-900 text-white rounded-t-lg">
          <CardTitle className="text-2xl font-bold text-center">Wilcox Advisors</CardTitle>
          <CardDescription className="text-center text-gray-100">
            Financial Management Platform
          </CardDescription>
        </CardHeader>
        
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4 pt-6">
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
            
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="remember"
                className="text-blue-800 focus:ring-blue-800"
              />
              <Label htmlFor="remember" className="text-sm text-gray-700">Remember me</Label>
            </div>
          </CardContent>
          
          <CardFooter className="flex flex-col gap-4">
            <Button 
              type="submit" 
              className="w-full bg-blue-800 hover:bg-blue-900"
              disabled={isLoading}
            >
              {isLoading ? 'Signing In...' : 'Sign In'}
            </Button>
            
            <div className="text-center w-full">
              <a href="#" className="text-sm text-blue-800 hover:text-blue-900 hover:underline">
                Forgot password?
              </a>
            </div>
          </CardFooter>
        </form>
        
        <div className="px-8 pb-6 text-center">
          <p className="text-sm text-gray-500 mt-2">
            Demo credentials: username: admin, password: password123
          </p>
        </div>
      </Card>
    </div>
  );
}

export default Login;

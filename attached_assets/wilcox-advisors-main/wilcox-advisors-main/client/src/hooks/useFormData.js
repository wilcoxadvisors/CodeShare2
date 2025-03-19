// src/hooks/useFormData.js
import { useState } from 'react';

export function useFormData(initialData) {
  const [formData, setFormData] = useState(initialData);
  
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const resetForm = () => setFormData(initialData);
  
  return [formData, handleInputChange, setFormData, resetForm];
}

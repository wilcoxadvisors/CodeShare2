// src/hooks/useMultiStepForm.js
import { useState } from 'react';

export default function useMultiStepForm(steps, initialData, onSubmit) {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState(initialData);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleServiceToggle = (serviceId) => {
    setFormData(prev => ({
      ...prev,
      services: prev.services.includes(serviceId) 
        ? prev.services.filter(id => id !== serviceId) 
        : [...prev.services, serviceId],
    }));
  };

  const isStepValid = () => {
    const fields = steps[currentStep].fields;
    return fields.every(field => 
      field.required 
        ? (field.type === 'services' ? formData.services.length > 0 : formData[field.name]?.trim() !== '') 
        : true
    );
  };

  const nextStep = () => {
    if (currentStep < steps.length - 1 && isStepValid()) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (currentStep < steps.length - 1) {
      if (isStepValid()) nextStep();
    } else {
      await onSubmit(formData);
    }
  };

  return {
    currentStep,
    formData,
    handleInputChange,
    handleServiceToggle,
    isStepValid,
    nextStep,
    prevStep,
    handleSubmit
  };
}

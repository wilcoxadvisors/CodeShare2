import { useState } from 'react';

export default function useMultiStepForm(steps, initialData, onSubmit) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [formData, setFormData] = useState(initialData);

  const step = steps[currentStepIndex].component;
  
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === steps.length - 1;

  function handleChange(e) {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  }

  function goTo(index) {
    if (index >= 0 && index < steps.length) {
      setCurrentStepIndex(index);
    }
  }

  function next() {
    if (isLastStep) {
      return onSubmit(formData);
    }
    setCurrentStepIndex(i => i + 1);
  }

  function back() {
    if (!isFirstStep) {
      setCurrentStepIndex(i => i - 1);
    }
  }

  return {
    step,
    currentStepIndex,
    steps,
    isFirstStep,
    isLastStep,
    formData,
    setFormData,
    handleChange,
    goTo,
    next,
    back
  };
}
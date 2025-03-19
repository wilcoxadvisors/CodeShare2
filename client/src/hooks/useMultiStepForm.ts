import { useState } from 'react';

export default function useMultiStepForm<T>(
  steps: string[],
  initialData: T,
  onSubmit: (data: T) => void
) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [data, setData] = useState<T>(initialData);

  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === steps.length - 1;

  function goTo(index: number) {
    if (index >= 0 && index < steps.length) {
      setCurrentStepIndex(index);
    }
  }

  function next() {
    if (isLastStep) {
      return onSubmit(data);
    }
    setCurrentStepIndex(i => i + 1);
  }

  function back() {
    if (!isFirstStep) {
      setCurrentStepIndex(i => i - 1);
    }
  }

  return {
    currentStepIndex,
    step: steps[currentStepIndex],
    steps,
    isFirstStep,
    isLastStep,
    data,
    setData,
    goTo,
    next,
    back
  };
}
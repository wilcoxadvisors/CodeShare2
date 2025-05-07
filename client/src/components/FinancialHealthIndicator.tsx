import React from 'react';
import { cn } from '@/lib/utils';
import { CircleCheck, AlertTriangle, AlertCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export type HealthStatus = 'excellent' | 'good' | 'warning' | 'poor' | 'critical';

export interface FinancialHealthIndicatorProps {
  score: number; // 0-100 score
  status?: HealthStatus; // Optional override for status
  label?: string; // Optional label
  showScore?: boolean; // Whether to show the numerical score
  size?: 'sm' | 'md' | 'lg'; // Size of the indicator
  className?: string;
}

/**
 * Component to visually display financial health with color-coding
 */
export function FinancialHealthIndicator({
  score,
  status,
  label,
  showScore = true,
  size = 'md',
  className,
}: FinancialHealthIndicatorProps) {
  // Determine status based on score if not explicitly provided
  const calculatedStatus: HealthStatus = 
    status || 
    (score >= 90 ? 'excellent' :
     score >= 70 ? 'good' :
     score >= 50 ? 'warning' :
     score >= 30 ? 'poor' : 'critical');
  
  // Define colors based on status
  const colorMap = {
    excellent: 'bg-green-100 text-green-700 border-green-300',
    good: 'bg-blue-100 text-blue-700 border-blue-300',
    warning: 'bg-yellow-100 text-yellow-700 border-yellow-300',
    poor: 'bg-orange-100 text-orange-700 border-orange-300',
    critical: 'bg-red-100 text-red-700 border-red-300'
  };
  
  // Define icons based on status
  const iconMap = {
    excellent: <CircleCheck className="mr-1" />,
    good: <CircleCheck className="mr-1" />,
    warning: <AlertTriangle className="mr-1" />,
    poor: <AlertCircle className="mr-1" />,
    critical: <AlertCircle className="mr-1" />
  };
  
  // Define descriptive messages
  const messages = {
    excellent: 'Excellent financial health. Keep up the great work!',
    good: 'Good financial health. Your finances are on track.',
    warning: 'Financial health needs attention. Consider reviewing your finances.',
    poor: 'Poor financial health. Action recommended to improve your situation.',
    critical: 'Critical financial health. Immediate action required.'
  };
  
  // Size classes
  const sizeClasses = {
    sm: 'text-xs py-0.5 px-2',
    md: 'text-sm py-1 px-3',
    lg: 'text-base py-2 px-4'
  };
  
  // Icon size classes
  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5'
  };
  
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger>
          <div
            className={cn(
              'flex items-center rounded-full border font-medium whitespace-nowrap',
              sizeClasses[size],
              colorMap[calculatedStatus],
              className
            )}
          >
            <span className={iconSizes[size]}>
              {iconMap[calculatedStatus]}
            </span>
            
            {label && <span className="mr-1">{label}</span>}
            
            {showScore && (
              <span className="font-semibold">{Math.round(score)}</span>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p className="max-w-xs">{messages[calculatedStatus]}</p>
          <p className="mt-1 text-sm opacity-80">Score: {Math.round(score)}/100</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
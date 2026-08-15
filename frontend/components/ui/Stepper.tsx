import React from 'react';

export interface Step {
  id: string | number;
  label: string;
  description?: string;
}

interface StepperProps {
  steps: Step[];
  currentStep: number;
  onStepClick?: (stepIndex: number) => void;
  className?: string;
}

export default function Stepper({ steps, currentStep, onStepClick, className = '' }: StepperProps) {
  return (
    <nav aria-label="Progress" className={`w-full ${className}`}>
      <ol className="flex items-center justify-between">
        {steps.map((step, idx) => {
          const isCompleted = idx < currentStep;
          const isCurrent = idx === currentStep;
          const isClickable = onStepClick && idx <= currentStep;

          return (
            <li
              key={step.id}
              className={`relative flex flex-1 items-center ${idx < steps.length - 1 ? 'pr-4 sm:pr-8' : ''}`}
            >
              <button
                type="button"
                disabled={!isClickable}
                onClick={() => isClickable && onStepClick(idx)}
                className={`group flex items-center gap-3 text-left focus:outline-none ${
                  !isClickable ? 'cursor-default' : 'cursor-pointer'
                }`}
              >
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold transition-all ${
                    isCompleted
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : isCurrent
                      ? 'border-2 border-gold bg-ocean text-gold shadow-md'
                      : 'border border-ocean/20 bg-pearl text-ocean/50'
                  }`}
                >
                  {isCompleted ? '✓' : idx + 1}
                </span>
                <div className="hidden sm:block">
                  <div
                    className={`text-xs font-semibold uppercase tracking-wider ${
                      isCurrent ? 'text-ocean' : isCompleted ? 'text-ocean/80' : 'text-ocean/45'
                    }`}
                  >
                    {step.label}
                  </div>
                  {step.description && (
                    <div className="text-[11px] text-ocean/55">{step.description}</div>
                  )}
                </div>
              </button>

              {idx < steps.length - 1 && (
                <div
                  className={`ml-4 h-0.5 flex-1 transition-colors ${
                    isCompleted ? 'bg-emerald-500' : 'bg-ocean/15'
                  }`}
                  aria-hidden="true"
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

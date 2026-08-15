'use client';

export type StepInfo = {
  id: number;
  title: string;
  subtitle: string;
};

export const CHECKOUT_STEPS: StepInfo[] = [
  { id: 1, title: 'Plan & Payment Tier', subtitle: 'Select PV discount tier' },
  { id: 2, title: 'KYC & Nominee', subtitle: 'Personal & nominee details' },
  { id: 3, title: 'Referral & Quote', subtitle: 'Referral code & quote lock' },
  { id: 4, title: 'Deposit & Proof', subtitle: 'Payment method & receipt' },
];

type Props = {
  currentStep: number;
  onStepClick: (stepId: number) => void;
  maxCompletedStep: number;
};

export default function CheckoutStepper({ currentStep, onStepClick, maxCompletedStep }: Props) {
  return (
    <div className="w-full">
      {/* Desktop Stepper */}
      <div className="hidden sm:flex items-center justify-between relative">
        {/* Progress Line */}
        <div className="absolute top-1/2 left-0 right-0 -translate-y-1/2 h-0.5 bg-ocean/10 -z-0"></div>
        <div
          className="absolute top-1/2 left-0 -translate-y-1/2 h-0.5 bg-gold transition-all duration-300 -z-0"
          style={{ width: `${((currentStep - 1) / (CHECKOUT_STEPS.length - 1)) * 100}%` }}
        ></div>

        {CHECKOUT_STEPS.map((step) => {
          const isCurrent = step.id === currentStep;
          const isCompleted = step.id < currentStep || maxCompletedStep >= step.id;
          const isClickable = step.id <= maxCompletedStep + 1;

          return (
            <div
              key={step.id}
              onClick={() => isClickable && onStepClick(step.id)}
              className={`flex items-center gap-3 bg-white px-2 py-1 transition-all ${
                isClickable ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'
              }`}
            >
              <div
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-all duration-200 ${
                  isCurrent
                    ? 'bg-ocean text-gold ring-4 ring-gold/30 shadow-md'
                    : isCompleted
                    ? 'bg-gold text-ocean'
                    : 'bg-pearl text-ocean/50 border border-ocean/15'
                }`}
              >
                {isCompleted && !isCurrent ? (
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  step.id
                )}
              </div>
              <div className="text-left">
                <div className={`text-xs font-bold ${isCurrent ? 'text-ocean' : 'text-ocean/70'}`}>
                  {step.title}
                </div>
                <div className="text-[10px] text-ocean/50">{step.subtitle}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Mobile Stepper */}
      <div className="sm:hidden space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-gold uppercase tracking-wider">
            Step {currentStep} of {CHECKOUT_STEPS.length}
          </span>
          <span className="font-bold text-ocean">{CHECKOUT_STEPS[currentStep - 1].title}</span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-ocean/10 overflow-hidden">
          <div
            className="h-full bg-gold transition-all duration-300"
            style={{ width: `${(currentStep / CHECKOUT_STEPS.length) * 100}%` }}
          ></div>
        </div>
      </div>
    </div>
  );
}

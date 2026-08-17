import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { loadBookingDraft, saveBookingDraft } from '@/lib/bookingDraft';
import { useAppStore } from '@/store/appStore';
import InvestmentCheckoutModal from '../InvestmentCheckoutModal';
import LoginPage from '@/app/(site)/[locale]/auth/login/page';
import RegisterPage from '@/app/(site)/[locale]/auth/register/page';

const mockPush = jest.fn();
const mockApi = jest.fn(async (path: string) => {
  if (path === '/payment-plans/policy') return { ok: true, resolved: [], policy: {} };
  if (path === '/booking/quote') {
    return {
      ok: true,
      quote: {
        netPrice: 100000,
        afterPromo: 100000,
        depositAmount: 10000,
        paymentTierId: 'standard',
        quoteToken: 'qt-1',
        schedule: []
      }
    };
  }
  if (path === '/booking') return { ok: true, booking: { id: 'B-TEST-1' } };
  if (path.startsWith('/auth/')) return { ok: false };
  return { ok: true };
});

jest.mock('@/i18n/navigation', () => ({
  useRouter: () => ({ push: mockPush, replace: mockPush }),
  Link: ({
    href,
    onClick,
    children
  }: {
    href: string;
    onClick?: () => void;
    children: React.ReactNode;
  }) => (
    <a
      href={href}
      onClick={(e) => {
        e.preventDefault();
        onClick?.();
      }}
    >
      {children}
    </a>
  )
}));

jest.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key
}));

jest.mock('next/image', () => ({
  __esModule: true,
  default: ({ alt }: { alt?: string }) => <img alt={alt || ''} />
}));

jest.mock('@/lib/api', () => ({
  api: (...args: unknown[]) => mockApi(...(args as [string])),
  apiUpload: jest.fn()
}));

jest.mock('@/components/SuitePlans', () => ({
  __esModule: true,
  default: () => <div>suite-plans</div>
}));

const completeKyc = {
  name: 'Nadia Rahman',
  fatherName: 'Karim Rahman',
  nid: '1990123456789',
  dob: '1990-01-01',
  profession: 'Doctor',
  city: 'Dhaka',
  address: 'Present street',
  permanentAddress: 'Permanent street',
  contact: '01700000000',
  email: 'nadia@example.com',
  picUrl: '/uploads/pic.jpg',
  nomineeName: 'Amina Rahman',
  nomineeNid: '1980123456789',
  nomineePicUrl: '/uploads/nominee.jpg'
};

const plan = {
  id: 'PLAN-1',
  name: 'Sea View Share',
  daysPerMonth: 5,
  lockIn: 12,
  price: 100000,
  suiteId: 'SUITE-1',
  suite: { id: 'SUITE-1', type: 'Deluxe' }
};

function resetSession() {
  sessionStorage.clear();
  localStorage.clear();
  useAppStore.setState({ user: null, token: null, hydrated: true });
  mockPush.mockClear();
  mockApi.mockClear();
}

describe('booking auth paths', () => {
  beforeEach(() => {
    resetSession();
  });

  it('1. lets a verified logged-in buyer submit the booking', async () => {
    useAppStore.getState().setAuth(
      {
        id: 'U-1',
        email: 'nadia@example.com',
        name: 'Nadia Rahman',
        emailVerified: true,
        role: 'investor'
      },
      'token-1'
    );
    saveBookingDraft('PLAN-1', {
      step: 4,
      maxCompletedStep: 4,
      kyc: completeKyc,
      depositMethod: 'cheque',
      depositReference: 'CHQ-12345'
    });

    render(<InvestmentCheckoutModal isOpen plan={plan} user={useAppStore.getState().user} />);

    const submit = await screen.findByRole('button', { name: /Confirm & Submit Deposit/i });
    fireEvent.click(submit);

    await waitFor(() => {
      expect(mockApi).toHaveBeenCalledWith(
        '/booking',
        expect.objectContaining({ method: 'POST' })
      );
    });
    expect(mockPush).not.toHaveBeenCalled();
    await waitFor(() => {
      expect(screen.getByText('B-TEST-1')).toBeInTheDocument();
    });
    expect(loadBookingDraft('PLAN-1')).toBeNull();
  });

  it('2. sends a logged-out verified buyer to login and keeps their KYC', async () => {
    saveBookingDraft('PLAN-1', {
      step: 2,
      maxCompletedStep: 2,
      kyc: completeKyc
    });

    const { unmount } = render(<InvestmentCheckoutModal isOpen plan={plan} />);

    expect(await screen.findByDisplayValue('Nadia Rahman')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Continue to Step 3/i }));

    expect(mockPush).toHaveBeenCalledWith(
      `/auth/login?next=${encodeURIComponent('/invest?resume=PLAN-1')}`
    );
    expect(loadBookingDraft('PLAN-1')?.kyc?.name).toBe('Nadia Rahman');
    expect(mockApi).not.toHaveBeenCalledWith('/booking', expect.anything());

    unmount();

    useAppStore.getState().setAuth(
      {
        id: 'U-1',
        email: 'nadia@example.com',
        name: 'Nadia Rahman',
        emailVerified: true,
        role: 'investor'
      },
      'token-1'
    );

    render(<InvestmentCheckoutModal isOpen plan={plan} user={useAppStore.getState().user} />);

    expect(await screen.findByDisplayValue('Nadia Rahman')).toBeInTheDocument();
    expect(screen.getByDisplayValue('1990123456789')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Amina Rahman')).toBeInTheDocument();
  });

  it('3. drops all booking input when the buyer opens register / create account', async () => {
    saveBookingDraft('PLAN-1', { kyc: completeKyc, step: 2 });
    saveBookingDraft('PLAN-2', { kyc: { name: 'Other draft' } });

    render(<LoginPage />);
    fireEvent.click(screen.getByText('createAccount'));
    expect(loadBookingDraft('PLAN-1')).toBeNull();
    expect(loadBookingDraft('PLAN-2')).toBeNull();

    saveBookingDraft('PLAN-1', { kyc: completeKyc });
    render(<RegisterPage />);
    await waitFor(() => {
      expect(loadBookingDraft('PLAN-1')).toBeNull();
    });
  });
});

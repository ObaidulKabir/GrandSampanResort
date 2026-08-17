import {
  bookingReturnPath,
  clearAllBookingDrafts,
  clearBookingDraft,
  loadBookingDraft,
  saveBookingDraft
} from '../bookingDraft';

describe('bookingDraft', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('saves and restores KYC so a returning login can keep input', () => {
    saveBookingDraft('PLAN-1', {
      step: 2,
      kyc: { name: 'Nadia Rahman', nid: '123' },
      depositReference: 'CHQ-9'
    });

    expect(loadBookingDraft('PLAN-1')).toEqual({
      step: 2,
      kyc: { name: 'Nadia Rahman', nid: '123' },
      depositReference: 'CHQ-9'
    });
  });

  it('clears one plan draft after a successful booking', () => {
    saveBookingDraft('PLAN-1', { kyc: { name: 'Keep' } });
    saveBookingDraft('PLAN-2', { kyc: { name: 'Other' } });
    clearBookingDraft('PLAN-1');
    expect(loadBookingDraft('PLAN-1')).toBeNull();
    expect(loadBookingDraft('PLAN-2')?.kyc?.name).toBe('Other');
  });

  it('discards every booking draft when the buyer creates a new account', () => {
    saveBookingDraft('PLAN-1', { kyc: { name: 'Lost' } });
    saveBookingDraft('PLAN-2', { kyc: { name: 'Also lost' } });
    sessionStorage.setItem('unrelated', 'keep');
    clearAllBookingDrafts();
    expect(loadBookingDraft('PLAN-1')).toBeNull();
    expect(loadBookingDraft('PLAN-2')).toBeNull();
    expect(sessionStorage.getItem('unrelated')).toBe('keep');
  });

  it('returns the buyer to the same checkout after login', () => {
    expect(bookingReturnPath('PLAN-1')).toBe('/invest?resume=PLAN-1');
    expect(bookingReturnPath('PLAN-1', 'advisor')).toBe('/invest/advisor?resume=PLAN-1');
    expect(bookingReturnPath('PLAN-1', 'plan')).toBe('/pricing/plans/PLAN-1');
  });
});

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AdminFaqPage from '../page';
import { api } from '@/lib/api';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ replace: jest.fn() })
}));

jest.mock('@/lib/api', () => ({
  api: jest.fn()
}));

describe('AdminFaqPage', () => {
  beforeEach(() => {
    (api as unknown as jest.Mock).mockReset();
    localStorage.setItem('accessToken', 'test-token');
    (global as any).fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true }) });
  });

  it('creates an FAQ entry', async () => {
    (api as unknown as jest.Mock)
      .mockResolvedValueOnce({ ok: true, items: [], categories: [] })
      .mockResolvedValueOnce({ ok: true, categories: [{ id: 'c1', name: 'General', sortOrder: 0 }] })
      .mockResolvedValueOnce({ __httpOk: true })
      .mockResolvedValueOnce({ ok: true, items: [], categories: [] })
      .mockResolvedValueOnce({ ok: true, categories: [{ id: 'c1', name: 'General', sortOrder: 0 }] });

    render(<AdminFaqPage />);

    await waitFor(() => {
      expect(api).toHaveBeenCalledWith('/faq');
      expect(api).toHaveBeenCalledWith('/faq/categories');
    });

    fireEvent.change(screen.getByPlaceholderText('Enter the question'), { target: { value: 'How to book?' } });
    const editor = document.querySelector('[contenteditable="true"]') as HTMLElement;
    expect(editor).toBeTruthy();
    fireEvent.input(editor, { target: { innerHTML: '<p>Book via the site or contact the team.</p>' } });

    fireEvent.click(screen.getByRole('button', { name: /Create FAQ/i }));

    await waitFor(() => {
      expect(api).toHaveBeenCalledWith('/faq', expect.objectContaining({ method: 'POST' }));
    });

    await waitFor(() => {
      expect((global as any).fetch).toHaveBeenCalledWith(
        '/api/revalidate/faq',
        expect.objectContaining({ method: 'POST' })
      );
    });
  });
});

import { render, screen, fireEvent } from '@testing-library/react';
import FaqClient from '@/components/faq/FaqClient';

describe('FaqClient', () => {
  const items = [
    {
      id: '1',
      category: 'General',
      question: 'Where is the resort located?',
      answerHtml: '<p>Marine Drive, Innani.</p>',
      sortOrder: 0
    },
    {
      id: '2',
      category: 'Investment',
      question: 'How does the investment model work?',
      answerHtml: '<p>Contact the team for details.</p>',
      sortOrder: 0
    }
  ];

  it('filters by search keyword', () => {
    render(<FaqClient items={items as any} />);
    const search = screen.getByLabelText('Search questions');
    fireEvent.change(search, { target: { value: 'investment' } });
    expect(screen.getByText('How does the investment model work?')).toBeInTheDocument();
    expect(screen.queryByText('Where is the resort located?')).not.toBeInTheDocument();
  });

  it('toggles accordion answer visibility', () => {
    render(<FaqClient items={items as any} />);
    const btn = screen.getByRole('button', { name: /Where is the resort located\?/i });
    expect(btn).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(btn);
    expect(btn).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('Marine Drive, Innani.')).toBeInTheDocument();
    fireEvent.click(btn);
    expect(btn).toHaveAttribute('aria-expanded', 'false');
  });
});


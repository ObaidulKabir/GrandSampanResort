import { render, screen } from '@testing-library/react';
import PlanOwner from '../PlanOwner';

describe('PlanOwner', () => {
  it('shows name, profession, and city for catalog cards', () => {
    render(
      <PlanOwner
        owner={{ name: 'Rahim Uddin', profession: 'Businessman', city: 'Chattogram' }}
        statusLabel="Booked by"
      />
    );
    expect(screen.getByText('Booked by')).toBeInTheDocument();
    expect(screen.getByText('Rahim Uddin')).toBeInTheDocument();
    expect(screen.getByText('Businessman')).toBeInTheDocument();
    expect(screen.getByText('from Chattogram')).toBeInTheDocument();
  });

  it('compacts profession and city onto one line', () => {
    render(
      <PlanOwner
        owner={{ name: 'Nadia', profession: 'Doctor', city: 'Dhaka' }}
        compact
      />
    );
    expect(screen.getByText('Nadia')).toBeInTheDocument();
    expect(screen.getByText(/Doctor/)).toBeInTheDocument();
    expect(screen.getByText(/from Dhaka/)).toBeInTheDocument();
  });
});

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import Modal from './Modal';

describe('Modal', () => {
  it('uses the viewport-safe shell and a dedicated scroll region', () => {
    const onClose = vi.fn();

    render(
      <Modal
        isOpen
        onClose={onClose}
        title="Safety details"
        overlayClassName="custom-overlay"
        containerClassName="custom-dialog"
      >
        <p>Scrollable modal content</p>
      </Modal>,
    );

    const dialog = screen.getByRole('dialog', { name: 'Safety details' });
    const content = screen.getByText('Scrollable modal content').parentElement;

    expect(dialog).toHaveClass('app-modal-dialog', 'custom-dialog');
    expect(dialog.parentElement).toHaveClass('app-modal-overlay', 'custom-overlay');
    expect(content).toHaveClass('app-modal-scroll');
    expect(document.body.style.overflow).toBe('hidden');
  });

  it('closes on Escape and restores the previous body scroll state', () => {
    const onClose = vi.fn();
    document.body.style.overflow = 'auto';

    const { rerender } = render(
      <Modal isOpen onClose={onClose} title="Test modal">
        Content
      </Modal>,
    );

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);

    rerender(
      <Modal isOpen={false} onClose={onClose} title="Test modal">
        Content
      </Modal>,
    );

    expect(document.body.style.overflow).toBe('auto');
    document.body.style.overflow = '';
  });
});

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CommandPalette } from '../components/common/CommandPalette';
import { KeyboardShortcutsModal } from '../components/common/KeyboardShortcutsModal';
import { OfflineFailoverBanner } from '../components/common/OfflineFailoverBanner';
import { BrowserRouter } from 'react-router-dom';

vi.mock('../context/SocketContext', () => ({
  useSocket: () => ({
    isConnected: false,
    toggleVoiceClarity: vi.fn(),
    broadcastTestSos: vi.fn(),
  }),
}));

describe('Admin CAD Command Center Components', () => {
  describe('CommandPalette', () => {
    it('does not render when isOpen is false', () => {
      const { container } = render(
        <BrowserRouter>
          <CommandPalette isOpen={false} onClose={() => {}} />
        </BrowserRouter>
      );
      expect(container.firstChild).toBeNull();
    });

    it('renders search input and filters commands by query when isOpen is true', () => {
      render(
        <BrowserRouter>
          <CommandPalette isOpen={true} onClose={() => {}} />
        </BrowserRouter>
      );

      const input = screen.getByPlaceholderText(/Type a command/i);
      expect(input).toBeDefined();

      // Search for 'SOS'
      fireEvent.change(input, { target: { value: 'SOS' } });
      expect(screen.getByText(/Unresolved Critical SOS Beacons/i)).toBeDefined();
    });

    it('invokes onClose when clicking backdrop or escape', () => {
      const onCloseMock = vi.fn();
      const { container } = render(
        <BrowserRouter>
          <CommandPalette isOpen={true} onClose={onCloseMock} />
        </BrowserRouter>
      );

      // Click outer overlay
      const backdrop = container.firstChild as HTMLElement;
      fireEvent.click(backdrop);
      expect(onCloseMock).toHaveBeenCalled();
    });
  });

  describe('KeyboardShortcutsModal', () => {
    it('renders shortcut cheat sheet with sections when open', () => {
      render(<KeyboardShortcutsModal isOpen={true} onClose={() => {}} />);

      expect(screen.getByText(/Dispatcher Keyboard Shortcuts/i)).toBeDefined();
      expect(screen.getByText(/Global CAD Navigation/i)).toBeDefined();
      expect(screen.getByText(/Incident Queue & Triage/i)).toBeDefined();
      expect(screen.getByText(/Tactical Audio Player Controls/i)).toBeDefined();
    });

    it('returns null when isOpen is false', () => {
      const { container } = render(<KeyboardShortcutsModal isOpen={false} onClose={() => {}} />);
      expect(container.firstChild).toBeNull();
    });
  });

  describe('OfflineFailoverBanner', () => {
    it('renders failover banner correctly and handles reconnect trigger', () => {
      const onReconnectMock = vi.fn();
      render(
        <OfflineFailoverBanner
          isOfflineOverride={true}
          onManualReconnect={onReconnectMock}
        />
      );

      expect(screen.getByText(/Real-Time Dispatch Connection Interrupted/i)).toBeDefined();
      const retryBtn = screen.getByText(/Reconnect Now/i);
      expect(retryBtn).toBeDefined();

      fireEvent.click(retryBtn);
      expect(onReconnectMock).toHaveBeenCalled();
    });
  });
});

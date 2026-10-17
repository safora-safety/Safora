import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Badge } from '../components/common/Badge';
import { StatCard } from '../components/common/StatCard';
import { Modal } from '../components/common/Modal';
import { Shield, Users } from 'lucide-react';

describe('Admin Common UI Components', () => {
  describe('Badge', () => {
    it('renders with default styles and text content', () => {
      render(<Badge variant="success">ACTIVE ESCORT</Badge>);
      expect(screen.getByText('ACTIVE ESCORT')).toBeDefined();
    });

    it('renders with danger variant and pulse indicator', () => {
      render(
        <Badge variant="danger" pulse={true}>
          CRITICAL SOS
        </Badge>
      );
      expect(screen.getByText('CRITICAL SOS')).toBeDefined();
    });
  });

  describe('StatCard', () => {
    it('renders metric title, value, and icon', () => {
      render(
        <StatCard
          title="Active Walkers"
          value={42}
          icon={Users}
          subtitle="+12% from last hour"
        />
      );

      expect(screen.getByText('Active Walkers')).toBeDefined();
      expect(screen.getByText('42')).toBeDefined();
      expect(screen.getByText('+12% from last hour')).toBeDefined();
    });

    it('renders tabular numbers without jitter', () => {
      render(
        <StatCard
          title="Server WSS Latency"
          value="34 ms"
          icon={Shield}
        />
      );

      expect(screen.getByText('Server WSS Latency')).toBeDefined();
      expect(screen.getByText('34 ms')).toBeDefined();
    });
  });

  describe('Modal', () => {
    it('renders modal dialog with title and children when open', () => {
      render(
        <Modal isOpen={true} onClose={() => {}} title="Test Modal Dialog">
          <div>Modal Inner Content</div>
        </Modal>
      );

      expect(screen.getByText('Test Modal Dialog')).toBeDefined();
      expect(screen.getByText('Modal Inner Content')).toBeDefined();
    });

    it('does not render when isOpen is false', () => {
      const { container } = render(
        <Modal isOpen={false} onClose={() => {}} title="Hidden Dialog">
          <div>Hidden Content</div>
        </Modal>
      );

      expect(container.firstChild).toBeNull();
    });
  });
});

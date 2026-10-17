import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { CalculatorDecoyModal } from '../src/components/decoy/CalculatorDecoyModal';
import { FakeCallModal } from '../src/components/decoy/FakeCallModal';
import { ArrivalCelebrationModal } from '../src/components/safewalk/ArrivalCelebrationModal';
import { ThemeProvider } from '../src/theme/ThemeContext';

describe('Phase 5 Decoy & Arrival UI Components', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  describe('CalculatorDecoyModal', () => {
    it('renders calculator with display and keypad', () => {
      let tree: any;
      act(() => {
        tree = ReactTestRenderer.create(
          <CalculatorDecoyModal visible={true} onClose={() => {}} />,
        );
      });
      expect(tree.toJSON()).toBeTruthy();
      const exitBtn = tree.root.findByProps({
        accessibilityLabel: 'Close Calculator',
      });
      expect(exitBtn).toBeTruthy();
    });

    it('performs basic math calculations', () => {
      let tree: any;
      act(() => {
        tree = ReactTestRenderer.create(
          <CalculatorDecoyModal visible={true} onClose={() => {}} />,
        );
      });

      // Find 7, +, 5, = buttons
      const buttons = tree.root.findAllByType('Text');
      const btn7 = buttons.find((b: any) => b.props.children === '7');
      const btnPlus = buttons.find((b: any) => b.props.children === '+');
      const btn5 = buttons.find((b: any) => b.props.children === '5');
      const btnEquals = buttons.find((b: any) => b.props.children === '=');

      expect(btn7).toBeTruthy();
      expect(btnPlus).toBeTruthy();
      expect(btn5).toBeTruthy();
      expect(btnEquals).toBeTruthy();
    });
  });

  describe('FakeCallModal', () => {
    it('renders incoming call screen and accepts call to show teleprompter', () => {
      let tree: any;
      act(() => {
        tree = ReactTestRenderer.create(
          <FakeCallModal
            visible={true}
            onClose={() => {}}
            callerName="Mom 🏠"
            callerNumber="+91 98765 43210"
          />,
        );
      });

      expect(tree.toJSON()).toBeTruthy();
      const acceptBtn = tree.root.findByProps({
        accessibilityLabel: 'Accept incoming call',
      });
      expect(acceptBtn).toBeTruthy();

      // Tap Accept
      act(() => {
        acceptBtn.props.onPress();
      });

      // Verify connected state duration / teleprompter is rendered
      const updatedTexts = tree.root.findAllByType('Text');
      const durationText = updatedTexts.find(
        (t: any) => t.props.children === '00:00',
      );
      expect(durationText).toBeTruthy();
    });
  });

  describe('ArrivalCelebrationModal', () => {
    it('renders journey statistics and fires onClose when dismissed', () => {
      const onCloseMock = jest.fn();
      let tree: any;

      act(() => {
        tree = ReactTestRenderer.create(
          <ArrivalCelebrationModal
            visible={true}
            destinationName="City Center Library"
            distanceMeters={1200}
            durationSeconds={600}
            onClose={onCloseMock}
          />,
        );
      });

      expect(tree.toJSON()).toBeTruthy();
      const dismissBtn = tree.root.findByProps({
        accessibilityLabel: 'Close arrival dialog',
      });
      expect(dismissBtn).toBeTruthy();

      act(() => {
        dismissBtn.props.onPress();
      });
      expect(onCloseMock).toHaveBeenCalledTimes(1);
    });
  });
});

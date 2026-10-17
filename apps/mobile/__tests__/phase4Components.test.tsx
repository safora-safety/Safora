import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { SosGracePeriodOverlay } from '../src/components/emergency/SosGracePeriodOverlay';
import { AudioWaveformBars } from '../src/components/emergency/AudioWaveformBars';
import { DeviationCountdownModal } from '../src/components/emergency/DeviationCountdownModal';

describe('Phase 4 Emergency UI Components', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  describe('SosGracePeriodOverlay', () => {
    it('renders countdown number and responds to cancel action', () => {
      const onCancelMock = jest.fn();
      let tree: any;

      act(() => {
        tree = ReactTestRenderer.create(
          <SosGracePeriodOverlay
            visible={true}
            countdown={5}
            onCancel={onCancelMock}
          />,
        );
      });

      expect(tree.toJSON()).toBeTruthy();
      // Search for cancel button
      const cancelBtn = tree.root.findByProps({
        accessibilityLabel: 'Cancel SOS, I am safe',
      });
      expect(cancelBtn).toBeTruthy();

      act(() => {
        cancelBtn.props.onPress();
      });
      expect(onCancelMock).toHaveBeenCalledTimes(1);
    });

    it('returns null when visible is false', () => {
      let tree: any;
      act(() => {
        tree = ReactTestRenderer.create(
          <SosGracePeriodOverlay
            visible={false}
            countdown={5}
            onCancel={() => {}}
          />,
        );
      });
      expect(tree.toJSON()).toBeNull();
    });
  });

  describe('AudioWaveformBars', () => {
    it('renders with correct accessibility label when streaming', () => {
      let tree: any;
      act(() => {
        tree = ReactTestRenderer.create(
          <AudioWaveformBars isRecording={true} barCount={7} />,
        );
      });

      expect(tree.toJSON()).toBeTruthy();
      const visualElem = tree.root.findByProps({
        accessibilityLabel: 'Ambient audio recording active',
      });
      expect(visualElem).toBeTruthy();
    });

    it('renders idle state when not recording', () => {
      let tree: any;
      act(() => {
        tree = ReactTestRenderer.create(
          <AudioWaveformBars isRecording={false} barCount={5} />,
        );
      });

      expect(tree.toJSON()).toBeTruthy();
      const visualElem = tree.root.findByProps({
        accessibilityLabel: 'Audio recording paused',
      });
      expect(visualElem).toBeTruthy();
    });
  });

  describe('DeviationCountdownModal', () => {
    it('renders countdown and disarm/escalate buttons properly', () => {
      const onDisarmMock = jest.fn();
      const onEscalateMock = jest.fn();
      let tree: any;

      act(() => {
        tree = ReactTestRenderer.create(
          <DeviationCountdownModal
            visible={true}
            countdownSeconds={45}
            totalSeconds={60}
            onDisarmSafe={onDisarmMock}
            onEscalateSos={onEscalateMock}
          />,
        );
      });

      expect(tree.toJSON()).toBeTruthy();

      const disarmBtn = tree.root.findByProps({
        accessibilityLabel: 'I Am Safe. Disarm route deviation',
      });
      expect(disarmBtn).toBeTruthy();

      act(() => {
        disarmBtn.props.onPress();
      });
      expect(onDisarmMock).toHaveBeenCalledTimes(1);

      const escalateBtn = tree.root.findByProps({
        accessibilityLabel: 'Need Help Now. Immediately dispatch Emergency SOS',
      });
      expect(escalateBtn).toBeTruthy();

      act(() => {
        escalateBtn.props.onPress();
      });
      expect(onEscalateMock).toHaveBeenCalledTimes(1);
    });
  });
});

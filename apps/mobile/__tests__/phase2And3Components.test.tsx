import React from 'react';
import ReactTestRenderer, { act } from 'react-test-renderer';
import { FloatingSearchCapsule } from '../src/components/map/FloatingSearchCapsule';
import { HazardFilterChips } from '../src/components/map/HazardFilterChips';
import { SafetyFabDrawer } from '../src/components/map/SafetyFabDrawer';
import { ActiveWalkCockpitHud } from '../src/components/safewalk/ActiveWalkCockpitHud';
import { HoldToConfirmButton } from '../src/components/safewalk/HoldToConfirmButton';
import { MultiModalRouteSheet } from '../src/components/safewalk/MultiModalRouteSheet';

describe('Phase 2 & 3 Living Map and Safe Walk Cockpit Components', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  describe('FloatingSearchCapsule', () => {
    it('renders with placeholder and safety score meter', () => {
      let tree: any;
      const onSearchChangeMock = jest.fn();
      act(() => {
        tree = ReactTestRenderer.create(
          <FloatingSearchCapsule
            searchQuery=""
            onSearchChange={onSearchChangeMock}
            onClear={() => {}}
            placeholder="Where are you walking to?"
            safetyScore={88}
          />,
        );
      });

      expect(tree.toJSON()).toBeTruthy();
      const instance = tree.root;
      expect(instance).toBeTruthy();
    });
  });

  describe('HazardFilterChips', () => {
    it('renders category chips and triggers category selection', () => {
      const onSelectMock = jest.fn();
      let tree: any;
      act(() => {
        tree = ReactTestRenderer.create(
          <HazardFilterChips
            selectedCategory="all"
            onSelectCategory={onSelectMock}
          />,
        );
      });

      expect(tree.toJSON()).toBeTruthy();
      // Should find touchable chips
      const chips = tree.root.findAllByProps({ accessibilityRole: 'button' });
      expect(chips.length).toBeGreaterThan(0);

      act(() => {
        chips[1].props.onPress();
      });
      expect(onSelectMock).toHaveBeenCalled();
    });
  });

  describe('SafetyFabDrawer', () => {
    it('renders FAB trigger and expands tool options', () => {
      let tree: any;
      act(() => {
        tree = ReactTestRenderer.create(
          <SafetyFabDrawer
            onTriggerFakeCall={() => {}}
            onOpenCalculator={() => {}}
            onReportHazard={() => {}}
            onStartSafeWalk={() => {}}
          />,
        );
      });

      expect(tree.toJSON()).toBeTruthy();
      const fabBtn = tree.root.findByProps({
        accessibilityLabel: 'Open Emergency Safety Tools Drawer',
      });
      expect(fabBtn).toBeTruthy();

      act(() => {
        fabBtn.props.onPress();
      });
      expect(tree.toJSON()).toBeTruthy();
    });
  });

  describe('ActiveWalkCockpitHud', () => {
    it('renders remaining distance, tabular ETA, and safe status', () => {
      let tree: any;
      act(() => {
        tree = ReactTestRenderer.create(
          <ActiveWalkCockpitHud
            destinationName="Campus Gate 2"
            distanceMeters={450}
            etaSeconds={320}
            currentSpeed={1.4}
            deviated={false}
          />,
        );
      });

      expect(tree.toJSON()).toBeTruthy();
    });

    it('renders deviated state with warning indicator', () => {
      let tree: any;
      act(() => {
        tree = ReactTestRenderer.create(
          <ActiveWalkCockpitHud
            destinationName="Campus Gate 2"
            distanceMeters={450}
            etaSeconds={320}
            currentSpeed={1.4}
            deviated={true}
            deviationDistanceMeters={65}
          />,
        );
      });

      expect(tree.toJSON()).toBeTruthy();
    });
  });

  describe('HoldToConfirmButton', () => {
    it('renders hold to confirm button with custom label', () => {
      const onConfirmMock = jest.fn();
      let tree: any;
      act(() => {
        tree = ReactTestRenderer.create(
          <HoldToConfirmButton
            label="HOLD TO END WALK"
            confirmLabel="RELEASE TO CONFIRM"
            onConfirm={onConfirmMock}
            durationMs={1500}
          />,
        );
      });

      expect(tree.toJSON()).toBeTruthy();
      const btn = tree.root.findByProps({ accessibilityRole: 'button' });
      expect(btn).toBeTruthy();
    });
  });

  describe('MultiModalRouteSheet', () => {
    it('renders travel modes and route options', () => {
      let tree: any;
      const travelTimes = {
        walk: { durationSec: 720, distanceMeters: 950 },
        twoWheeler: { durationSec: 240, distanceMeters: 1100 },
        drive: { durationSec: 300, distanceMeters: 1200 },
      };

      act(() => {
        tree = ReactTestRenderer.create(
          <MultiModalRouteSheet
            visible={true}
            destinationName="Library Entrance"
            travelTimes={travelTimes}
            selectedMode="walk"
            onSelectMode={() => {}}
            selectedStrategy="safest"
            onSelectStrategy={() => {}}
            onStartSafeWalk={() => {}}
            onClose={() => {}}
          />,
        );
      });

      expect(tree.toJSON()).toBeTruthy();
    });
  });
});

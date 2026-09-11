import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Vibration,
  SafeAreaView,
  StatusBar,
  Alert,
} from 'react-native';
import { SosService } from '../services/sosService';
import { getCurrentCoordinates } from '../services/locationService';

interface CalculatorDecoyModalProps {
  visible: boolean;
  onClose: () => void;
  duressPin?: string;
}

export const CalculatorDecoyModal: React.FC<CalculatorDecoyModalProps> = ({
  visible,
  onClose,
  duressPin = '9999',
}) => {
  const [display, setDisplay] = useState('0');
  const [prevVal, setPrevVal] = useState<number | null>(null);
  const [operator, setOperator] = useState<string | null>(null);
  const [clearOnNext, setClearOnNext] = useState(false);

  const handleNumber = (digit: string) => {
    if (display === '0' || clearOnNext) {
      setDisplay(digit);
      setClearOnNext(false);
    } else {
      if (display.length < 9) {
        setDisplay(display + digit);
      }
    }
  };

  const handleOperator = (op: string) => {
    setPrevVal(parseFloat(display));
    setOperator(op);
    setClearOnNext(true);
  };

  const handleClear = () => {
    setDisplay('0');
    setPrevVal(null);
    setOperator(null);
    setClearOnNext(false);
  };

  const handleEqual = async () => {
    // Secret Duress Check!
    if (display === duressPin) {
      // Discreet single micro-pulse to confirm trigger without notifying attacker
      Vibration.vibrate(100);
      setDisplay('0');
      setPrevVal(null);
      setOperator(null);

      // Trigger silent background SOS with live coordinates
      try {
        const coords = await getCurrentCoordinates();
        await SosService.triggerSOS({
          latitude: coords.latitude,
          longitude: coords.longitude,
          battery_percentage: 90,
        });
      } catch {
        // Silently fails without suspicious error dialogs
      }
      return;
    }

    if (operator && prevVal !== null) {
      const current = parseFloat(display);
      let result = 0;
      switch (operator) {
        case '+':
          result = prevVal + current;
          break;
        case '−':
          result = prevVal - current;
          break;
        case '×':
          result = prevVal * current;
          break;
        case '÷':
          result = current !== 0 ? prevVal / current : 0;
          break;
      }
      const formatted = Math.round(result * 100000) / 100000;
      setDisplay(String(formatted).slice(0, 9));
      setPrevVal(null);
      setOperator(null);
      setClearOnNext(true);
    }
  };

  const buttons = [
    [
      { label: 'C', type: 'function', action: handleClear },
      {
        label: '±',
        type: 'function',
        action: () => setDisplay(String(-parseFloat(display))),
      },
      {
        label: '%',
        type: 'function',
        action: () => setDisplay(String(parseFloat(display) / 100)),
      },
      { label: '÷', type: 'operator', action: () => handleOperator('÷') },
    ],
    [
      { label: '7', type: 'number', action: () => handleNumber('7') },
      { label: '8', type: 'number', action: () => handleNumber('8') },
      { label: '9', type: 'number', action: () => handleNumber('9') },
      { label: '×', type: 'operator', action: () => handleOperator('×') },
    ],
    [
      { label: '4', type: 'number', action: () => handleNumber('4') },
      { label: '5', type: 'number', action: () => handleNumber('5') },
      { label: '6', type: 'number', action: () => handleNumber('6') },
      { label: '−', type: 'operator', action: () => handleOperator('−') },
    ],
    [
      { label: '1', type: 'number', action: () => handleNumber('1') },
      { label: '2', type: 'number', action: () => handleNumber('2') },
      { label: '3', type: 'number', action: () => handleNumber('3') },
      { label: '+', type: 'operator', action: () => handleOperator('+') },
    ],
    [
      { label: '0', type: 'zero', action: () => handleNumber('0') },
      {
        label: '.',
        type: 'number',
        action: () => {
          if (!display.includes('.')) setDisplay(display + '.');
        },
      },
      { label: '=', type: 'operator', action: handleEqual },
    ],
  ];

  return (
    <Modal visible={visible} animationType="fade" transparent={false}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />
      <SafeAreaView style={styles.container}>
        {/* Stealth Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.exitBtn}>
            <Text style={styles.exitText}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Calculator</Text>
          <View style={{ width: 32 }} />
        </View>

        {/* Calculator Display */}
        <View style={styles.displayArea}>
          <Text
            style={styles.displayText}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {display}
          </Text>
        </View>

        {/* Keypad Grid */}
        <View style={styles.keypad}>
          {buttons.map((row, rIdx) => (
            <View key={rIdx} style={styles.row}>
              {row.map(btn => {
                const isZero = btn.type === 'zero';
                const isOp = btn.type === 'operator';
                const isFunc = btn.type === 'function';

                return (
                  <TouchableOpacity
                    key={btn.label}
                    style={[
                      styles.button,
                      isZero && styles.zeroButton,
                      isOp && styles.opButton,
                      isFunc && styles.funcButton,
                    ]}
                    onPress={btn.action}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.buttonText,
                        isFunc && styles.funcText,
                        isOp && styles.opText,
                      ]}
                    >
                      {btn.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'space-between',
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  exitBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  exitText: {
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: '700',
  },
  headerTitle: {
    color: '#64748B',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  displayArea: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  displayText: {
    color: '#FFFFFF',
    fontSize: 72,
    fontWeight: '300',
  },
  keypad: {
    paddingHorizontal: 16,
    gap: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  button: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#333333',
    alignItems: 'center',
    justifyContent: 'center',
  },
  zeroButton: {
    width: 164,
    alignItems: 'flex-start',
    paddingLeft: 30,
  },
  funcButton: {
    backgroundColor: '#A5A5A5',
  },
  opButton: {
    backgroundColor: '#FF9F0A',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '400',
  },
  funcText: {
    color: '#000000',
  },
  opText: {
    color: '#FFFFFF',
  },
});

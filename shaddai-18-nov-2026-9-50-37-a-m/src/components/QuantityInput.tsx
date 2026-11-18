import React, { useState, useEffect } from 'react';

interface QuantityInputProps {
  value: number;
  min?: number;
  max?: number;
  onChange: (newValue: number) => void;
  className?: string;
  ariaLabel?: string;
}

/**
 * Controlled-friendly numeric input for quantities that lets users
 * freely clear the field (e.g. delete the leading "1") without snapping back
 * mid-typing, and validates/clamps cleanly on blur.
 */
export const QuantityInput: React.FC<QuantityInputProps> = ({
  value,
  min = 1,
  max,
  onChange,
  className = '',
  ariaLabel = 'Cantidad',
}) => {
  const [text, setText] = useState<string>(String(value));
  const [isFocused, setIsFocused] = useState(false);

  // Sync external updates (e.g. +/- buttons or product switch) when not actively editing
  useEffect(() => {
    if (!isFocused) {
      setText(String(value));
    } else if (text !== '' && parseInt(text, 10) !== value) {
      setText(String(value));
    }
  }, [value, isFocused]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    // Allow clearing completely so user can type any number from scratch
    if (raw === '') {
      setText('');
      return;
    }

    // Keep digits only
    const digitsOnly = raw.replace(/[^\d]/g, '');
    if (digitsOnly === '') {
      setText('');
      return;
    }

    const parsed = parseInt(digitsOnly, 10);
    if (isNaN(parsed)) return;

    const clamped = max !== undefined ? Math.min(max, parsed) : parsed;
    setText(String(clamped));

    if (clamped >= min) {
      onChange(clamped);
    }
  };

  const handleBlur = () => {
    setIsFocused(false);
    const parsed = parseInt(text, 10);
    if (isNaN(parsed) || parsed < min) {
      setText(String(min));
      onChange(min);
    } else {
      const clamped = max !== undefined ? Math.min(max, parsed) : parsed;
      setText(String(clamped));
      onChange(clamped);
    }
  };

  return (
    <input
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      aria-label={ariaLabel}
      value={text}
      onFocus={(e) => {
        setIsFocused(true);
        e.target.select();
      }}
      onBlur={handleBlur}
      onChange={handleChange}
      className={className}
    />
  );
};

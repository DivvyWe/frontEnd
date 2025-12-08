// src/components/OtpInput.js
"use client";

import { useState, useRef, useEffect } from "react";

/**
 * 6-digit numeric OTP input
 *
 * Props:
 * - length?: number (default 6)
 * - value?: string           // optional controlled value
 * - onChange?: (otp: string) => void
 * - onComplete?: (otp: string) => void
 * - disabled?: boolean
 * - autoFocus?: boolean
 * - className?: string       // wrapper div extra classes
 */
export default function OtpInput({
  length = 6,
  value,
  onChange,
  onComplete,
  disabled = false,
  autoFocus = true,
  className = "",
}) {
  // Internal state if uncontrolled
  const [internalOtp, setInternalOtp] = useState(Array(length).fill(""));
  const inputsRef = useRef([]);

  const otpArray =
    typeof value === "string" && value.length
      ? value.split("").slice(0, length)
      : internalOtp;

  // Focus first input on mount (optional)
  useEffect(() => {
    if (!autoFocus || disabled) return;
    if (inputsRef.current[0]) {
      inputsRef.current[0].focus();
      inputsRef.current[0].select?.();
    }
  }, [autoFocus, disabled]);

  const updateOtp = (newArr) => {
    // Update internal when uncontrolled
    if (value === undefined) {
      setInternalOtp(newArr);
    }
    const joined = newArr.join("");
    onChange?.(joined);
    if (joined.length === length && !newArr.includes("")) {
      onComplete?.(joined);
    }
  };

  const handleChange = (digit, index) => {
    if (disabled) return;

    // allow only digits
    if (!/^[0-9]?$/.test(digit)) return;

    const next = [...otpArray];
    next[index] = digit;
    updateOtp(next);

    // move focus to next when filled
    if (digit && index < length - 1) {
      const nextInput = inputsRef.current[index + 1];
      nextInput?.focus();
      nextInput?.select?.();
    }
  };

  const handleKeyDown = (e, index) => {
    if (disabled) return;

    if (e.key === "Backspace") {
      if (otpArray[index]) {
        // clear current
        const next = [...otpArray];
        next[index] = "";
        updateOtp(next);
      } else if (index > 0) {
        // move back
        const prevInput = inputsRef.current[index - 1];
        prevInput?.focus();
        prevInput?.select?.();
      }
    }

    if (e.key === "ArrowLeft" && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }

    if (e.key === "ArrowRight" && index < length - 1) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    if (disabled) return;
    e.preventDefault();

    const pasted = e.clipboardData.getData("text") || "";
    const digitsOnly = pasted.replace(/\D/g, "");

    if (!digitsOnly) return;

    const arr = Array(length)
      .fill("")
      .map((_, i) => digitsOnly[i] || "");

    updateOtp(arr);

    // focus last filled or last box
    const lastIndex = Math.min(digitsOnly.length, length) - 1;
    if (lastIndex >= 0 && inputsRef.current[lastIndex]) {
      inputsRef.current[lastIndex].focus();
      inputsRef.current[lastIndex].select?.();
    }
  };

  return (
    <div
      className={`flex items-center justify-center gap-2 ${className}`}
      onPaste={handlePaste}
    >
      {Array.from({ length }).map((_, index) => (
        <input
          key={index}
          ref={(el) => {
            inputsRef.current[index] = el;
          }}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={1}
          autoComplete="one-time-code"
          className="h-11 w-10 rounded-lg border border-slate-300 bg-white text-center text-lg font-semibold text-slate-900 outline-none focus:border-[#84CC16] focus:ring-2 focus:ring-[#84CC16]/30 disabled:bg-slate-100"
          value={otpArray[index] || ""}
          onChange={(e) => handleChange(e.target.value, index)}
          onKeyDown={(e) => handleKeyDown(e, index)}
          disabled={disabled}
        />
      ))}
    </div>
  );
}

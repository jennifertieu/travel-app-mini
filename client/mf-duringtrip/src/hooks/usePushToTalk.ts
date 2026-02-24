import { useState, useRef, useCallback, useEffect } from 'react';
import type { UsePushToTalkOptions, UsePushToTalkReturn } from '../types/voice';

const DEFAULT_MIN_HOLD_TIME = 500; // ms

export function usePushToTalk({
  onStart,
  onEnd,
  minHoldTime = DEFAULT_MIN_HOLD_TIME,
  disabled = false,
}: UsePushToTalkOptions): UsePushToTalkReturn {
  const [isPressed, setIsPressed] = useState(false);
  const [holdDuration, setHoldDuration] = useState(0);

  const pressStartTime = useRef<number | null>(null);
  const holdTimerRef = useRef<number | null>(null);
  const isPressedRef = useRef(false);

  // Trigger haptic feedback if available
  const triggerHaptic = useCallback((pattern: 'light' | 'medium' | 'heavy' = 'medium') => {
    if ('vibrate' in navigator) {
      const patterns = { light: 10, medium: 50, heavy: 100 };
      navigator.vibrate(patterns[pattern]);
    }
  }, []);

  // Start the hold timer to track duration
  const startHoldTimer = useCallback(() => {
    pressStartTime.current = Date.now();

    const updateDuration = () => {
      if (pressStartTime.current && isPressedRef.current) {
        setHoldDuration(Date.now() - pressStartTime.current);
        holdTimerRef.current = requestAnimationFrame(updateDuration);
      }
    };

    holdTimerRef.current = requestAnimationFrame(updateDuration);
  }, []);

  // Stop the hold timer
  const stopHoldTimer = useCallback(() => {
    if (holdTimerRef.current) {
      cancelAnimationFrame(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    pressStartTime.current = null;
    setHoldDuration(0);
  }, []);

  // Handle press start
  const handlePressStart = useCallback(() => {
    if (disabled || isPressedRef.current) return;

    isPressedRef.current = true;
    setIsPressed(true);
    triggerHaptic('medium');
    startHoldTimer();
    onStart();
  }, [disabled, onStart, startHoldTimer, triggerHaptic]);

  // Handle press end
  const handlePressEnd = useCallback(() => {
    if (!isPressedRef.current) return;

    const duration = pressStartTime.current ? Date.now() - pressStartTime.current : 0;

    isPressedRef.current = false;
    setIsPressed(false);
    stopHoldTimer();

    // Only trigger end if held long enough
    if (duration >= minHoldTime) {
      triggerHaptic('light');
      onEnd();
    }
  }, [minHoldTime, onEnd, stopHoldTimer, triggerHaptic]);

  // Pointer event handlers
  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      // Capture the pointer to receive events even if cursor leaves element
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      handlePressStart();
    },
    [handlePressStart]
  );

  const onPointerUp = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      handlePressEnd();
    },
    [handlePressEnd]
  );

  const onPointerLeave = useCallback(
    (e: React.PointerEvent) => {
      // Only end if we don't have pointer capture
      if (!(e.target as HTMLElement).hasPointerCapture(e.pointerId)) {
        handlePressEnd();
      }
    },
    [handlePressEnd]
  );

  const onPointerCancel = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault();
      handlePressEnd();
    },
    [handlePressEnd]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (holdTimerRef.current) {
        cancelAnimationFrame(holdTimerRef.current);
      }
    };
  }, []);

  // Handle keyboard support (space bar)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === ' ' && !e.repeat && !disabled) {
        e.preventDefault();
        handlePressStart();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === ' ') {
        e.preventDefault();
        handlePressEnd();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [disabled, handlePressStart, handlePressEnd]);

  return {
    isPressed,
    holdDuration,
    handlers: {
      onPointerDown,
      onPointerUp,
      onPointerLeave,
      onPointerCancel,
    },
  };
}

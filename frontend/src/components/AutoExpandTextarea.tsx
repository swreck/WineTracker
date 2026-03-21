import { useRef, useCallback } from 'react';
import type { TextareaHTMLAttributes } from 'react';

interface AutoExpandTextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  maxHeight?: number;
}

export default function AutoExpandTextarea({ maxHeight = 300, style, onInput, ...props }: AutoExpandTextareaProps) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const mirrorRef = useRef<HTMLTextAreaElement>(null);

  const resize = useCallback(() => {
    const el = ref.current;
    const mirror = mirrorRef.current;
    if (!el || !mirror) return;
    // Measure using an offscreen mirror element to avoid iOS scroll jump.
    // The mirror has the same styling but is invisible and positioned offscreen.
    mirror.value = el.value;
    const scrollH = mirror.scrollHeight;
    const newHeight = Math.min(scrollH, maxHeight);
    el.style.height = `${newHeight}px`;
    el.style.overflowY = scrollH > maxHeight ? 'auto' : 'hidden';
  }, [maxHeight]);

  const handleInput = useCallback((e: React.FormEvent<HTMLTextAreaElement>) => {
    resize();
    if (onInput) onInput(e);
  }, [resize, onInput]);

  // Use a callback ref to resize on mount
  const setRef = useCallback((el: HTMLTextAreaElement | null) => {
    (ref as React.MutableRefObject<HTMLTextAreaElement | null>).current = el;
    if (el) {
      requestAnimationFrame(() => resize());
    }
  }, [resize]);

  const mergedStyle = {
    minHeight: '120px',
    resize: 'none' as const,
    ...style,
  };

  return (
    <>
      <textarea
        ref={setRef}
        onInput={handleInput}
        style={mergedStyle}
        {...props}
      />
      {/* Offscreen mirror for measuring scrollHeight without collapsing the real element */}
      <textarea
        ref={mirrorRef}
        aria-hidden
        tabIndex={-1}
        style={{
          ...mergedStyle,
          position: 'absolute',
          left: '-9999px',
          top: 0,
          height: '0',
          overflow: 'hidden',
          visibility: 'hidden',
          pointerEvents: 'none',
        }}
      />
    </>
  );
}

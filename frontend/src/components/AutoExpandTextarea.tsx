import { useRef, useEffect } from 'react';
import type { TextareaHTMLAttributes } from 'react';

interface AutoExpandTextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  maxHeight?: number;
}

export default function AutoExpandTextarea({ maxHeight = 300, style, ...props }: AutoExpandTextareaProps) {
  const ref = useRef<HTMLTextAreaElement>(null);

  function resize() {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    const scrollH = el.scrollHeight;
    el.style.height = `${Math.min(scrollH, maxHeight)}px`;
    el.style.overflowY = scrollH > maxHeight ? 'auto' : 'hidden';
  }

  useEffect(() => {
    resize();
  });

  return (
    <textarea
      ref={ref}
      onInput={resize}
      style={{
        minHeight: '120px',
        transition: 'height 0.15s ease',
        resize: 'none',
        ...style,
      }}
      {...props}
    />
  );
}

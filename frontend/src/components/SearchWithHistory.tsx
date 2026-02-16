import { useState, useRef } from 'react';
import { useSearchHistory } from '../hooks/useSearchHistory';

interface Props {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function SearchWithHistory({ value, onChange, placeholder, className }: Props) {
  const { history, addSearch } = useSearchHistory();
  const [showHistory, setShowHistory] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSelect = (term: string) => {
    onChange(term);
    addSearch(term);
    setShowHistory(false);
    inputRef.current?.blur();
  };

  const handleBlur = () => {
    // Delay to allow click on history item
    setTimeout(() => setShowHistory(false), 150);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && value.trim()) {
      addSearch(value);
      setShowHistory(false);
    }
  };

  const handleFocus = () => {
    if (!value && history.length > 0) {
      setShowHistory(true);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue);
    // Hide history when typing
    if (newValue) {
      setShowHistory(false);
    } else if (history.length > 0) {
      setShowHistory(true);
    }
  };

  return (
    <div className="search-with-history">
      <input
        ref={inputRef}
        type="text"
        placeholder={placeholder || "Search wines..."}
        value={value}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className={className || "search-input"}
      />
      {showHistory && history.length > 0 && !value && (
        <div className="search-history-dropdown">
          <div className="history-header">Recent searches</div>
          {history.map((term, i) => (
            <div
              key={i}
              className="history-item"
              onMouseDown={(e) => {
                e.preventDefault();
                handleSelect(term);
              }}
            >
              <span className="history-icon">↺</span> {term}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

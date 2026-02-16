import { useMemo } from 'react';

interface Wine {
  id: number;
  name: string;
}

interface Props {
  wines: Wine[];
  onSelectLetter: (letter: string) => void;
  currentLetter?: string;
}

export function AlphabeticalJump({ wines, onSelectLetter, currentLetter }: Props) {
  // Get letters that have wines
  const availableLetters = useMemo(() => {
    const letters = new Set<string>();
    wines.forEach(w => {
      const first = w.name.charAt(0).toUpperCase();
      if (/[A-Z]/.test(first)) {
        letters.add(first);
      } else {
        letters.add('#'); // For numbers/special chars
      }
    });
    return letters;
  }, [wines]);

  const alphabet = '#ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

  return (
    <div className="alphabetical-jump">
      {alphabet.map(letter => (
        <button
          key={letter}
          className={`jump-letter ${currentLetter === letter ? 'active' : ''} ${!availableLetters.has(letter) ? 'disabled' : ''}`}
          onClick={() => availableLetters.has(letter) && onSelectLetter(letter)}
          disabled={!availableLetters.has(letter)}
        >
          {letter}
        </button>
      ))}
    </div>
  );
}

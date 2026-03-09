import { useState, useRef, useEffect, type KeyboardEvent } from 'react';
import { Button } from '../ui/Button';
import { getLocale } from '../../lib/locale';

interface AnswerInputProps {
  onSubmit: (value: string) => void;
  onReveal: () => void;
  lang: string;
  disabled?: boolean;
}

export function AnswerInput({ onSubmit, onReveal, lang, disabled = false }: AnswerInputProps) {
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const t = getLocale(lang);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  function handleKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' && !disabled) {
      e.preventDefault();
      onSubmit(value.trim());
    } else if (e.key === 'Escape' && !disabled) {
      e.preventDefault();
      onReveal();
    }
  }

  return (
    <div className="answer-input-row">
      <input
        ref={inputRef}
        className="answer-input"
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKey}
        placeholder={t.answer_placeholder}
        disabled={disabled}
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
      />
      <Button variant="primary" disabled={disabled} onClick={() => onSubmit(value.trim())}>
        {t.submit}
      </Button>
      <Button variant="ghost" disabled={disabled} onClick={onReveal}>
        {t.hint_esc}
      </Button>
    </div>
  );
}

import {useEffect, useState} from 'react';

interface FullscreenButtonProps {
  enterLabel: string;
  exitLabel: string;
  onSoundClick?: () => void;
}

export function FullscreenButton({
  enterLabel,
  exitLabel,
  onSoundClick,
}: FullscreenButtonProps) {
  const [isFs, setIsFs] = useState(false);

  useEffect(() => {
    const onChange = () => {
      setIsFs(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const toggle = () => {
    onSoundClick?.();
    if (!document.fullscreenElement) {
      document.documentElement
        .requestFullscreen?.()
        .catch(() => {
          // Preview iframes may block native fullscreen; toggle visual fallback gracefully
          setIsFs((prev) => !prev);
        });
    } else {
      document.exitFullscreen?.().catch(() => setIsFs(false));
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isFs ? exitLabel : enterLabel}
      title={isFs ? exitLabel : enterLabel}
      className="pointer-events-auto flex h-10 w-10 items-center justify-center border border-[#705838]/80 bg-[#101412]/88 text-[#dcd1bc] transition-colors hover:border-[#e07026] hover:text-[#fff3e0] focus-visible:outline-2 focus-visible:outline-[#e07026]"
    >
      {isFs ? (
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 8V5a2 2 0 0 1 2-2h3m8 0h3a2 2 0 0 1 2 2v3m0 8v3a2 2 0 0 1-2 2h-3M8 21H5a2 2 0 0 1-2-2v-3" />
        </svg>
      )}
    </button>
  );
}

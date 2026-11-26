import type {GameAction} from '../core/settings';

export type SkillIconAction = Extract<
  GameAction,
  | 'primary'
  | 'daggerThrow'
  | 'skill1'
  | 'skill2'
  | 'skill3'
  | 'skill4'
  | 'skill5'
  | 'skill6'
  | 'evade'
  | 'potion'
  | 'targetCycle'
>;

interface SkillIconProps {
  action: SkillIconAction;
  className?: string;
}

export function SkillIcon({action, className = 'h-5 w-5'}: SkillIconProps) {
  switch (action) {
    case 'primary':
      // Bearded Kievan Rus Sekira Battle-Axe with Fuller & Poll Spike
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4.5 20.5L17.5 3.8" strokeWidth="2.1" />
          <path
            d="M11.8 6.8c3.6-1.9 7.2-.2 8.1 3.4.5 2.3-1.2 5.2-4.4 5.7-1.5.2-2.5-.9-2.2-2.5.2-1.5-.6-2.8-2.4-3.4"
            fill="currentColor"
            fillOpacity="0.28"
          />
          <path d="M16.2 7.2c1.6.9 2.2 2.4 1.8 4.4" opacity="0.7" />
          <path d="M14.2 5.1l2.8-2.1" />
          <path d="M5.6 18.2l2 2" opacity="0.75" />
        </svg>
      );

    case 'daggerThrow':
      // Spinning Iron Throwing Dagger with Motion Streaks
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20.5 3.5l-7.2 10-2.8-2.8 10-7.2z" fill="currentColor" fillOpacity="0.32" />
          <path d="M19.2 4.8l-5.6 5.6" opacity="0.65" />
          <path d="M9.2 11.2l3.6 3.6" strokeWidth="2.1" />
          <path d="M10.5 13.5L5.2 18.8" strokeWidth="2.2" />
          <path d="M3.5 13h4M3.5 17.2h2.4M7.2 4.8v2.6" opacity="0.6" />
        </svg>
      );

    case 'skill1':
      // Bossed Round Oak Buckler & Concentric Shockwaves
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="10" cy="12" r="6.8" fill="currentColor" fillOpacity="0.2" />
          <circle cx="10" cy="12" r="4.4" opacity="0.45" strokeDasharray="2.5 2" />
          <circle cx="10" cy="12" r="2.1" fill="currentColor" />
          <path d="M18.6 7a7.8 7.8 0 0 1 0 10" strokeWidth="1.9" />
          <path d="M21.2 4.8a11 11 0 0 1 0 14.4" opacity="0.65" />
        </svg>
      );

    case 'skill2':
      // Hearth Flame Surge with Inner Ember Core
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <path
            d="M12.4 2.4c.7 3.4-2.5 5-2.5 7.9 0 1.5 1 2.5 2.2 2.5 1.4 0 2.3-1.2 2.3-3 2.3 1.7 3.8 4.1 3.8 6.7a6.2 6.2 0 0 1-12.4 0c0-3.5 2.2-6.2 4.3-8.4 1.1-1.1 2-2.7 2.3-5.7z"
            fill="currentColor"
            fillOpacity="0.28"
          />
          <path d="M9.4 17.5c0-1.6 1-2.6 2.6-3.4 1.3 1 2.1 2.1 2.1 3.4a2.35 2.35 0 0 1-4.7 0z" fill="currentColor" fillOpacity="0.4" />
          <path d="M6.5 4.8l1.2 1.2M17.8 5.2l-1.1 1.1" opacity="0.65" />
        </svg>
      );

    case 'skill3':
      // Nav Cleave Spectral Crescent Blade & Sigil Dots
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <path
            d="M19.5 4.8a9.8 9.8 0 0 1-14.2 14.2A7.3 7.3 0 0 0 16.4 7.8l3.1-3z"
            fill="currentColor"
            fillOpacity="0.32"
          />
          <path d="M4.6 19.4l3.4-3.4" strokeWidth="2.1" />
          <circle cx="7.5" cy="7.5" r="1.4" fill="currentColor" />
          <circle cx="11.2" cy="5.2" r="0.9" fill="currentColor" opacity="0.7" />
        </svg>
      );

    case 'skill4':
      // Nav Crescendo Execute: Crowned Solar Star over Crescent Horizon
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <path
            d="M12 2.2l2.3 5.4 5.4 2.3-5.4 2.3L12 17.6l-2.3-5.4L4.3 9.9l5.4-2.3L12 2.2z"
            fill="currentColor"
            fillOpacity="0.3"
          />
          <circle cx="12" cy="9.9" r="1.5" fill="currentColor" />
          <path d="M5.5 18a8 8 0 0 0 13 0" strokeWidth="2" />
          <path d="M12 19.4v2.4M8.5 19.2l-.9 1.8M15.5 19.2l.9 1.8" opacity="0.7" />
        </svg>
      );

    case 'skill5':
      // Perun's Whirlwind: Dual Sweeping Blade Arcs + Storm Core
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4.2 11.4a7.8 7.8 0 0 1 13.6-5.2" strokeWidth="2" />
          <path d="M19.8 12.6a7.8 7.8 0 0 1-13.6 5.2" strokeWidth="2" />
          <path d="M15.4 3.8l2.7 2.4-3.2.9z" fill="currentColor" />
          <path d="M8.6 20.2l-2.7-2.4 3.2-.9z" fill="currentColor" />
          <circle cx="12" cy="12" r="2.5" fill="currentColor" fillOpacity="0.35" />
          <path d="M12 8.2v7.6M8.2 12h7.6" opacity="0.55" />
        </svg>
      );

    case 'skill6':
      // Svarog's Ward: Forged Heater Shield with Slavic Kolovrat Cross
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <path
            d="M12 2.8l7.2 3.1v5.6c0 4.8-3.1 8.4-7.2 9.8-4.1-1.4-7.2-5-7.2-9.8V5.9L12 2.8z"
            fill="currentColor"
            fillOpacity="0.24"
          />
          <circle cx="12" cy="11.5" r="2.6" fill="currentColor" fillOpacity="0.25" />
          <path d="M12 6.8v2.2M12 14v2.2M7.3 11.5h2.2M14.5 11.5h2.2" strokeWidth="1.9" />
        </svg>
      );

    case 'evade':
      // Armored Vault & Wind-Cut Chevrons
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.85" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 17.5h6.2l3.4-5.2h5.9" />
          <path d="M15.5 8.8l4.2 3.5-4.2 3.5" />
          <path d="M3.8 11.8h5.5M5.5 7.6h5" opacity="0.65" />
          <circle cx="6.2" cy="17.5" r="1.1" fill="currentColor" />
        </svg>
      );

    case 'potion':
      // Clay Herbal Slavic Flask with Wax Seal & Cross Emblem
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9.2 3.2h5.6" strokeWidth="2.1" />
          <path
            d="M10.4 3.5v3.1L6.6 11.1a5.6 5.6 0 0 0 4.6 9.6h1.6a5.6 5.6 0 0 0 4.6-9.6l-3.8-4.5V3.5"
            fill="currentColor"
            fillOpacity="0.24"
          />
          <path d="M8.5 13.5h7" opacity="0.4" />
          <path d="M12 12.2v4.4M9.8 14.4h4.4" strokeWidth="2" />
        </svg>
      );

    case 'targetCycle':
      // Four-Point Slavic Compass Target Reticle
      return (
        <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="5.6" fill="currentColor" fillOpacity="0.14" />
          <circle cx="12" cy="12" r="1.6" fill="currentColor" />
          <path d="M12 2.2v4.2M12 17.6v4.2M2.2 12h4.2M17.6 12h4.2" strokeWidth="2" />
        </svg>
      );
  }
}

interface GapNightLogoProps {
  className?: string;
  size?: number;
}

export function GapNightLogo({ className = "", size = 32 }: GapNightLogoProps) {
  return (
    <img
      src="/logo.png"
      alt="GapNight"
      width={size}
      height={size}
      className={className}
      style={{ objectFit: 'contain' }}
    />
  );
}

export function GapNightLogoLoader({ size = 48, className = "" }: { size?: number; className?: string }) {
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <img
        src="/logo.png"
        alt="Loading"
        width={size}
        height={size}
        className="animate-spin"
        style={{ animationDuration: '1.5s', objectFit: 'contain' }}
      />
    </div>
  );
}

export function GapNightLogoPulse({ size = 48, className = "" }: { size?: number; className?: string }) {
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <img
        src="/logo.png"
        alt="Loading"
        width={size}
        height={size}
        className="animate-pulse"
        style={{ objectFit: 'contain' }}
      />
    </div>
  );
}

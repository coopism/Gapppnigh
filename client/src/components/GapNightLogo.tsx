interface GapNightLogoProps {
  className?: string;
  size?: number;
  animate?: boolean;
}

export function GapNightLogo({ className = "", size = 32, animate = false }: GapNightLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`${className} ${animate ? 'animate-spin-slow' : ''}`}
    >
      {/* Left teal crescent with angular notch pointing inward */}
      <path
        d="M50 5
           A45 45 0 0 0 5 50
           L22 50
           L38 34
           L38 50
           A12 12 0 0 1 50 38
           L50 5 Z"
        fill="#3B9A8F"
        className={animate ? 'origin-center' : ''}
      />
      
      {/* Right navy crescent with angular notch pointing inward */}
      <path
        d="M50 95
           A45 45 0 0 0 95 50
           L78 50
           L62 66
           L62 50
           A12 12 0 0 1 50 62
           L50 95 Z"
        fill="#3D5A80"
        className={animate ? 'origin-center' : ''}
      />
    </svg>
  );
}

export function GapNightLogoLoader({ size = 48, className = "" }: { size?: number; className?: string }) {
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="animate-spin"
        style={{ animationDuration: '1.5s' }}
      >
        {/* Left teal crescent */}
        <path
          d="M50 5
             A45 45 0 0 0 5 50
             L22 50
             L38 34
             L38 50
             A12 12 0 0 1 50 38
             L50 5 Z"
          fill="#3B9A8F"
        />
        
        {/* Right navy crescent */}
        <path
          d="M50 95
             A45 45 0 0 0 95 50
             L78 50
             L62 66
             L62 50
             A12 12 0 0 1 50 62
             L50 95 Z"
          fill="#3D5A80"
        />
      </svg>
    </div>
  );
}

export function GapNightLogoPulse({ size = 48, className = "" }: { size?: number; className?: string }) {
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="animate-pulse"
      >
        {/* Left teal crescent */}
        <path
          d="M50 5
             A45 45 0 0 0 5 50
             L22 50
             L38 34
             L38 50
             A12 12 0 0 1 50 38
             L50 5 Z"
          fill="#3B9A8F"
        />
        
        {/* Right navy crescent */}
        <path
          d="M50 95
             A45 45 0 0 0 95 50
             L78 50
             L62 66
             L62 50
             A12 12 0 0 1 50 62
             L50 95 Z"
          fill="#3D5A80"
        />
      </svg>
    </div>
  );
}

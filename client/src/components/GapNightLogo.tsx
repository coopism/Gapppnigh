interface GapNightLogoProps {
  className?: string;
  size?: number;
}

export function GapNightLogo({ className = "", size = 32 }: GapNightLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Top-left teal crescent with angular notch */}
      <path
        d="M50 8
           A42 42 0 0 0 8 50
           L25 50
           L42 33
           L42 50
           A8 8 0 0 1 50 42
           L50 8 Z"
        fill="#2DD4BF"
      />
      
      {/* Bottom-right navy crescent */}
      <path
        d="M50 92
           A42 42 0 0 0 92 50
           L75 50
           A25 25 0 0 1 50 75
           L50 92 Z"
        fill="#1E3A5F"
      />
    </svg>
  );
}

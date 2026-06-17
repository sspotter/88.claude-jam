import React from "react";

interface JamhawiLogoProps {
  variant?: "full" | "mark" | "horizontal";
  className?: string;
  height?: number | string;
  width?: number | string;
}

export default function JamhawiLogo({
  variant = "full",
  className = "",
  height,
  width,
}: JamhawiLogoProps) {
  // Define premium luxury gold gradient colors
  const gradientId = "jamhawi-gold-metallic";

  // Svg viewBox & aspect ratio configurations
  let viewBox = "0 0 600 300";
  let defaultWidth = "100%";
  let defaultHeight = "100%";

  if (variant === "mark") {
    viewBox = "0 0 100 120";
    defaultWidth = "40px";
    defaultHeight = "48px";
  } else if (variant === "horizontal") {
    viewBox = "0 0 320 60";
    defaultWidth = "180px";
    defaultHeight = "40px";
  }

  // Beautifully designed custom vector elements
  const GoldGradient = () => (
    <defs>
      <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#8C7A6B" />
        <stop offset="30%" stopColor="#C5A880" />
        <stop offset="50%" stopColor="#E5D3B3" />
        <stop offset="70%" stopColor="#C5A880" />
        <stop offset="100%" stopColor="#8C7A6B" />
      </linearGradient>
    </defs>
  );

  const PalmTree = () => (
    <g stroke={`url(#${gradientId})`} fill="none" strokeLinecap="round" strokeLinejoin="round">
      {/* Trunk with rings */}
      <path d="M 50 100 Q 51 75 50 40" strokeWidth="2.5" />
      <path d="M 47.5 90 L 52.5 90" strokeWidth="1.5" />
      <path d="M 48 80 L 52 80" strokeWidth="1.5" />
      <path d="M 48.5 70 L 51.5 70" strokeWidth="1.5" />
      <path d="M 48.8 60 L 51.2 60" strokeWidth="1.5" />
      <path d="M 49 50 L 51 50" strokeWidth="1.5" />

      {/* Ground lines */}
      <path d="M 40 102 L 60 102" strokeWidth="1.8" />
      <path d="M 45 106 L 55 106" strokeWidth="1.2" />

      {/* Symmetrical Fronds */}
      {/* Left fronds */}
      <path d="M 50 40 Q 30 45 18 55" strokeWidth="1.8" />
      <path d="M 50 40 Q 25 35 15 42" strokeWidth="1.8" />
      <path d="M 50 40 Q 28 25 22 28" strokeWidth="1.8" />
      
      {/* Right fronds */}
      <path d="M 50 40 Q 70 45 82 55" strokeWidth="1.8" />
      <path d="M 50 40 Q 75 35 85 42" strokeWidth="1.8" />
      <path d="M 50 40 Q 72 25 78 28" strokeWidth="1.8" />

      {/* Vertical center frond */}
      <path d="M 50 40 Q 50 20 50 15" strokeWidth="2" />
      <path d="M 50 40 Q 42 22 40 18" strokeWidth="1.5" />
      <path d="M 50 40 Q 58 22 60 18" strokeWidth="1.5" />
    </g>
  );

  if (variant === "mark") {
    return (
      <svg
        viewBox={viewBox}
        width={width || defaultWidth}
        height={height || defaultHeight}
        className={className}
        xmlns="http://www.w3.org/2000/svg"
      >
        <GoldGradient />
        <g transform="translate(0, 5)">
          <PalmTree />
        </g>
      </svg>
    );
  }

  // Use the exact high-quality transparent logo image for text-inclusive layouts
  return (
    <img
      src="/t1.png"
      alt="Jamhawi Modern Projects"
      className={`${className} object-contain`}
      style={{
        height: height || (variant === "horizontal" ? "44px" : "auto"),
        width: width || (variant === "horizontal" ? "auto" : "100%"),
        maxHeight: variant === "full" ? "280px" : "none",
      }}
    />
  );
}

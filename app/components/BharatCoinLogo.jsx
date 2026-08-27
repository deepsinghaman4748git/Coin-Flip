"use client";

import React from "react";

/**
 * Authentic Bharat / Indian Coin Emblem Logo Component
 * Features traditional Indian Rupee motif, milled coin rim, 'भारत' and 'INDIA' text, and wheat grains.
 */
export default function BharatCoinLogo({
  size = "md",
  className = "",
  animate = false,
  showText = false,
  textClassName = "",
  subText = "",
}) {
  // Preset pixel dimensions
  const dimensions = {
    xs: 24,
    sm: 32,
    md: 40,
    lg: 48,
    xl: 64,
    "2xl": 80,
  };

  const px = typeof size === "number" ? size : dimensions[size] || 40;

  return (
    <div className={`inline-flex items-center gap-2.5 select-none ${className}`}>
      <div
        className={`relative rounded-full shrink-0 flex items-center justify-center ${
          animate ? "animate-bounce" : ""
        }`}
        style={{
          width: px,
          height: px,
          filter: "drop-shadow(0 4px 12px rgba(234, 179, 8, 0.35))",
        }}
      >
        <svg
          viewBox="0 0 100 100"
          width={px}
          height={px}
          className="w-full h-full transform transition-transform duration-300 hover:rotate-6 hover:scale-105"
        >
          <defs>
            {/* Outer Rim Metallic Gradient */}
            <linearGradient id="bharatCoinRim" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FDE68A" />
              <stop offset="30%" stopColor="#F59E0B" />
              <stop offset="70%" stopColor="#D97706" />
              <stop offset="100%" stopColor="#78350F" />
            </linearGradient>

            {/* Inner Plate Radial Gold Gradient */}
            <radialGradient id="bharatCoinPlate" cx="40%" cy="35%" r="65%">
              <stop offset="0%" stopColor="#FEF08A" />
              <stop offset="45%" stopColor="#FBBF24" />
              <stop offset="85%" stopColor="#D97706" />
              <stop offset="100%" stopColor="#92400E" />
            </radialGradient>

            {/* Rupee Symbol Emboss Gradient */}
            <linearGradient id="rupeeEmboss" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#451A03" />
              <stop offset="100%" stopColor="#78350F" />
            </linearGradient>

            {/* Light Sheen Overlay */}
            <linearGradient id="coinShine" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.45" />
              <stop offset="40%" stopColor="#FFFFFF" stopOpacity="0.1" />
              <stop offset="70%" stopColor="#000000" stopOpacity="0" />
              <stop offset="100%" stopColor="#000000" stopOpacity="0.25" />
            </linearGradient>
          </defs>

          {/* 1. Coin Base / Outer Milled Ring */}
          <circle cx="50" cy="50" r="48" fill="url(#bharatCoinRim)" stroke="#FDE68A" strokeWidth="1.5" />

          {/* 2. Serrated / Beaded Edge Teeth Pattern */}
          <circle
            cx="50"
            cy="50"
            r="44.5"
            fill="none"
            stroke="#78350F"
            strokeWidth="1.8"
            strokeDasharray="2.5 2.5"
          />

          {/* 3. Inner Metallic Plate */}
          <circle cx="50" cy="50" r="42" fill="url(#bharatCoinPlate)" />

          {/* 4. Fine Concentric Grooves */}
          <circle cx="50" cy="50" r="38" fill="none" stroke="#FEF08A" strokeWidth="0.75" strokeOpacity="0.6" />
          <circle cx="50" cy="50" r="35" fill="none" stroke="#78350F" strokeWidth="0.5" strokeOpacity="0.4" />

          {/* 5. Top Arc Inscription: भारत • BHARAT */}
          <text
            x="50"
            y="20"
            textAnchor="middle"
            fill="#451A03"
            fontSize="7.5"
            fontWeight="900"
            fontFamily="system-ui, -apple-system, sans-serif"
            letterSpacing="1.5"
            style={{ textShadow: "0 0.5px 0.5px rgba(254, 240, 138, 0.8)" }}
          >
            भारत • BHARAT
          </text>

          {/* 6. Traditional Wheat Grain Stalks on Left & Right */}
          {/* Left Grain */}
          <g transform="translate(14, 52) scale(0.65)">
            <path
              d="M 3 0 C 0 -6 6 -12 8 -18 C 9 -12 15 -6 12 0 C 10 3 5 3 3 0 Z"
              fill="#78350F"
              opacity="0.85"
            />
            <path
              d="M 6 8 C 1 3 4 -3 5 -9 C 8 -3 13 3 11 8 Z"
              fill="#78350F"
              opacity="0.85"
            />
            <path d="M 6 16 C 6 8 8 0 8 -20" stroke="#78350F" strokeWidth="1.5" fill="none" />
          </g>

          {/* Right Grain */}
          <g transform="translate(86, 52) scale(-0.65, 0.65)">
            <path
              d="M 3 0 C 0 -6 6 -12 8 -18 C 9 -12 15 -6 12 0 C 10 3 5 3 3 0 Z"
              fill="#78350F"
              opacity="0.85"
            />
            <path
              d="M 6 8 C 1 3 4 -3 5 -9 C 8 -3 13 3 11 8 Z"
              fill="#78350F"
              opacity="0.85"
            />
            <path d="M 6 16 C 6 8 8 0 8 -20" stroke="#78350F" strokeWidth="1.5" fill="none" />
          </g>

          {/* 7. Center Embossed Indian Rupee Symbol (₹) */}
          <g transform="translate(50, 52)">
            {/* Drop shadow */}
            <text
              x="0"
              y="12"
              textAnchor="middle"
              fill="#FEF08A"
              fontSize="34"
              fontWeight="900"
              fontFamily="sans-serif"
              opacity="0.9"
            >
              ₹
            </text>
            {/* Main Rupee */}
            <text
              x="0"
              y="11"
              textAnchor="middle"
              fill="url(#rupeeEmboss)"
              fontSize="34"
              fontWeight="900"
              fontFamily="sans-serif"
            >
              ₹
            </text>
          </g>

          {/* 8. Bottom Inscription: INDIA • सत्यमेव जयते */}
          <text
            x="50"
            y="88"
            textAnchor="middle"
            fill="#451A03"
            fontSize="6.5"
            fontWeight="900"
            fontFamily="system-ui, -apple-system, sans-serif"
            letterSpacing="1.2"
            style={{ textShadow: "0 0.5px 0.5px rgba(254, 240, 138, 0.8)" }}
          >
            INDIA • 2026
          </text>

          {/* 9. Convex Glassy Shine Layer */}
          <circle cx="50" cy="50" r="42" fill="url(#coinShine)" pointerEvents="none" />
        </svg>
      </div>

      {showText && (
        <div className="flex flex-col">
          <div className={`font-black tracking-tight leading-none ${textClassName || "text-white text-xl"}`}>
            CoinFlip
          </div>
          {subText && (
            <span className="text-[10px] font-bold text-yellow-400 tracking-wider uppercase mt-0.5">
              {subText}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

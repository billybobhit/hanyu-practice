export default function Peasant({ style }: { style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 300 400" xmlns="http://www.w3.org/2000/svg" style={style} aria-label="Peasant">
      <style>{`
        .psn-root { transform-box: fill-box; transform-origin: center; animation: psn-enter 0.65s cubic-bezier(0.34,1.56,0.64,1) both; }
        @keyframes psn-enter { from { transform: scale(0) rotate(3deg); opacity: 0; } to { transform: scale(1) rotate(0deg); opacity: 1; } }
        .psn-sway { transform-box: fill-box; transform-origin: center 300px; animation: psn-sway 3s ease-in-out infinite; }
        @keyframes psn-sway { 0%,100% { transform: rotate(0deg); } 50% { transform: rotate(1.5deg); } }
        .psn-yoke { transform-box: fill-box; transform-origin: 150px 250px; animation: psn-yoke 3s ease-in-out infinite; }
        @keyframes psn-yoke { 0%,100% { transform: rotate(0deg); } 50% { transform: rotate(1.5deg); } }
        .psn-bucket-l { transform-box: fill-box; transform-origin: 68px 290px; animation: psn-buck-l 3s ease-in-out infinite; }
        @keyframes psn-buck-l { 0%,100% { transform: rotate(-3deg); } 50% { transform: rotate(3deg); } }
        .psn-bucket-r { transform-box: fill-box; transform-origin: 232px 290px; animation: psn-buck-r 3s ease-in-out infinite; }
        @keyframes psn-buck-r { 0%,100% { transform: rotate(3deg); } 50% { transform: rotate(-3deg); } }
      `}</style>

      <g className="psn-root">
        <g className="psn-sway">
          {/* Legs — short, barely visible under robe */}
          <rect x="128" y="330" width="24" height="52" rx="5" fill="#4A3020" />
          <rect x="148" y="330" width="24" height="52" rx="5" fill="#4A3020" />
          {/* Sandals */}
          <ellipse cx="140" cy="382" rx="20" ry="8" fill="#3A2010" />
          <ellipse cx="160" cy="382" rx="20" ry="8" fill="#3A2010" />

          {/* Body robe — hunched, simple tunic */}
          <path d="M 118,210 L 110,336 L 190,336 L 182,210 Q 165,200 150,198 Q 135,200 118,210 Z" fill="#5A4028" />
          {/* Robe shading */}
          <path d="M 130,218 L 124,328 L 176,328 L 170,218 Q 160,210 150,208 Q 140,210 130,218 Z" fill="#4A3020" />
          {/* Simple fabric folds */}
          <line x1="138" y1="225" x2="132" y2="320" stroke="#3A2010" strokeWidth="1.5" opacity="0.5" />
          <line x1="162" y1="225" x2="168" y2="320" stroke="#3A2010" strokeWidth="1.5" opacity="0.5" />
          {/* Sash belt */}
          <path d="M 112,255 Q 150,248 188,255 L 188,266 Q 150,260 112,266 Z" fill="#8A6028" />

          {/* Neck */}
          <rect x="138" y="190" width="24" height="22" rx="4" fill="#C68642" />

          {/* Head — bent forward / hunched */}
          <ellipse cx="150" cy="175" rx="30" ry="34" fill="#1C0C06" />
          <ellipse cx="152" cy="178" rx="23" ry="27" fill="#C68642" />
          {/* Tired eyes, looking down */}
          <ellipse cx="139" cy="174" rx="6" ry="4" fill="#1a1a1a" />
          <ellipse cx="163" cy="174" rx="6" ry="4" fill="#1a1a1a" />
          {/* Weary brows */}
          <path d="M 130,165 Q 139,162 148,165" fill="none" stroke="#1C0C06" strokeWidth="3" strokeLinecap="round" />
          <path d="M 152,165 Q 161,162 170,165" fill="none" stroke="#1C0C06" strokeWidth="3" strokeLinecap="round" />
          {/* Mouth — downturn, tired */}
          <path d="M 140,190 Q 150,187 160,190" fill="none" stroke="#5A2E14" strokeWidth="2" strokeLinecap="round" />
          {/* Nose */}
          <ellipse cx="152" cy="181" rx="5" ry="4" fill="#B8704A" />
        </g>

        {/* Yoke and buckets (animate separately) */}
        <g className="psn-yoke">
          {/* Bamboo carrying pole across shoulders */}
          <rect x="54" y="247" width="192" height="8" rx="4" fill="#7A5510" />
          {/* Pole detail */}
          <line x1="90" y1="247" x2="90" y2="255" stroke="#5A3808" strokeWidth="1.5" />
          <line x1="120" y1="247" x2="120" y2="255" stroke="#5A3808" strokeWidth="1.5" />
          <line x1="150" y1="247" x2="150" y2="255" stroke="#5A3808" strokeWidth="1.5" />
          <line x1="180" y1="247" x2="180" y2="255" stroke="#5A3808" strokeWidth="1.5" />
          <line x1="210" y1="247" x2="210" y2="255" stroke="#5A3808" strokeWidth="1.5" />

          {/* Left rope */}
          <line x1="68" y1="255" x2="68" y2="278" stroke="#8A7050" strokeWidth="3" strokeLinecap="round" />
          {/* Right rope */}
          <line x1="232" y1="255" x2="232" y2="278" stroke="#8A7050" strokeWidth="3" strokeLinecap="round" />

          {/* Left bucket */}
          <g className="psn-bucket-l">
            <path d="M 52,278 L 58,320 L 78,320 L 84,278 Z" fill="#6B4A1A" />
            <rect x="52" y="275" width="32" height="8" rx="2" fill="#7A5A28" />
            <rect x="52" y="316" width="32" height="6" rx="2" fill="#5A3A12" />
            {/* Water drops */}
            <ellipse cx="64" cy="325" rx="3" ry="4" fill="#4080A0" opacity="0.7" />
            <ellipse cx="72" cy="322" rx="2" ry="3" fill="#4080A0" opacity="0.6" />
          </g>

          {/* Right bucket */}
          <g className="psn-bucket-r">
            <path d="M 216,278 L 222,320 L 242,320 L 248,278 Z" fill="#6B4A1A" />
            <rect x="216" y="275" width="32" height="8" rx="2" fill="#7A5A28" />
            <rect x="216" y="316" width="32" height="6" rx="2" fill="#5A3A12" />
            <ellipse cx="228" cy="325" rx="3" ry="4" fill="#4080A0" opacity="0.7" />
            <ellipse cx="236" cy="322" rx="2" ry="3" fill="#4080A0" opacity="0.6" />
          </g>
        </g>

        {/* Straw hat — large, dominant, drawn on top */}
        <g className="psn-sway">
          {/* Hat brim shadow */}
          <ellipse cx="150" cy="152" rx="110" ry="22" fill="#3A2810" opacity="0.4" />
          {/* Hat brim */}
          <ellipse cx="150" cy="148" rx="108" ry="20" fill="#8A7040" />
          {/* Hat body — conical */}
          <path d="M 42,148 Q 150,28 258,148 Z" fill="#A88C50" />
          {/* Hat highlight */}
          <path d="M 80,148 Q 150,52 220,148" fill="none" stroke="#C0A860" strokeWidth="2" opacity="0.6" />
          {/* Hat weave lines */}
          <path d="M 60,140 Q 150,60 240,140" fill="none" stroke="#6A5028" strokeWidth="1.5" opacity="0.35" />
          <path d="M 72,144 Q 150,70 228,144" fill="none" stroke="#6A5028" strokeWidth="1" opacity="0.3" />
          {/* Hat tip */}
          <circle cx="150" cy="28" r="6" fill="#8A7040" />
          {/* Brim trim */}
          <ellipse cx="150" cy="148" rx="108" ry="20" fill="none" stroke="#6A5028" strokeWidth="2" />
        </g>
      </g>
    </svg>
  );
}

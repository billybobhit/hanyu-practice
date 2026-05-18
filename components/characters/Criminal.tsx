export default function Criminal({ style }: { style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 300 400" xmlns="http://www.w3.org/2000/svg" style={style} aria-label="Criminal">
      <style>{`
        .crm-root { transform-box: fill-box; transform-origin: center; animation: crm-enter 0.65s cubic-bezier(0.34,1.56,0.64,1) both; }
        @keyframes crm-enter { from { transform: scale(0) rotate(-3deg); opacity: 0; } to { transform: scale(1) rotate(0deg); opacity: 1; } }
        .crm-chain-l { transform-box: fill-box; transform-origin: 95px 285px; animation: crm-chain 2.8s ease-in-out infinite; }
        @keyframes crm-chain { 0%,100% { transform: rotate(-4deg); } 50% { transform: rotate(4deg); } }
        .crm-chain-r { transform-box: fill-box; transform-origin: 205px 285px; animation: crm-chainr 2.8s ease-in-out infinite; }
        @keyframes crm-chainr { 0%,100% { transform: rotate(4deg); } 50% { transform: rotate(-4deg); } }
        .crm-shadow { animation: crm-shadow 2.5s ease-in-out infinite; }
        @keyframes crm-shadow { 0%,100% { opacity: 0.18; } 50% { opacity: 0.38; } }
      `}</style>

      <g className="crm-root">
        {/* Dark ominous shadow pool beneath */}
        <ellipse className="crm-shadow" cx="150" cy="370" rx="80" ry="18" fill="#8B0000" />

        {/* Ground shadow */}
        <ellipse cx="150" cy="374" rx="65" ry="12" fill="#0D0404" opacity="0.6" />

        {/* Legs — feet barely visible */}
        <rect x="128" y="330" width="22" height="44" rx="5" fill="#1A0808" />
        <rect x="150" y="330" width="22" height="44" rx="5" fill="#1A0808" />

        {/* Main body — hunched, heavy dark robe */}
        <path d="M 112,190 Q 96,260 100,338 L 200,338 Q 204,260 188,190 Q 168,178 150,176 Q 132,178 112,190 Z" fill="#1A0808" />
        {/* Robe shading — slightly lighter front */}
        <path d="M 122,196 Q 108,262 112,330 L 188,330 Q 192,262 178,196 Q 163,186 150,184 Q 137,186 122,196 Z" fill="#260C0C" />
        {/* Tattered hem */}
        <path d="M 100,330 L 104,345 L 112,332 L 118,348 L 126,334 L 134,350 L 150,334 L 166,350 L 174,334 L 182,348 L 188,334 L 196,345 L 200,330" fill="#1A0808" />

        {/* Shoulders — hunched, rounded down */}
        <ellipse cx="108" cy="192" rx="22" ry="16" fill="#200A0A" />
        <ellipse cx="192" cy="192" rx="22" ry="16" fill="#200A0A" />

        {/* Arms — hanging down, wrists forward */}
        <path d="M 108,188 L 88,282 L 106,290 L 124,202" fill="#1A0808" />
        <path d="M 192,188 L 212,282 L 194,290 L 176,202" fill="#1A0808" />

        {/* Wrist cuffs / shackles */}
        <rect x="80" y="282" width="30" height="16" rx="5" fill="#4A3828" />
        <rect x="80" y="285" width="30" height="10" rx="4" fill="#6B5040" />
        <circle cx="82" cy="290" r="4" fill="#8A6850" />
        <circle cx="107" cy="290" r="4" fill="#8A6850" />

        <rect x="190" y="282" width="30" height="16" rx="5" fill="#4A3828" />
        <rect x="190" y="285" width="30" height="10" rx="4" fill="#6B5040" />
        <circle cx="192" cy="290" r="4" fill="#8A6850" />
        <circle cx="217" cy="290" r="4" fill="#8A6850" />

        {/* Chains — left */}
        <g className="crm-chain-l">
          <ellipse cx="95" cy="305" rx="9" ry="5" fill="none" stroke="#5A4030" strokeWidth="3" />
          <ellipse cx="95" cy="317" rx="6" ry="9" fill="none" stroke="#5A4030" strokeWidth="3" />
          <ellipse cx="95" cy="330" rx="9" ry="5" fill="none" stroke="#5A4030" strokeWidth="3" />
          <ellipse cx="95" cy="342" rx="6" ry="9" fill="none" stroke="#5A4030" strokeWidth="3" />
        </g>

        {/* Chains — right */}
        <g className="crm-chain-r">
          <ellipse cx="205" cy="305" rx="9" ry="5" fill="none" stroke="#5A4030" strokeWidth="3" />
          <ellipse cx="205" cy="317" rx="6" ry="9" fill="none" stroke="#5A4030" strokeWidth="3" />
          <ellipse cx="205" cy="330" rx="9" ry="5" fill="none" stroke="#5A4030" strokeWidth="3" />
          <ellipse cx="205" cy="342" rx="6" ry="9" fill="none" stroke="#5A4030" strokeWidth="3" />
        </g>

        {/* Neck — bowed forward */}
        <rect x="136" y="158" width="28" height="24" rx="4" fill="#1A0808" />

        {/* Head — bowed down, chin to chest */}
        <ellipse cx="150" cy="148" rx="34" ry="38" fill="#120606" />
        {/* Face in shadow */}
        <ellipse cx="150" cy="152" rx="26" ry="30" fill="#1E0A0A" />
        {/* Hair — disheveled strands */}
        <path d="M 118,130 Q 124,118 135,125" fill="none" stroke="#0D0404" strokeWidth="5" strokeLinecap="round" />
        <path d="M 130,112 Q 140,100 152,108" fill="none" stroke="#0D0404" strokeWidth="5" strokeLinecap="round" />
        <path d="M 152,108 Q 166,100 174,115" fill="none" stroke="#0D0404" strokeWidth="5" strokeLinecap="round" />
        <path d="M 174,118 Q 180,128 178,140" fill="none" stroke="#0D0404" strokeWidth="5" strokeLinecap="round" />
        {/* Eyes — barely visible slits, head bowed */}
        <ellipse cx="136" cy="155" rx="6" ry="3" fill="#2A0808" />
        <ellipse cx="164" cy="155" rx="6" ry="3" fill="#2A0808" />
        {/* Mouth — thin, hopeless */}
        <path d="M 138,172 Q 150,170 162,172" fill="none" stroke="#3A1010" strokeWidth="2" strokeLinecap="round" />
        {/* Dark circles under eyes */}
        <ellipse cx="136" cy="160" rx="8" ry="5" fill="#1a0606" opacity="0.5" />
        <ellipse cx="164" cy="160" rx="8" ry="5" fill="#1a0606" opacity="0.5" />

        {/* Criminal brand mark / sign on chest */}
        <rect x="134" y="218" width="32" height="22" rx="3" fill="#3A1010" />
        <text x="150" y="234" textAnchor="middle" fill="#8B0000" fontSize="12" fontFamily="serif" fontWeight="bold">罪</text>

        {/* Dark aura particles — downward */}
        <circle cx="80" cy="280" r="3" fill="#8B0000" opacity="0.5" />
        <circle cx="220" cy="260" r="2.5" fill="#8B0000" opacity="0.4" />
        <circle cx="72" cy="320" r="2" fill="#5A0000" opacity="0.4" />
        <circle cx="228" cy="300" r="2" fill="#5A0000" opacity="0.35" />
      </g>
    </svg>
  );
}

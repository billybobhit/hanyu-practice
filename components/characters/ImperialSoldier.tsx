export default function ImperialSoldier({ style }: { style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 300 400" xmlns="http://www.w3.org/2000/svg" style={style} aria-label="Imperial Soldier">
      <style>{`
        .isp-root { transform-box: fill-box; transform-origin: center; animation: isp-enter 0.65s cubic-bezier(0.34,1.56,0.64,1) both; }
        @keyframes isp-enter { from { transform: scale(0); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        .isp-breathe { transform-box: fill-box; transform-origin: center; animation: isp-breathe 4s ease-in-out infinite; }
        @keyframes isp-breathe { 0%,100% { transform: scaleY(1); } 50% { transform: scaleY(1.012); } }
        .isp-spear { transform-box: fill-box; transform-origin: 218px 320px; animation: isp-spear 5s ease-in-out infinite; }
        @keyframes isp-spear { 0%,100% { transform: rotate(0deg); } 50% { transform: rotate(0.8deg); } }
        .isp-plume { transform-box: fill-box; transform-origin: center bottom; animation: isp-plume 2.5s ease-in-out infinite; }
        @keyframes isp-plume { 0%,100% { transform: skewX(0deg); } 50% { transform: skewX(5deg); } }
      `}</style>

      <g className="isp-root">
        {/* Spear */}
        <g className="isp-spear">
          {/* Spear shaft */}
          <line x1="218" y1="320" x2="218" y2="15" stroke="#5A3808" strokeWidth="8" strokeLinecap="round" />
          {/* Spear blade */}
          <polygon points="210,14 218,0 226,14 222,32 214,32" fill="#9ca3af" />
          <line x1="218" y1="0" x2="218" y2="35" stroke="#c0c8d4" strokeWidth="2" />
          {/* Red tassel */}
          <line x1="218" y1="36" x2="214" y2="56" stroke="#CC2218" strokeWidth="3" strokeLinecap="round" />
          <line x1="218" y1="36" x2="218" y2="58" stroke="#CC2218" strokeWidth="3" strokeLinecap="round" />
          <line x1="218" y1="36" x2="222" y2="56" stroke="#CC2218" strokeWidth="3" strokeLinecap="round" />
        </g>

        {/* Legs */}
        <rect x="118" y="248" width="38" height="120" rx="6" fill="#4A3828" />
        <rect x="160" y="248" width="38" height="120" rx="6" fill="#4A3828" />
        {/* Greaves (leg armor) */}
        <rect x="114" y="282" width="46" height="52" rx="4" fill="#6B5040" />
        <rect x="140" y="282" width="46" height="52" rx="4" fill="#6B5040" />
        {/* Boots */}
        <rect x="110" y="350" width="52" height="28" rx="10" fill="#2C1C10" />
        <rect x="138" y="350" width="52" height="28" rx="10" fill="#2C1C10" />

        {/* Main body with breathing animation */}
        <g className="isp-breathe">
          {/* Torso armor — layered plates */}
          {/* Back plate */}
          <path d="M 104,125 L 100,248 L 200,248 L 196,125 Z" fill="#5A4030" />
          {/* Chest plate (main) */}
          <rect x="108" y="132" width="84" height="88" rx="6" fill="#6B5040" />
          {/* Chest plate ridge lines (terracotta detail) */}
          <line x1="118" y1="148" x2="182" y2="148" stroke="#4A3828" strokeWidth="2" />
          <line x1="118" y1="164" x2="182" y2="164" stroke="#4A3828" strokeWidth="2" />
          <line x1="118" y1="180" x2="182" y2="180" stroke="#4A3828" strokeWidth="2" />
          <line x1="118" y1="196" x2="182" y2="196" stroke="#4A3828" strokeWidth="2" />
          {/* Pauldrons (shoulder armor) */}
          <path d="M 108,128 L 88,165 L 108,172 L 110,148 Z" fill="#7A5848" />
          <path d="M 192,128 L 212,165 L 192,172 L 190,148 Z" fill="#7A5848" />
          <rect x="82" y="126" width="32" height="16" rx="4" fill="#8A6858" />
          <rect x="186" y="126" width="32" height="16" rx="4" fill="#8A6858" />
          {/* Belt */}
          <rect x="100" y="218" width="100" height="16" rx="4" fill="#3A2818" />
          <rect x="142" y="215" width="16" height="22" rx="3" fill="#5A3808" />
          {/* Waist tassets */}
          <rect x="104" y="232" width="38" height="22" rx="3" fill="#6B5040" />
          <rect x="158" y="232" width="38" height="22" rx="3" fill="#6B5040" />

          {/* Arms */}
          {/* Left arm (at side) */}
          <path d="M 100,132 L 84,218 L 102,225 L 116,150" fill="#5A4030" />
          <circle cx="90" cy="222" r="14" fill="#7A5040" />
          {/* Right arm (holding spear) */}
          <path d="M 200,132 L 216,218 L 202,228 L 184,150" fill="#5A4030" />
          <circle cx="212" cy="226" r="14" fill="#7A5040" />

          {/* Neck */}
          <rect x="135" y="100" width="30" height="30" rx="4" fill="#7A5848" />
          <rect x="132" y="96" width="36" height="14" rx="3" fill="#8A6858" />

          {/* Head */}
          <ellipse cx="150" cy="80" rx="35" ry="40" fill="#4A3828" />
          <ellipse cx="150" cy="83" rx="27" ry="31" fill="#C68642" />
          {/* Face features */}
          <ellipse cx="136" cy="76" rx="7" ry="6" fill="#1a1a1a" />
          <ellipse cx="164" cy="76" rx="7" ry="6" fill="#1a1a1a" />
          <circle cx="138" cy="75" r="2" fill="white" />
          <circle cx="166" cy="75" r="2" fill="white" />
          {/* Stern brows */}
          <path d="M 126,66 L 146,70" stroke="#1C0C06" strokeWidth="3.5" strokeLinecap="round" />
          <path d="M 154,70 L 174,66" stroke="#1C0C06" strokeWidth="3.5" strokeLinecap="round" />
          <path d="M 136,90 Q 150,93 164,90" fill="none" stroke="#5A2E14" strokeWidth="2" strokeLinecap="round" />
          <path d="M 144,82 L 142,88 L 150,90 L 158,88 L 156,82" fill="none" stroke="#8B5A2B" strokeWidth="1.5" />

          {/* Helmet */}
          <path d="M 112,60 Q 112,30 150,22 Q 188,30 188,60 L 188,72 L 112,72 Z" fill="#4A3828" />
          {/* Helmet face guard sides */}
          <rect x="110" y="65" width="20" height="28" rx="3" fill="#5A4030" />
          <rect x="170" y="65" width="20" height="28" rx="3" fill="#5A4030" />
          {/* Helmet brim */}
          <rect x="108" y="70" width="84" height="12" rx="3" fill="#6B5040" />
          {/* Helmet crest */}
          <rect x="144" y="20" width="12" height="14" rx="3" fill="#8A6858" />
          <circle cx="150" cy="17" r="7" fill="#9B7868" />
        </g>

        {/* Helmet plume */}
        <g className="isp-plume">
          <path d="M 148,14 Q 140,6 138,0 Q 144,4 150,8 Q 156,4 162,0 Q 160,6 152,14 Z" fill="#CC2218" />
          <path d="M 142,10 Q 138,2 140,0 Q 144,6 150,10 Q 156,6 160,0 Q 162,2 158,10 Z" fill="#FF4030" opacity="0.6" />
        </g>
      </g>
    </svg>
  );
}

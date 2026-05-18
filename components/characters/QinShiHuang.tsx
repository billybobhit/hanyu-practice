export default function QinShiHuang({ style }: { style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 300 400" xmlns="http://www.w3.org/2000/svg" style={style} aria-label="Qin Shi Huang">
      <style>{`
        .qsh-root { transform-box: fill-box; transform-origin: center; animation: qsh-enter 0.65s cubic-bezier(0.34,1.56,0.64,1) both; }
        @keyframes qsh-enter { from { transform: scale(0) rotate(4deg); opacity: 0; } to { transform: scale(1) rotate(0deg); opacity: 1; } }
        .qsh-robe { transform-box: fill-box; transform-origin: top center; animation: qsh-robe 5s ease-in-out infinite; }
        @keyframes qsh-robe { 0%,100% { transform: scaleX(1); } 50% { transform: scaleX(1.008); } }
        .qsh-crown { animation: qsh-glint 3s ease-in-out infinite; }
        @keyframes qsh-glint { 0%,100% { opacity: 1; } 50% { opacity: 0.82; } }
        .qsh-aura { animation: qsh-aura 3s ease-in-out infinite; }
        @keyframes qsh-aura { 0%,100% { opacity: 0.08; } 50% { opacity: 0.18; } }
      `}</style>

      <g className="qsh-root">
        {/* Silver-blue aura */}
        <ellipse className="qsh-aura" cx="150" cy="220" rx="95" ry="110" fill="#c0c8d8" />

        {/* Throne back */}
        <rect x="52" y="55" width="196" height="300" rx="6" fill="#120808" />
        <rect x="52" y="55" width="196" height="10" rx="5" fill="#EEC050" />
        <rect x="52" y="350" width="196" height="8" fill="#EEC050" />
        {/* Throne legs */}
        <rect x="58" y="352" width="22" height="36" rx="4" fill="#0D0505" />
        <rect x="220" y="352" width="22" height="36" rx="4" fill="#0D0505" />
        {/* Throne side arms */}
        <rect x="44" y="208" width="28" height="96" rx="6" fill="#0D0505" />
        <rect x="228" y="208" width="28" height="96" rx="6" fill="#0D0505" />
        <rect x="44" y="200" width="28" height="14" rx="5" fill="#EEC050" />
        <rect x="228" y="200" width="28" height="14" rx="5" fill="#EEC050" />

        {/* Robe — main body, seated wide shape */}
        <g className="qsh-robe">
          {/* Main robe body */}
          <path d="M 92,172 L 48,368 L 252,368 L 208,172 Z" fill="#6B0018" />
          {/* Wide sleeves */}
          <path d="M 96,188 L 38,255 L 52,270 L 112,212 Z" fill="#6B0018" />
          <path d="M 204,188 L 262,255 L 248,270 L 188,212 Z" fill="#6B0018" />
          {/* Gold robe trim — collar */}
          <path d="M 130,172 L 150,162 L 170,172 L 170,185 L 150,175 L 130,185 Z" fill="#EEC050" />
          {/* Gold hem */}
          <rect x="52" y="355" width="196" height="14" rx="2" fill="#EEC050" opacity="0.6" />
          {/* Gold sleeve cuffs */}
          <ellipse cx="45" cy="262" rx="18" ry="13" fill="#EEC050" />
          <ellipse cx="255" cy="262" rx="18" ry="13" fill="#EEC050" />
          {/* Dragon motif left */}
          <path d="M 76,240 Q 65,218 82,210 Q 100,202 95,220 Q 88,238 98,252 Q 108,266 92,260" fill="none" stroke="#EEC050" strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="76" cy="242" r="4" fill="#EEC050" />
          {/* Dragon motif right */}
          <path d="M 224,240 Q 235,218 218,210 Q 200,202 205,220 Q 212,238 202,252 Q 192,266 208,260" fill="none" stroke="#EEC050" strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="224" cy="242" r="4" fill="#EEC050" />
        </g>

        {/* Hands resting on throne arms */}
        <ellipse cx="58" cy="208" rx="16" ry="11" fill="#C68642" />
        <ellipse cx="242" cy="208" rx="16" ry="11" fill="#C68642" />

        {/* Neck */}
        <rect x="136" y="155" width="28" height="22" rx="4" fill="#C68642" />

        {/* Head */}
        <ellipse cx="150" cy="132" rx="38" ry="44" fill="#1C0C06" />
        <ellipse cx="150" cy="136" rx="30" ry="36" fill="#C68642" />
        {/* Cheekbones — slightly lighter */}
        <ellipse cx="124" cy="142" rx="12" ry="10" fill="#D4956A" opacity="0.5" />
        <ellipse cx="176" cy="142" rx="12" ry="10" fill="#D4956A" opacity="0.5" />
        {/* Eyes — narrow, imperial */}
        <ellipse cx="134" cy="124" rx="8" ry="6" fill="#1a1a1a" />
        <ellipse cx="166" cy="124" rx="8" ry="6" fill="#1a1a1a" />
        <circle cx="136" cy="123" r="2.5" fill="white" />
        <circle cx="168" cy="123" r="2.5" fill="white" />
        {/* Eyebrows — strong, downward-serious */}
        <path d="M 123,114 Q 133,110 145,115" fill="none" stroke="#1C0C06" strokeWidth="3.5" strokeLinecap="round" />
        <path d="M 155,115 Q 167,110 177,114" fill="none" stroke="#1C0C06" strokeWidth="3.5" strokeLinecap="round" />
        {/* Nose */}
        <path d="M 145,132 L 142,144 L 148,146 L 152,146 L 158,144 L 155,132" fill="none" stroke="#8B5A2B" strokeWidth="1.5" />
        {/* Mouth */}
        <path d="M 136,158 Q 150,162 164,158" fill="none" stroke="#5A2E14" strokeWidth="2" strokeLinecap="round" />
        {/* Beard */}
        <path d="M 120,158 Q 136,178 150,184 Q 164,178 180,158 Q 170,170 150,176 Q 130,170 120,158 Z" fill="#1C0C06" opacity="0.85" />
        <line x1="140" y1="164" x2="138" y2="192" stroke="#1C0C06" strokeWidth="3" opacity="0.7" />
        <line x1="150" y1="167" x2="150" y2="198" stroke="#1C0C06" strokeWidth="3" opacity="0.7" />
        <line x1="160" y1="164" x2="162" y2="192" stroke="#1C0C06" strokeWidth="3" opacity="0.7" />

        {/* Crown — tall imperial headdress */}
        <g className="qsh-crown">
          {/* Crown base band */}
          <rect x="112" y="89" width="76" height="18" rx="3" fill="#EEC050" />
          {/* Main crown board — wide flat top */}
          <rect x="88" y="52" width="124" height="42" rx="3" fill="#EEC050" />
          {/* Crown border */}
          <rect x="88" y="52" width="124" height="6" rx="3" fill="#B8860B" />
          <rect x="88" y="84" width="124" height="6" fill="#B8860B" />
          {/* Crown decorations */}
          <rect x="120" y="60" width="60" height="20" rx="2" fill="#B8860B" />
          <circle cx="150" cy="70" r="9" fill="#CC2218" />
          <circle cx="125" cy="70" r="5" fill="#CC2218" opacity="0.7" />
          <circle cx="175" cy="70" r="5" fill="#CC2218" opacity="0.7" />
          {/* Crown top finial */}
          <rect x="142" y="30" width="16" height="26" rx="4" fill="#EEC050" />
          <circle cx="150" cy="26" r="9" fill="#EEC050" />
          <circle cx="150" cy="26" r="5" fill="#CC2218" />
          {/* Hanging jade pendants */}
          <line x1="96" y1="90" x2="90" y2="115" stroke="#EEC050" strokeWidth="2" />
          <line x1="204" y1="90" x2="210" y2="115" stroke="#EEC050" strokeWidth="2" />
          <circle cx="90" cy="118" r="5" fill="#98D0A0" />
          <circle cx="210" cy="118" r="5" fill="#98D0A0" />
        </g>
      </g>
    </svg>
  );
}

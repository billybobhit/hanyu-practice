export default function SunWukong({ style }: { style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 300 400" xmlns="http://www.w3.org/2000/svg" style={style} aria-label="Sun Wukong">
      <style>{`
        .swk-root { transform-box: fill-box; transform-origin: center; animation: swk-enter 0.65s cubic-bezier(0.34,1.56,0.64,1) both; }
        @keyframes swk-enter { from { transform: scale(0) rotate(-6deg); opacity: 0; } to { transform: scale(1) rotate(0deg); opacity: 1; } }
        .swk-cape { transform-box: fill-box; transform-origin: top center; animation: swk-cape 3.5s ease-in-out infinite; }
        @keyframes swk-cape { 0%,100% { transform: skewX(0deg); } 50% { transform: skewX(3deg); } }
        .swk-staff { transform-box: fill-box; transform-origin: center; animation: swk-staff 4s ease-in-out infinite; }
        @keyframes swk-staff { 0%,100% { transform: rotate(0deg); } 50% { transform: rotate(2deg); } }
        .swk-halo { animation: swk-halo 2s ease-in-out infinite; }
        @keyframes swk-halo { 0%,100% { opacity: 0.15; } 50% { opacity: 0.35; } }
        .swk-p1 { animation: swk-float 2.4s 0.0s ease-in infinite; }
        .swk-p2 { animation: swk-float 2.0s 0.6s ease-in infinite; }
        .swk-p3 { animation: swk-float 2.7s 1.1s ease-in infinite; }
        .swk-p4 { animation: swk-float 1.9s 1.7s ease-in infinite; }
        .swk-p5 { animation: swk-float 2.3s 0.3s ease-in infinite; }
        .swk-p6 { animation: swk-float 2.1s 0.9s ease-in infinite; }
        @keyframes swk-float { 0% { transform: translateY(0) scale(1); opacity: 1; } 100% { transform: translateY(-72px) scale(0); opacity: 0; } }
      `}</style>

      <g className="swk-root">
        {/* Golden halo */}
        <ellipse className="swk-halo" cx="150" cy="200" rx="92" ry="115" fill="#EEC050" />

        {/* Cape — behind body */}
        <g className="swk-cape">
          <path d="M 128,118 C 82,152 68,285 64,358 L 116,324 L 136,198 Z" fill="#CC2218" />
          <path d="M 172,118 C 218,152 232,285 236,358 L 184,324 L 164,198 Z" fill="#8B1510" />
        </g>

        {/* Tail */}
        <path d="M 163,240 Q 212,254 222,208 Q 230,162 207,154" stroke="#1C0C06" strokeWidth="16" fill="none" strokeLinecap="round" />
        <path d="M 163,240 Q 212,254 222,208 Q 230,162 207,154" stroke="#3D2010" strokeWidth="8" fill="none" strokeLinecap="round" />

        {/* Legs */}
        <path d="M 124,236 L 110,358 L 148,358 L 150,236 Z" fill="#4A2008" />
        <path d="M 176,236 L 190,358 L 152,358 L 150,236 Z" fill="#4A2008" />
        {/* Boots */}
        <rect x="102" y="340" width="50" height="26" rx="11" fill="#1C0C06" />
        <rect x="148" y="340" width="50" height="26" rx="11" fill="#1C0C06" />

        {/* Staff (Ruyi Jingu Bang) */}
        <g className="swk-staff">
          <line x1="206" y1="18" x2="78" y2="358" stroke="#7A5510" strokeWidth="11" strokeLinecap="round" />
          {/* Top cap */}
          <circle cx="206" cy="18" r="15" fill="#EEC050" />
          <circle cx="206" cy="18" r="8" fill="#CC2218" />
          {/* Bottom cap */}
          <circle cx="78" cy="358" r="15" fill="#EEC050" />
          <circle cx="78" cy="358" r="8" fill="#CC2218" />
          {/* Gold bands */}
          <circle cx="185" cy="75" r="8" fill="#EEC050" />
          <circle cx="155" cy="152" r="8" fill="#EEC050" />
          <circle cx="124" cy="232" r="8" fill="#EEC050" />
          <circle cx="98" cy="300" r="8" fill="#EEC050" />
        </g>

        {/* Torso — gold armor */}
        <path d="M 108,120 L 100,236 L 200,236 L 192,120 Q 170,108 150,106 Q 130,108 108,120 Z" fill="#EEC050" />
        {/* Dark chest plate */}
        <path d="M 126,132 L 120,222 L 180,222 L 174,132 Q 162,124 150,122 Q 138,124 126,132 Z" fill="#B8860B" />
        {/* Belly medallion */}
        <circle cx="150" cy="182" r="19" fill="#EEC050" />
        <circle cx="150" cy="182" r="12" fill="#CC2218" />
        <circle cx="150" cy="182" r="6" fill="#EEC050" />
        {/* Shoulders */}
        <circle cx="102" cy="124" r="23" fill="#EEC050" />
        <circle cx="198" cy="124" r="23" fill="#EEC050" />
        <circle cx="102" cy="124" r="14" fill="#B8860B" />
        <circle cx="198" cy="124" r="14" fill="#B8860B" />

        {/* Left arm — raised, near staff */}
        <path d="M 96,115 L 68,64 L 86,54 L 113,110" fill="#4A2008" />
        <circle cx="73" cy="54" r="14" fill="#7A3A14" />
        {/* Right arm — extended */}
        <path d="M 204,118 L 234,182 L 222,196 L 196,132" fill="#4A2008" />
        <circle cx="228" cy="196" r="14" fill="#7A3A14" />

        {/* Head — skull */}
        <circle cx="150" cy="74" r="48" fill="#1C0C06" />
        {/* Face */}
        <circle cx="150" cy="78" r="36" fill="#9B4B1A" />
        {/* Ears */}
        <circle cx="101" cy="60" r="20" fill="#1C0C06" />
        <circle cx="199" cy="60" r="20" fill="#1C0C06" />
        <circle cx="101" cy="60" r="12" fill="#C4724A" />
        <circle cx="199" cy="60" r="12" fill="#C4724A" />
        {/* Snout */}
        <ellipse cx="150" cy="95" rx="20" ry="13" fill="#C4724A" />
        <circle cx="142" cy="95" r="4" fill="#3D1A0C" />
        <circle cx="158" cy="95" r="4" fill="#3D1A0C" />
        {/* Eyes */}
        <ellipse cx="132" cy="70" rx="11" ry="10" fill="white" />
        <ellipse cx="168" cy="70" rx="11" ry="10" fill="white" />
        <circle cx="133" cy="71" r="7" fill="#1a1a1a" />
        <circle cx="169" cy="71" r="7" fill="#1a1a1a" />
        <circle cx="136" cy="68" r="3" fill="white" />
        <circle cx="172" cy="68" r="3" fill="white" />
        {/* Eyebrows — expressive */}
        <path d="M 120,58 Q 131,51 143,58" fill="none" stroke="#1C0C06" strokeWidth="4" strokeLinecap="round" />
        <path d="M 157,58 Q 169,51 180,58" fill="none" stroke="#1C0C06" strokeWidth="4" strokeLinecap="round" />
        {/* Headband */}
        <path d="M 101,56 Q 150,40 199,56 L 199,70 Q 150,62 101,70 Z" fill="#EEC050" />
        <circle cx="150" cy="62" r="8" fill="#CC2218" />
        <circle cx="150" cy="62" r="4" fill="#FF7050" />

        {/* Floating gold particles */}
        <circle className="swk-p1" cx="78" cy="148" r="5" fill="#EEC050" />
        <circle className="swk-p2" cx="220" cy="172" r="4" fill="#FFD060" />
        <circle className="swk-p3" cx="62" cy="232" r="6" fill="#EEC050" />
        <circle className="swk-p4" cx="235" cy="128" r="4" fill="#FFE080" />
        <circle className="swk-p5" cx="100" cy="318" r="5" fill="#EEC050" />
        <circle className="swk-p6" cx="196" cy="274" r="4" fill="#FFD060" />
      </g>
    </svg>
  );
}

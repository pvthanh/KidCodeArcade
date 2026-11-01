const gradients = `
  <linearGradient id="hero-gold" x1="0" y1="0" x2="1" y2="1">
    <stop stop-color="#fff28a"/><stop offset=".55" stop-color="#ffc83e"/><stop offset="1" stop-color="#ed8a24"/>
  </linearGradient>
  <linearGradient id="hero-coat" x1="0" y1="0" x2="0" y2="1">
    <stop stop-color="#47c8bb"/><stop offset="1" stop-color="#168a83"/>
  </linearGradient>
  <linearGradient id="bug-shell" x1="0" y1="0" x2="1" y2="1">
    <stop stop-color="#74e3da"/><stop offset=".6" stop-color="#32b7b7"/><stop offset="1" stop-color="#21829e"/>
  </linearGradient>
  <linearGradient id="bug-wing" x1="0" y1="0" x2="0" y2="1">
    <stop stop-color="#ffbd56"/><stop offset="1" stop-color="#f07838"/>
  </linearGradient>
  <linearGradient id="turtle-shell" x1="0" y1="0" x2="1" y2="1">
    <stop stop-color="#a8e55d"/><stop offset=".55" stop-color="#54b94b"/><stop offset="1" stop-color="#288454"/>
  </linearGradient>
  <linearGradient id="turtle-belly" x1="0" y1="0" x2="0" y2="1">
    <stop stop-color="#fff0a1"/><stop offset="1" stop-color="#eebc59"/>
  </linearGradient>
  <linearGradient id="bat-wing" x1="0" y1="0" x2="1" y2="1">
    <stop stop-color="#a68be9"/><stop offset=".6" stop-color="#7657bd"/><stop offset="1" stop-color="#4c3988"/>
  </linearGradient>
  <linearGradient id="boss-slime" x1="0" y1="0" x2="0" y2="1">
    <stop stop-color="#ff92d2"/><stop offset=".55" stop-color="#ce58ab"/><stop offset="1" stop-color="#883d9a"/>
  </linearGradient>
  <linearGradient id="boss-metal" x1="0" y1="0" x2="1" y2="1">
    <stop stop-color="#98eaff"/><stop offset=".5" stop-color="#4d9fca"/><stop offset="1" stop-color="#38678f"/>
  </linearGradient>
  <linearGradient id="boss-dragon" x1="0" y1="0" x2="0" y2="1">
    <stop stop-color="#a2ee79"/><stop offset=".6" stop-color="#5ab96c"/><stop offset="1" stop-color="#348568"/>
  </linearGradient>
`;

const shell = (content, frameCount = 1, outputFrameSize = 32) => {
  const width = frameCount * outputFrameSize;
  return `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${outputFrameSize}" viewBox="0 0 ${frameCount * 128} 128"><defs>${gradients}</defs>${content}</svg>`
  )}`;
};

const sheet = frames => shell(frames.map((frame, index) =>
  `<g transform="translate(${index * 128} 0)">${frame}</g>`
).join(''), frames.length);

const hero = (pose = 0, jump = false) => {
  const stride = [-5, 0, 5, 0][pose % 4];
  const bounce = jump ? -5 : [0, -2, 0, -1][pose % 4];
  const armTilt = [-8, 5, 8, -5][pose % 4];
  return `
    <ellipse cx="64" cy="116" rx="33" ry="7" fill="#355b4b" opacity=".16"/>
    <g transform="translate(0 ${bounce})">
      <g transform="translate(${stride} 0)">
        <path d="M51 92c-2 10-4 14-9 19l10 5 13-14-2-9z" fill="#d8792b" stroke="#67432e" stroke-width="4" stroke-linejoin="round"/>
        <path d="M76 91c3 10 5 14 10 18l-9 7-14-13 3-10z" fill="#e88a31" stroke="#67432e" stroke-width="4" stroke-linejoin="round"/>
        <path d="M40 109c-6 2-9 5-8 9 1 4 9 5 22 2l2-6-10-6zM78 109c8 0 12 3 12 7-1 5-10 6-22 3l-2-6 9-5z" fill="#e97250" stroke="#67432e" stroke-width="4" stroke-linejoin="round"/>
        <path d="M37 114h14M75 115h13" stroke="#ffd277" stroke-width="3" stroke-linecap="round"/>
      </g>
      <path d="M42 70c-11 0-17 8-18 17 7 8 16 11 26 9l8-16z" fill="#35a99d" stroke="#62402d" stroke-width="4" stroke-linejoin="round" transform="rotate(${armTilt} 49 81)"/>
      <path d="M86 70c11 0 17 8 18 17-7 8-16 11-26 9l-8-16z" fill="#41c5b4" stroke="#62402d" stroke-width="4" stroke-linejoin="round" transform="rotate(${-armTilt} 79 81)"/>
      <path d="M64 46c24 0 36 16 34 39-2 20-15 28-34 28S32 105 30 85c-2-23 10-39 34-39z" fill="url(#hero-coat)" stroke="#62402d" stroke-width="5"/>
      <path d="M44 76c7-8 33-8 40 0v28c-10 8-30 8-40 0z" fill="#f3d37b" stroke="#62402d" stroke-width="4"/>
      <path d="M53 86h22M52 95h24" stroke="#d3a750" stroke-width="3" stroke-linecap="round"/>
      <circle cx="64" cy="93" r="5" fill="#f3a927" stroke="#62402d" stroke-width="3"/>
      <path d="M31 36c1-17 16-28 33-28s32 11 33 28c2 25-11 43-33 43S29 61 31 36z" fill="url(#hero-gold)" stroke="#62402d" stroke-width="5"/>
      <path d="M39 54c5-9 15-12 25-11 11 1 20 7 24 16-3 12-13 18-25 18S42 69 39 54z" fill="#fff3c9"/>
      <ellipse cx="51" cy="45" rx="8" ry="11" fill="#fff" stroke="#62402d" stroke-width="3"/>
      <ellipse cx="76" cy="45" rx="8" ry="11" fill="#fff" stroke="#62402d" stroke-width="3"/>
      <ellipse cx="53" cy="47" rx="3.5" ry="5.5" fill="#263e4d"/>
      <ellipse cx="74" cy="47" rx="3.5" ry="5.5" fill="#263e4d"/>
      <circle cx="54" cy="45" r="1.7" fill="#fff"/>
      <circle cx="75" cy="45" r="1.7" fill="#fff"/>
      <ellipse cx="40" cy="60" rx="6" ry="3.5" fill="#f18477" opacity=".85"/>
      <ellipse cx="88" cy="60" rx="6" ry="3.5" fill="#f18477" opacity=".85"/>
      <path d="M57 60q7-4 14 0l-7 9z" fill="#ec8630" stroke="#62402d" stroke-width="3" stroke-linejoin="round"/>
      <path d="M43 25c-8-5-7-15-1-18 5-2 12 3 15 11-3-10 3-17 9-16 7 1 9 9 4 18 7-9 16-9 20-3 4 7-1 15-11 18z" fill="#58b957" stroke="#62402d" stroke-width="4" stroke-linejoin="round"/>
      <path d="M47 22c1-6 3-9 7-11M69 22c4-5 8-7 13-7" fill="none" stroke="#a9df6c" stroke-width="4" stroke-linecap="round"/>
      <path d="M38 31q9-8 17-5M75 26q9-4 16 3" fill="none" stroke="#fff1a7" stroke-width="3" opacity=".9"/>
    </g>
  `;
};

const bug = (pose = 0) => {
  const bounce = [0, -2, 0, -1][pose % 4];
  const feet = [-4, 3, 4, -3][pose % 4];
  return `
    <ellipse cx="64" cy="115" rx="35" ry="7" fill="#355b4b" opacity=".16"/>
    <g transform="translate(0 ${bounce})">
      <path d="M47 83q-15-20-26-8-8 10-3 26l18 3m45-21q15-20 26-8 8 10 3 26l-18 3" fill="#ffb05b" stroke="#59403b" stroke-width="5" stroke-linejoin="round"/>
      <path d="M48 82q-12-10-20 0m52 0q12-10 20 0" fill="none" stroke="#ffe19a" stroke-width="4" stroke-linecap="round"/>
      <path d="M48 103h-9l-6 8 2 6 18-2 5-8m19-4h9l6 8-2 6-18-2-5-8" fill="#e97843" stroke="#59403b" stroke-width="4" stroke-linejoin="round" transform="translate(${feet} 0)"/>
      <path d="M47 68c-1-18 8-32 17-32s18 14 17 32c-1 24-9 39-17 39S48 92 47 68z" fill="url(#bug-shell)" stroke="#59403b" stroke-width="5"/>
      <path d="M52 75q12 11 24 0v22q-12 11-24 0z" fill="url(#bug-wing)" stroke="#59403b" stroke-width="4"/>
      <path d="M57 80v14m14-14v14" stroke="#ffe5a0" stroke-width="3" stroke-linecap="round"/>
      <path d="M51 46q-10-16-2-22m28 22q10-16 2-22" fill="none" stroke="#59403b" stroke-width="5" stroke-linecap="round"/>
      <circle cx="49" cy="22" r="5" fill="#ffcf59" stroke="#59403b" stroke-width="3"/>
      <circle cx="79" cy="22" r="5" fill="#ffcf59" stroke="#59403b" stroke-width="3"/>
      <ellipse cx="55" cy="57" rx="8" ry="10" fill="#fff" stroke="#59403b" stroke-width="3"/>
      <ellipse cx="73" cy="57" rx="8" ry="10" fill="#fff" stroke="#59403b" stroke-width="3"/>
      <ellipse cx="57" cy="59" rx="3" ry="5" fill="#263e4d"/>
      <ellipse cx="71" cy="59" rx="3" ry="5" fill="#263e4d"/>
      <circle cx="58" cy="57" r="1.5" fill="#fff"/>
      <circle cx="72" cy="57" r="1.5" fill="#fff"/>
      <path d="M57 72q7 6 14 0" fill="none" stroke="#70413c" stroke-width="3" stroke-linecap="round"/>
      <circle cx="43" cy="67" r="4" fill="#ff8d8a"/>
      <circle cx="85" cy="67" r="4" fill="#ff8d8a"/>
      <path d="M57 35q7-7 14 0" fill="none" stroke="#a2f2e7" stroke-width="4" stroke-linecap="round"/>
    </g>
  `;
};

const koopa = (pose = 0) => {
  const step = [-4, 2, 4, -2][pose % 4];
  return `
    <ellipse cx="64" cy="124" rx="35" ry="3" fill="#355b4b" opacity=".16"/>
    <g transform="translate(0 16)">
      <path d="M43 87h-9l-7 13 3 8 22-2 7-11m30-8h9l7 13-3 8-22-2-7-11" fill="#f2bc62" stroke="#59443b" stroke-width="5" stroke-linejoin="round" transform="translate(${step} 0)"/>
      <path d="M40 94h13m33 0h13" stroke="#fff0a1" stroke-width="4" stroke-linecap="round" transform="translate(${step} 0)"/>
      <path d="M32 63c0-22 14-36 32-36s32 14 32 36c0 25-14 40-32 40S32 88 32 63z" fill="url(#turtle-shell)" stroke="#4b4838" stroke-width="6"/>
      <path d="M44 60q20-24 40 0v22q-20 24-40 0z" fill="#f4d57d" stroke="#4b4838" stroke-width="5"/>
      <path d="M48 69h32m-32 9h32m-24-17v36m16-36v36" fill="none" stroke="#d0a956" stroke-width="3" opacity=".9"/>
      <path d="M51 82q13 8 26 0" fill="none" stroke="#fff1b1" stroke-width="4" stroke-linecap="round"/>
      <path d="M53 38q-8-11-3-20 13 1 15 15 3-14 15-15 6 10-3 20" fill="#70c84f" stroke="#4b4838" stroke-width="5" stroke-linejoin="round"/>
      <path d="M45 51c1-19 9-29 19-29s18 10 19 29c1 18-8 28-19 28S44 69 45 51z" fill="url(#turtle-belly)" stroke="#4b4838" stroke-width="5"/>
      <ellipse cx="56" cy="49" rx="7" ry="9" fill="#fff" stroke="#4b4838" stroke-width="3"/>
      <ellipse cx="72" cy="49" rx="7" ry="9" fill="#fff" stroke="#4b4838" stroke-width="3"/>
      <ellipse cx="57" cy="51" rx="3" ry="4" fill="#263e4d"/>
      <ellipse cx="71" cy="51" rx="3" ry="4" fill="#263e4d"/>
      <path d="M56 64q8 6 16 0" fill="none" stroke="#754c3a" stroke-width="3" stroke-linecap="round"/>
      <circle cx="43" cy="61" r="4" fill="#f48c83"/>
      <circle cx="85" cy="61" r="4" fill="#f48c83"/>
      <path d="M43 91h11m20 0h11" stroke="#fff1b1" stroke-width="4" stroke-linecap="round"/>
    </g>
  `;
};

const bat = (pose = 0) => {
  const wing = [0, 1, 2, 1][pose % 4];
  const wingPath = wing === 0
    ? 'M61 60Q36 18 9 24q9 24 0 41 18-4 30 18 8-18 22-12m6-11q25-42 52-36-9 24 0 41-18-4-30 18-8-18-22-12'
    : wing === 2
      ? 'M61 62Q38 50 12 62q13 12 2 28 21-4 29 10 7-17 20-16m4-22q23-12 49 0-13 12-2 28-21-4-29 10-7-17-20-16'
      : 'M61 60Q37 35 9 38q11 17 0 34 18-4 30 17 8-18 22-12m6-17q24-25 52-22-11 17 0 34-18-4-30 17-8-18-22-12';
  return `
    <ellipse cx="64" cy="113" rx="30" ry="7" fill="#355b4b" opacity=".16"/>
    <path d="${wingPath}" fill="url(#bat-wing)" stroke="#44366e" stroke-width="6" stroke-linejoin="round"/>
    <path d="M19 54q17 8 28 21m62-21Q92 62 81 75" fill="none" stroke="#d3c4ff" stroke-width="4" stroke-linecap="round" opacity=".8"/>
    <path d="M49 57 39 24q18 5 25 22 7-17 25-22L78 57c13 10 16 27 9 42-5 11-14 17-23 17s-18-6-23-17c-7-15-4-32 8-42z" fill="#7862b8" stroke="#44366e" stroke-width="6" stroke-linejoin="round"/>
    <path d="M48 51 39 24q18 5 25 22m16 5 9-27q-18 5-25 22" fill="#a690e1" stroke="#44366e" stroke-width="5" stroke-linejoin="round"/>
    <ellipse cx="55" cy="72" rx="8" ry="11" fill="#fff" stroke="#44366e" stroke-width="3"/>
    <ellipse cx="73" cy="72" rx="8" ry="11" fill="#fff" stroke="#44366e" stroke-width="3"/>
    <ellipse cx="57" cy="74" rx="3.5" ry="5" fill="#293d56"/>
    <ellipse cx="71" cy="74" rx="3.5" ry="5" fill="#293d56"/>
    <circle cx="58" cy="72" r="1.5" fill="#fff"/>
    <circle cx="72" cy="72" r="1.5" fill="#fff"/>
    <path d="M59 88q5 5 10 0" fill="none" stroke="#f6b6cf" stroke-width="4" stroke-linecap="round"/>
    <path d="M57 94h14l-7 11z" fill="#fff0bd" stroke="#44366e" stroke-width="3" stroke-linejoin="round"/>
    <circle cx="45" cy="84" r="4" fill="#f18ba8"/>
    <circle cx="83" cy="84" r="4" fill="#f18ba8"/>
  `;
};

const boss = type => {
  if (type === 'roboCrab') return `
    <ellipse cx="64" cy="116" rx="43" ry="7" fill="#355b4b" opacity=".16"/>
    <path d="M35 81 15 66 8 74l18 22m67-15 20-15 7 8-18 22" fill="#f29a4f" stroke="#344c69" stroke-width="6" stroke-linejoin="round"/>
    <path d="M40 98 30 112h15l13-14m30 0 10 14H83L70 98" fill="#f29a4f" stroke="#344c69" stroke-width="6" stroke-linejoin="round"/>
    <path d="M22 68 8 52l5-9 18 17m75 8 14-16-5-9-18 17" fill="#66b8dc" stroke="#344c69" stroke-width="5" stroke-linejoin="round"/>
    <path d="M22 70q0-34 42-34t42 34v20q0 26-42 26T22 90z" fill="url(#boss-metal)" stroke="#344c69" stroke-width="7"/>
    <path d="M34 65q3-24 30-24t30 24v13H34z" fill="#b7f5fa" stroke="#344c69" stroke-width="5"/>
    <path d="M36 83h56v17q-28 17-56 0z" fill="#f7cf72" stroke="#344c69" stroke-width="4"/>
    <path d="M44 89h40m-34 8h28" stroke="#d89e4a" stroke-width="4" stroke-linecap="round"/>
    <circle cx="48" cy="65" r="7" fill="#fff" stroke="#344c69" stroke-width="3"/><circle cx="80" cy="65" r="7" fill="#fff" stroke="#344c69" stroke-width="3"/>
    <circle cx="50" cy="66" r="3" fill="#263e4d"/><circle cx="78" cy="66" r="3" fill="#263e4d"/>
    <path d="M54 82h20" stroke="#344c69" stroke-width="4" stroke-linecap="round"/>
    <path d="M28 34 16 20l5-8 22 14m57 8 12-14-5-8-22 14" fill="#72cae8" stroke="#344c69" stroke-width="5" stroke-linejoin="round"/>
    <circle cx="64" cy="32" r="8" fill="#ffd66b" stroke="#344c69" stroke-width="4"/>
  `;
  if (type === 'skyDragon') return `
    <ellipse cx="64" cy="116" rx="39" ry="7" fill="#355b4b" opacity=".16"/>
    <path d="M41 54 14 20q4 34 24 57M87 54l27-34q-4 34-24 57" fill="#ffb86a" stroke="#42523d" stroke-width="6" stroke-linejoin="round"/>
    <path d="M42 54 19 30q8 25 21 38m46-14 23-24q-8 25-21 38" fill="#ffe49a" opacity=".8"/>
    <path d="M40 84 19 73l-9 8 24 20m54-17 21-11 9 8-24 20" fill="url(#boss-dragon)" stroke="#42523d" stroke-width="6" stroke-linejoin="round"/>
    <path d="M32 86q-2-28 32-34 34 6 32 34-2 29-32 31-31-2-32-31z" fill="url(#boss-dragon)" stroke="#42523d" stroke-width="7"/>
    <path d="M42 87q22 9 44 0v24q-22 13-44 0z" fill="#f5d477" stroke="#42523d" stroke-width="4"/>
    <path d="m47 103 7 8 7-8m6 0 7 8 7-8" fill="none" stroke="#e8aa58" stroke-width="3"/>
    <path d="M40 62 30 35q19 1 32 17m26 10 10-27q-19 1-32 17" fill="#65c878" stroke="#42523d" stroke-width="5" stroke-linejoin="round"/>
    <path d="M52 76q12-10 24 0" fill="none" stroke="#42523d" stroke-width="5" stroke-linecap="round"/>
    <ellipse cx="51" cy="76" rx="8" ry="10" fill="#fff" stroke="#42523d" stroke-width="3"/><ellipse cx="77" cy="76" rx="8" ry="10" fill="#fff" stroke="#42523d" stroke-width="3"/>
    <ellipse cx="53" cy="78" rx="3" ry="5" fill="#293d56"/><ellipse cx="75" cy="78" rx="3" ry="5" fill="#293d56"/>
    <path d="M57 92q7 5 14 0" fill="none" stroke="#7d4a3c" stroke-width="4" stroke-linecap="round"/>
    <path d="m56 33 8-15 8 15" fill="#ffda77" stroke="#42523d" stroke-width="4" stroke-linejoin="round"/>
    <circle cx="64" cy="23" r="5" fill="#fff6c2"/>
  `;
  return `
    <ellipse cx="64" cy="116" rx="39" ry="7" fill="#355b4b" opacity=".16"/>
    <path d="M43 94 32 111h17l13-15m24-2 11 17H80L67 96" fill="#a64d9b" stroke="#593958" stroke-width="6" stroke-linejoin="round"/>
    <path d="M23 67 11 41l22 10m72 16 12-26-22 10" fill="#d66aba" stroke="#593958" stroke-width="6" stroke-linejoin="round"/>
    <path d="M26 70q-1-34 38-42 39 8 38 42-2 42-38 42T26 70z" fill="url(#boss-slime)" stroke="#593958" stroke-width="7"/>
    <path d="M37 82q27 13 54 0v27q-27 16-54 0z" fill="#ffe18b" stroke="#593958" stroke-width="4"/>
    <path d="M44 94h40m-34 8h28" stroke="#d8ad5a" stroke-width="3" stroke-linecap="round"/>
    <path d="M32 43 40 9l18 30L64 3l12 36L96 9l3 36z" fill="#ffd45c" stroke="#593958" stroke-width="5" stroke-linejoin="round"/>
    <path d="M42 37 46 20l11 18m13 0 6-18 10 17" fill="none" stroke="#fff0a5" stroke-width="4" stroke-linecap="round"/>
    <ellipse cx="49" cy="66" rx="9" ry="12" fill="#fff" stroke="#593958" stroke-width="4"/><ellipse cx="79" cy="66" rx="9" ry="12" fill="#fff" stroke="#593958" stroke-width="4"/>
    <ellipse cx="52" cy="68" rx="4" ry="6" fill="#293d56"/><ellipse cx="76" cy="68" rx="4" ry="6" fill="#293d56"/>
    <circle cx="53" cy="65" r="2" fill="#fff"/><circle cx="77" cy="65" r="2" fill="#fff"/>
    <path d="M53 83q11 8 22 0" fill="none" stroke="#593958" stroke-width="4" stroke-linecap="round"/>
    <circle cx="36" cy="81" r="5" fill="#ff91a3"/><circle cx="92" cy="81" r="5" fill="#ff91a3"/>
  `;
};

const idleFrames = render => [0, 1, 2, 3].map(pose => render(pose));

const coin = () => `
  <ellipse cx="64" cy="117" rx="34" ry="6" fill="#355b4b" opacity=".14"/>
  <circle cx="64" cy="62" r="48" fill="#9a5926"/>
  <circle cx="64" cy="58" r="46" fill="#f3a927" stroke="#70452b" stroke-width="5"/>
  <circle cx="64" cy="58" r="37" fill="url(#hero-gold)" stroke="#ffe98b" stroke-width="4"/>
  <circle cx="64" cy="58" r="29" fill="#f5b937" stroke="#d9872d" stroke-width="3"/>
  <path d="M64 34 71 50l17 2-13 11 4 17-15-9-15 9 4-17-13-11 17-2z"
    fill="#fff1a1" stroke="#b9762b" stroke-width="3" stroke-linejoin="round"/>
  <path d="m60 48 4-9 4 9m-4-9v38m-9-10q9 7 18 0"
    fill="none" stroke="#fff9cf" stroke-width="3" stroke-linecap="round"/>
  <path d="M34 39q6-12 17-16" fill="none" stroke="#fff8c6" stroke-width="5" stroke-linecap="round"/>
  <circle cx="91" cy="86" r="4" fill="#fff2a1"/>
`;

const mysteryBox = () => `
  <rect x="14" y="12" width="100" height="104" rx="13" fill="#72482f"/>
  <rect x="10" y="8" width="100" height="104" rx="13" fill="#e39328" stroke="#71482f" stroke-width="6"/>
  <rect x="18" y="16" width="84" height="88" rx="9" fill="#ffd95f" stroke="#fff0a0" stroke-width="5"/>
  <path d="M22 22h76v14H22z" fill="#fff1a2" opacity=".75"/>
  <path d="M22 90h76v9H22z" fill="#e99930" opacity=".7"/>
  <path d="M23 18h10v10H23zm65 0h10v10H88zm-65 68h10v10H23zm65 0h10v10H88z"
    fill="#fff0a0" stroke="#a8682f" stroke-width="3"/>
  <path d="M49 42q2-13 16-13 14 0 15 13 1 9-9 15-6 4-7 11"
    fill="none" stroke="#a65c29" stroke-width="10" stroke-linecap="round"/>
  <path d="M49 40q2-13 16-13 14 0 15 13 1 9-9 15-6 4-7 11"
    fill="none" stroke="#fff8ce" stroke-width="6" stroke-linecap="round"/>
  <circle cx="64" cy="82" r="6" fill="#fff8ce" stroke="#a65c29" stroke-width="3"/>
  <path d="M18 45h-5m96 0h-5M18 72h-5m96 0h-5" stroke="#fff0a0" stroke-width="4" stroke-linecap="round"/>
`;

export const characterArt = {
  coin: shell(coin(), 1, 128),
  mysteryBox: shell(mysteryBox(), 1, 128),
  player: shell(hero()),
  playerIdle: sheet(idleFrames(hero)),
  playerWalk: sheet(idleFrames(hero)),
  playerRun: sheet([0, 1, 2, 3].map(pose => hero(pose))),
  playerJump: sheet([0, 1, 2, 3].map(pose => hero(pose, true))),
  goomba: shell(bug()),
  goombaIdle: sheet(idleFrames(bug)),
  goombaWalk: sheet(idleFrames(bug)),
  koopa: shell(koopa()),
  koopaIdle: sheet(idleFrames(koopa)),
  koopaWalk: sheet(idleFrames(koopa)),
  bat: shell(bat()),
  batIdle: sheet(idleFrames(bat)),
  batWalk: sheet(idleFrames(bat)),
  bosses: {
    slimeKing: shell(boss('slimeKing'), 1, 48),
    roboCrab: shell(boss('roboCrab'), 1, 48),
    skyDragon: shell(boss('skyDragon'), 1, 48)
  }
};

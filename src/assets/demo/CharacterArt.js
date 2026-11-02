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

const sheet = (frames, outputFrameSize = 32) => shell(frames.map((frame, index) =>
  `<g transform="translate(${index * 128} 0)">${frame}</g>`
).join(''), frames.length, outputFrameSize);
const characterSheet = frames => sheet(frames, 256);

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

const additionalBossLooks = {
  candyGolem: {
    body: '#f287b7', light: '#ffe6ad', outline: '#74446e', accent: '#72c9bf',
    silhouette: `<path d="M37 46 27 22l22 10 15-24 15 24 22-10-10 24z" fill="#ffe18b" stroke="#74446e" stroke-width="5" stroke-linejoin="round"/>`,
    gear: `<circle cx="45" cy="49" r="8" fill="#f3a550" stroke="#74446e" stroke-width="4"/><circle cx="82" cy="49" r="8" fill="#73c9bf" stroke="#74446e" stroke-width="4"/><path d="M43 97q21 13 42 0v12q-21 13-42 0z" fill="#fff1d2" stroke="#74446e" stroke-width="4"/>`,
    shape: 'round'
  },
  moonBunny: {
    body: '#9e8be0', light: '#e5dcff', outline: '#51467d', accent: '#f4c968',
    silhouette: `<path d="M47 42Q28 11 39 5q18 5 25 32Q70 10 88 5q11 6-8 37z" fill="#d8caff" stroke="#51467d" stroke-width="5" stroke-linejoin="round"/><path d="M45 25q9 7 15 18m14-18q-8 8-13 18" fill="none" stroke="#f3a6c1" stroke-width="5"/>`,
    gear: `<path d="M28 75 13 94l15 5m82-24 15 19-15 5" fill="none" stroke="#51467d" stroke-width="8" stroke-linecap="round"/><path d="M56 93q8 12 16 0" fill="none" stroke="#51467d" stroke-width="4"/>`,
    shape: 'round'
  },
  coralKraken: {
    body: '#58b9c9', light: '#b7eee0', outline: '#315f7b', accent: '#fb9b78',
    silhouette: `<path d="M37 48 27 20l22 19 15-30 15 30 22-19-10 28z" fill="#fb9b78" stroke="#315f7b" stroke-width="5" stroke-linejoin="round"/><path d="M43 96q-15 11-2 20 8 4 14-7m8-11q-9 20 4 21 9 0 10-19m8-4q15 11 2 20-8 4-14-7" fill="#55b5c5" stroke="#315f7b" stroke-width="5" stroke-linecap="round"/>`,
    gear: `<circle cx="47" cy="52" r="6" fill="#fff0ca"/><circle cx="82" cy="52" r="6" fill="#fff0ca"/><path d="M56 91q8 8 16 0" fill="none" stroke="#315f7b" stroke-width="4"/>`,
    shape: 'round'
  },
  cloudYeti: {
    body: '#91d9ef', light: '#f5ffff', outline: '#547995', accent: '#f5b5c4',
    silhouette: `<path d="M34 47q-8-17 7-22 0-19 19-14 8-19 22-5 20-8 19 16 15 7 2 25z" fill="#f7ffff" stroke="#547995" stroke-width="5"/><path d="M35 83 14 95l13 9 18-10m48-11 21 12-13 9-18-10" fill="#91d9ef" stroke="#547995" stroke-width="6" stroke-linejoin="round"/>`,
    gear: `<path d="M45 98h17l-2 12H43zm22 0h17l2 12H69z" fill="#eaaec3" stroke="#547995" stroke-width="4"/>`,
    shape: 'round'
  },
  clockworkOwl: {
    body: '#bd8a58', light: '#f7d891', outline: '#614b42', accent: '#66c4bd',
    silhouette: `<path d="M28 49 17 18l31 19m52 12 11-31-31 19" fill="#8b664f" stroke="#614b42" stroke-width="6" stroke-linejoin="round"/><path d="M45 21 38 9m45 12 7-12" stroke="#f3d16f" stroke-width="5" stroke-linecap="round"/>`,
    gear: `<circle cx="64" cy="95" r="13" fill="#f0c45f" stroke="#614b42" stroke-width="4"/><circle cx="64" cy="95" r="5" fill="#66c4bd"/><path d="M64 82v26m-13-13h26m-22-9 18 18m0-18-18 18" stroke="#fff1bd" stroke-width="3"/>`,
    shape: 'round'
  },
  volcanoTurtle: {
    body: '#59ae72', light: '#f4d184', outline: '#435a48', accent: '#ef815f',
    silhouette: `<path d="M26 70q2-35 38-42 36 7 38 42L88 91H40z" fill="#765e69" stroke="#435a48" stroke-width="6"/><path d="m43 63 13-20 8 14 10-19 13 25m-46 6h44" fill="none" stroke="#f39a65" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/><path d="M56 30q-9-13 0-22m16 22q10-14 0-24" fill="none" stroke="#ffca68" stroke-width="6" stroke-linecap="round"/>`,
    gear: `<path d="M39 98h17l-2 11H39zm34 0h17l2 11H75z" fill="#f4d184" stroke="#435a48" stroke-width="4"/>`,
    shape: 'round'
  },
  rainbowUnicorn: {
    body: '#f7f1ff', light: '#ffd7ed', outline: '#665280', accent: '#7bd3ca',
    silhouette: `<path d="m56 43 9-34 11 35" fill="#ffe27a" stroke="#665280" stroke-width="5" stroke-linejoin="round"/><path d="M39 40q-4-25 16-27l9 23m18 4q4-25-16-27l-9 23" fill="#bc8fe3" stroke="#665280" stroke-width="5"/><path d="M44 21q10-9 20 7m7-7q10-9 20 7" fill="none" stroke="#f28fbb" stroke-width="5"/>`,
    gear: `<path d="M32 79q-16 0-17 15 11 10 24-1m57-14q16 0 17 15-11 10-24-1" fill="none" stroke="#7bd3ca" stroke-width="7" stroke-linecap="round"/><path d="M53 94q11 11 22 0" fill="none" stroke="#665280" stroke-width="4"/>`,
    shape: 'round'
  }
};

const additionalBoss = (type, look) => {
  const bodyPath = look.shape === 'round'
    ? 'M27 67Q27 38 64 34q37 4 37 33v31q-9 18-37 18-28 0-37-18z'
    : 'M25 67Q26 38 64 34q38 4 39 33v31q-12 17-39 17-27 0-39-17z';
  return `
    <ellipse cx="64" cy="119" rx="39" ry="5" fill="#355b4b" opacity=".18"/>
    ${look.silhouette}
    <path d="M42 105 33 115h17l12-10m21 0 12 10H78l-12-10" fill="${look.accent}" stroke="${look.outline}" stroke-width="5" stroke-linejoin="round"/>
    <path d="${bodyPath}" fill="${look.body}" stroke="${look.outline}" stroke-width="6" stroke-linejoin="round"/>
    <path d="M39 84q25 12 50 0v25q-25 15-50 0z" fill="${look.light}" stroke="${look.outline}" stroke-width="4" stroke-linejoin="round"/>
    <ellipse cx="49" cy="68" rx="9" ry="12" fill="#fff" stroke="${look.outline}" stroke-width="3"/>
    <ellipse cx="79" cy="68" rx="9" ry="12" fill="#fff" stroke="${look.outline}" stroke-width="3"/>
    <ellipse cx="52" cy="70" rx="4" ry="6" fill="#293d56"/>
    <ellipse cx="76" cy="70" rx="4" ry="6" fill="#293d56"/>
    <circle cx="53" cy="67" r="2" fill="#fff"/>
    <circle cx="77" cy="67" r="2" fill="#fff"/>
    <path d="M55 84q9 8 18 0" fill="none" stroke="${look.outline}" stroke-width="4" stroke-linecap="round"/>
    <circle cx="35" cy="83" r="5" fill="${look.accent}"/>
    <circle cx="93" cy="83" r="5" fill="${look.accent}"/>
    ${look.gear}
  `;
};

const creepyLooks = [
  { id: 'Creepy-Firefly', name: 'Firefly', icon: '✨', movement: 'flying', speed: 65, colors: ['#f5c64c', '#fff1a8', '#765a35'], feature: 'glow' },
  { id: 'Creepy-CloudPuff', name: 'Cloud Puff', icon: '☁️', movement: 'flying', speed: 48, colors: ['#a4dff2', '#f7ffff', '#577f96'], feature: 'cloud' },
  { id: 'Creepy-Jellyfish', name: 'Jellyfish', icon: '🪼', movement: 'flying', speed: 50, colors: ['#c480e8', '#f1d5ff', '#704b88'], feature: 'tentacles' },
  { id: 'Creepy-Ladybug', name: 'Ladybug', icon: '🐞', movement: 'ground', speed: 40, colors: ['#eb6661', '#ffd978', '#6e4541'], feature: 'dots' },
  { id: 'Creepy-Hedgehog', name: 'Hedgehog', icon: '🦔', movement: 'ground', speed: 32, colors: ['#ad825b', '#f5d6a1', '#634d42'], feature: 'spikes' },
  { id: 'Creepy-Duckling', name: 'Duckling', icon: '🐥', movement: 'ground', speed: 44, colors: ['#f4cd54', '#fff2a1', '#806339'], feature: 'beak' },
  { id: 'Creepy-FoxKit', name: 'Fox Kit', icon: '🦊', movement: 'ground', speed: 60, colors: ['#ed945c', '#ffe1b3', '#765144'], feature: 'fox' },
  { id: 'Creepy-Bumblebee', name: 'Bumblebee', icon: '🐝', movement: 'flying', speed: 70, colors: ['#f2c64f', '#fff1aa', '#50483d'], feature: 'stripes' },
  { id: 'Creepy-Froglet', name: 'Froglet', icon: '🐸', movement: 'ground', speed: 52, colors: ['#72c978', '#d2f29b', '#46654a'], feature: 'frog' },
  { id: 'Creepy-Starfish', name: 'Starfish', icon: '⭐', movement: 'ground', speed: 28, colors: ['#f49b72', '#ffdc9d', '#87504a'], feature: 'star' },
  { id: 'Creepy-Ghost', name: 'Ghost', icon: '👻', movement: 'flying', speed: 42, colors: ['#b2c8f2', '#f7fbff', '#586887'], feature: 'ghost' },
  { id: 'Creepy-MiniDino', name: 'Mini Dino', icon: '🦕', movement: 'ground', speed: 55, colors: ['#71bd8a', '#d3eb99', '#49654e'], feature: 'dino' }
];

const creepyFeature = (feature, color, outline, pose) => {
  switch (feature) {
    case 'glow':
      return `<circle cx="64" cy="77" r="22" fill="#fff3a1" opacity=".48"/><path d="M64 15v12m-27-1 8 9m46-9-8 9" stroke="#fff0a0" stroke-width="4" stroke-linecap="round"/>`;
    case 'cloud':
      return `<path d="M36 53q-13-19 7-23 3-20 21-12 17-11 25 8 20 0 10 21z" fill="${color}" stroke="${outline}" stroke-width="5"/>`;
    case 'tentacles':
      return `<path d="M45 94q-12 13-4 23m19-23q-6 15 1 24m18-24q12 13 4 23m-37-23q-16 8-13 17m49-17q16 8 13 17" fill="none" stroke="${color}" stroke-width="7" stroke-linecap="round"/>`;
    case 'dots':
      return `<circle cx="43" cy="62" r="6" fill="${outline}"/><circle cx="83" cy="62" r="6" fill="${outline}"/><circle cx="48" cy="86" r="5" fill="${outline}"/><circle cx="78" cy="86" r="5" fill="${outline}"/>`;
    case 'spikes':
      return `<path d="M33 53 24 38l18 7 5-18 13 17 9-20 9 21 17-13-3 23z" fill="${color}" stroke="${outline}" stroke-width="4" stroke-linejoin="round"/>`;
    case 'beak':
      return `<path d="m54 78 21-1-11 13z" fill="#ed9347" stroke="${outline}" stroke-width="3" stroke-linejoin="round"/>`;
    case 'fox':
      return `<path d="m37 51-8-28 27 15m35 13 8-28-27 15" fill="${color}" stroke="${outline}" stroke-width="5" stroke-linejoin="round"/><path d="M57 83q7 8 14 0" fill="none" stroke="${outline}" stroke-width="3"/>`;
    case 'stripes':
      return `<path d="M44 80q20 13 40 0m-41 13q21 12 42 0" fill="none" stroke="${outline}" stroke-width="7"/>`;
    case 'frog':
      return `<circle cx="44" cy="44" r="12" fill="${color}" stroke="${outline}" stroke-width="4"/><circle cx="84" cy="44" r="12" fill="${color}" stroke="${outline}" stroke-width="4"/>`;
    case 'star':
      return `<path d="m64 18 12 25 28 3-20 19 6 28-26-14-26 14 6-28-20-19 28-3z" fill="${color}" stroke="${outline}" stroke-width="4" stroke-linejoin="round"/>`;
    case 'ghost':
      return `<path d="M38 91v17l13-8 13 9 13-9 13 8V77" fill="${color}" stroke="${outline}" stroke-width="4" stroke-linejoin="round"/>`;
    case 'dino':
      return `<path d="M43 49q-8-19 10-24l8 13 9-17 12 20q13 6 8 20H44z" fill="${color}" stroke="${outline}" stroke-width="4" stroke-linejoin="round"/>`;
    default:
      return '';
  }
};

const creepyFrame = (look, pose = 0, moving = false) => {
  const [body, light, outline] = look.colors;
  const bounce = moving ? [0, -3, 0, -2][pose % 4] : [0, -1, 0, -1][pose % 4];
  const frontFeature = ['dots', 'beak', 'stripes'].includes(look.feature);
  return `
    <ellipse cx="64" cy="117" rx="30" ry="5" fill="#355b4b" opacity=".16"/>
    <g transform="translate(0 ${bounce})">
      ${frontFeature ? '' : creepyFeature(look.feature, body, outline, pose)}
      <path d="M42 92q-8 8-5 17l13 2 8-10m21-9q8 8 5 17l-13 2-8-10" fill="${body}" stroke="${outline}" stroke-width="4" stroke-linejoin="round" transform="translate(${moving ? [-4, 2, 4, -2][pose % 4] : 0} 0)"/>
      <path d="M34 72q0-30 30-30t30 30q0 32-30 32T34 72z" fill="${body}" stroke="${outline}" stroke-width="5"/>
      <path d="M43 80q21 9 42 0v17q-21 10-42 0z" fill="${light}" opacity=".94"/>
      ${frontFeature ? creepyFeature(look.feature, body, outline, pose) : ''}
      <ellipse cx="52" cy="67" rx="8" ry="10" fill="#fff" stroke="${outline}" stroke-width="3"/>
      <ellipse cx="76" cy="67" rx="8" ry="10" fill="#fff" stroke="${outline}" stroke-width="3"/>
      <ellipse cx="54" cy="69" rx="3" ry="5" fill="#263e4d"/>
      <ellipse cx="74" cy="69" rx="3" ry="5" fill="#263e4d"/>
      <circle cx="55" cy="66" r="1.5" fill="#fff"/>
      <circle cx="75" cy="66" r="1.5" fill="#fff"/>
      <path d="M58 82q6 5 12 0" fill="none" stroke="${outline}" stroke-width="3" stroke-linecap="round"/>
      <circle cx="43" cy="79" r="4" fill="${light}"/>
      <circle cx="85" cy="79" r="4" fill="${light}"/>
      <path d="M48 105h10m12 0h10" stroke="${light}" stroke-width="4" stroke-linecap="round"/>
    </g>
  `;
};

const makeCreepyArt = () => Object.fromEntries(creepyLooks.map(look => {
  const frames = moving => [0, 1, 2, 3].map(pose => creepyFrame(look, pose, moving));
  return [look.id, {
    sprite: shell(creepyFrame(look), 1, 128),
    idle: characterSheet(frames(false)),
    walk: characterSheet(frames(true))
  }];
}));

export const creepyArt = makeCreepyArt();

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

const playerCharacterLooks = {
  dinoPirate: {
    body: '#67bd4c', light: '#a5dc68', trim: '#74442f', clothes: '#e5c76d',
    head: `<path d="M37 67q-5-35 22-43 35-10 45 21 5 18-3 31-13 12-36 6L46 73z" fill="#67bd4c"/><path d="M72 54q25-7 39 5l-4 17q-17 8-36-2z" fill="#8bd35a"/><path d="m88 72 5 6 5-6" fill="#fff3c9"/>`,
    gear: `<path d="M35 36q-5-16 10-19 18-2 28 8l20-4q8 11-2 17l-39 4z" fill="#293d4e" stroke="#49352d" stroke-width="5"/><path d="M47 29q14-8 26 1" fill="none" stroke="#e9c06a" stroke-width="4"/><path d="M105 75 119 43l5 3-10 35" fill="#b87936" stroke="#563d32" stroke-width="4"/>`,
    tail: `<path d="M39 78Q17 76 13 57q17 7 28 1" fill="#67bd4c" stroke="#49352d" stroke-width="5"/>`,
    face: `<ellipse cx="70" cy="50" rx="4" ry="6" fill="#263e4d"/><path d="M90 55q6 3 10 0" fill="none" stroke="#49352d" stroke-width="3"/><circle cx="65" cy="59" r="3" fill="#f28a85"/><path d="m82 70 4-5 4 5m5 1 4-5 4 5" fill="#fff"/>`
  },
  bubbleRobot: {
    body: '#5aaed0', light: '#a8e8f4', trim: '#3e6680', clothes: '#d8edf0',
    head: `<rect x="34" y="23" width="60" height="58" rx="23" fill="#83d8ed" stroke="#3e6680" stroke-width="6"/><path d="M39 51q25-18 50 0v17q-25 16-50 0z" fill="#31617d"/><path d="M43 51q20-11 42 0v9q-22 8-42 0z" fill="#b6f5f2"/>`,
    gear: `<circle cx="64" cy="31" r="38" fill="none" stroke="#d7f6fa" stroke-width="5"/><circle cx="46" cy="18" r="4" fill="#fff"/><path d="M42 93h44v8H42z" fill="#b8e4ed"/><circle cx="51" cy="100" r="5" fill="#ffd46a"/><circle cx="77" cy="100" r="5" fill="#ffd46a"/>`,
    tail: `<path d="M37 47 23 54v19l12 5m60-31 13 7v19l-13 5" fill="#70c4df" stroke="#3e6680" stroke-width="5"/>`,
    face: `<circle cx="54" cy="57" r="3" fill="#254455"/><circle cx="77" cy="57" r="3" fill="#254455"/><path d="M58 67q7 6 14 0" fill="none" stroke="#d8fbf8" stroke-width="3"/>`
  },
  mushroomExplorer: {
    body: '#f0d4a0', light: '#fff0cf', trim: '#704638', clothes: '#a66b42',
    head: `<path d="M32 46Q34 10 64 10t32 36q-22 13-64 0z" fill="#dc4f56" stroke="#704638" stroke-width="5"/><path d="M39 42q25 12 50 0" fill="none" stroke="#ffecbd" stroke-width="5"/><path d="M40 77q-3-22 24-25 27 3 24 25v8H40z" fill="#f0d4a0" stroke="#704638" stroke-width="5"/>`,
    gear: `<circle cx="47" cy="25" r="7" fill="#fff2d5"/><circle cx="73" cy="20" r="8" fill="#fff2d5"/><circle cx="83" cy="36" r="5" fill="#fff2d5"/><path d="M35 75 24 89l13 17 10-9m35-22 15 11-7 12" fill="#a66b42" stroke="#704638" stroke-width="4"/><circle cx="99" cy="85" r="10" fill="#f2bc4c" stroke="#704638" stroke-width="4"/><path d="M99 77v16m-8-8h16" stroke="#fff1ba" stroke-width="3"/>`,
    tail: `<path d="M43 79 31 88l8 13 10-10m27-12 11 12-5 12-12-9" fill="#f0d4a0" stroke="#704638" stroke-width="5"/>`,
    face: `<ellipse cx="54" cy="66" rx="3" ry="4" fill="#3d322e"/><ellipse cx="74" cy="66" rx="3" ry="4" fill="#3d322e"/><path d="M58 75q6 6 12 0" fill="none" stroke="#a94e50" stroke-width="3"/><circle cx="49" cy="73" r="3" fill="#f28c85"/><circle cx="79" cy="73" r="3" fill="#f28c85"/>`
  },
  cactusCowboy: {
    body: '#56a94f', light: '#9bd468', trim: '#604332', clothes: '#b95048',
    head: `<path d="M47 72V43q0-20 17-20t17 20v29z" fill="#62b958" stroke="#604332" stroke-width="5"/><path d="M49 46h30M53 37h22" stroke="#a6df73" stroke-width="4"/>`,
    gear: `<path d="M30 31q34-18 68 0l-7 8H37z" fill="#a86e3f" stroke="#604332" stroke-width="5"/><path d="M48 22q16-10 32 0v8H48z" fill="#c28951" stroke="#604332" stroke-width="4"/><path d="M37 63q27 13 54 0v11q-27 14-54 0z" fill="#cb4d4d" stroke="#604332" stroke-width="3"/><path d="M100 58q16 4 7 18" fill="none" stroke="#9e7139" stroke-width="4"/>`,
    tail: `<path d="M49 56 34 56v-13m61 13 15 0V43" fill="none" stroke="#56a94f" stroke-width="10" stroke-linecap="round"/><path d="M32 43v11m74-11v11" stroke="#a6df73" stroke-width="3"/>`,
    face: `<circle cx="57" cy="51" r="3" fill="#243d33"/><circle cx="73" cy="51" r="3" fill="#243d33"/><path d="M59 60q6 5 12 0" fill="none" stroke="#604332" stroke-width="3"/>`
  },
  unicornCat: {
    body: '#f7f1f3', light: '#fff', trim: '#65486d', clothes: '#d8a8dc',
    head: `<path d="m37 49-7-31q18 5 30 21 9-12 24 0 12-16 27-21l-5 34q-3 31-34 34-32-2-35-37z" fill="#fff" stroke="#65486d" stroke-width="5"/><path d="m39 31 14 13-12 4zm58 0L83 44l12 4z" fill="#efa6c7"/>`,
    gear: `<path d="m60 26 8-23 8 24" fill="#8de0d4" stroke="#65486d" stroke-width="4"/><path d="m62 18 11 3m-9-9 7 2" stroke="#f08dbd" stroke-width="4"/><path d="M47 77q-12 17-2 26 11 6 16-8" fill="none" stroke="#fff" stroke-width="9"/><path d="M43 89h12" stroke="#ed80b5" stroke-width="4"/>`,
    tail: `<path d="M42 83q-20 8-12 26 10 6 18-7" fill="none" stroke="#fff" stroke-width="9"/><path d="M30 103h12" stroke="#77cfe1" stroke-width="4"/>`,
    face: `<ellipse cx="55" cy="56" rx="4" ry="6" fill="#4a354e"/><ellipse cx="76" cy="56" rx="4" ry="6" fill="#4a354e"/><path d="m61 66 5 4 5-4-5-4z" fill="#e987a8"/><path d="M66 70q-7 9-13 2m13-2q7 9 13 2" fill="none" stroke="#65486d" stroke-width="3"/><circle cx="47" cy="68" r="3" fill="#f4a1b3"/><circle cx="85" cy="68" r="3" fill="#f4a1b3"/>`
  },
  ninjaHamster: {
    body: '#343440', light: '#f1eadc', trim: '#453a3b', clothes: '#292b38',
    head: `<circle cx="48" cy="38" r="13" fill="#c98e61" stroke="#453a3b" stroke-width="5"/><circle cx="80" cy="38" r="13" fill="#c98e61" stroke="#453a3b" stroke-width="5"/><ellipse cx="64" cy="56" rx="31" ry="29" fill="#e5c49e" stroke="#453a3b" stroke-width="5"/><path d="M36 51q28-12 56 0v11q-28 9-56 0z" fill="#ba353d"/>`,
    gear: `<path d="M38 52q24-9 52 0v13q-27 8-52 0z" fill="#32323e"/><path d="M44 58h13m15 0h12" stroke="#fff0d7" stroke-width="3"/><path d="M36 54 19 63l12 5-13 12" fill="none" stroke="#ba353d" stroke-width="5"/><path d="M44 83q20 16 40 0v16q-20 13-40 0z" fill="#292b38" stroke="#453a3b" stroke-width="4"/>`,
    tail: `<circle cx="96" cy="87" r="7" fill="#e5c49e" stroke="#453a3b" stroke-width="4"/>`,
    face: `<ellipse cx="54" cy="59" rx="3" ry="4" fill="#28252b"/><ellipse cx="74" cy="59" rx="3" ry="4" fill="#28252b"/><ellipse cx="64" cy="69" rx="5" ry="4" fill="#a86e68"/><path d="M48 70 38 68m10 5-10 2m42-5 10-2m-10 5 10 2" stroke="#453a3b" stroke-width="2"/>`
  },
  slothRacer: {
    body: '#9b6b48', light: '#d2ad83', trim: '#55433b', clothes: '#b88355',
    head: `<ellipse cx="64" cy="54" rx="33" ry="31" fill="#a97955" stroke="#55433b" stroke-width="5"/><ellipse cx="64" cy="67" rx="22" ry="15" fill="#ead7bd"/><path d="M35 47q10-19 23-10l-8 21zm58 0Q83 28 70 37l8 21z" fill="#55433b"/>`,
    gear: `<path d="M31 40q4-32 34-32 30 0 33 32l-9 8H39z" fill="#d84e4e" stroke="#55433b" stroke-width="5"/><path d="M61 11 67 11 75 42 68 45z" fill="#ffd266"/><path d="M43 48q8-10 17 0m8 0q9-10 17 0" fill="none" stroke="#293e4d" stroke-width="7"/>`,
    tail: `<path d="M91 83q16 6 11 20" fill="none" stroke="#9b6b48" stroke-width="8" stroke-linecap="round"/>`,
    face: `<ellipse cx="53" cy="56" rx="5" ry="7" fill="#49352e"/><ellipse cx="75" cy="56" rx="5" ry="7" fill="#49352e"/><ellipse cx="64" cy="68" rx="9" ry="6" fill="#f2e7d6"/><path d="M60 71q4 4 8 0" fill="none" stroke="#55433b" stroke-width="3"/>`
  },
  vikingPenguin: {
    body: '#303b4b', light: '#f7f0dc', trim: '#39424f', clothes: '#d0a455',
    head: `<ellipse cx="64" cy="55" rx="33" ry="38" fill="#313c4b" stroke="#39424f" stroke-width="5"/><ellipse cx="64" cy="69" rx="21" ry="23" fill="#fff4dd"/><path d="m56 60 8-6 8 6-8 8z" fill="#f09b3c"/>`,
    gear: `<path d="M34 38q3-25 30-25t30 25v8H34z" fill="#8a9da6" stroke="#39424f" stroke-width="5"/><path d="M41 34 29 18q-3-8 4-9l16 22m38 3 12-16q3-8-4-9L79 31" fill="#f2d589" stroke="#39424f" stroke-width="5" stroke-linejoin="round"/><path d="M45 40h38" stroke="#f1ca68" stroke-width="4"/>`,
    tail: `<path d="M38 78 22 85l7 18 18-6m41-19 15 7-5 16-17-5" fill="#6ba6c4" stroke="#39424f" stroke-width="4"/>`,
    face: `<ellipse cx="52" cy="52" rx="7" ry="9" fill="#fff"/><ellipse cx="75" cy="52" rx="7" ry="9" fill="#fff"/><circle cx="54" cy="54" r="3" fill="#293441"/><circle cx="73" cy="54" r="3" fill="#293441"/><path d="M55 91h18" stroke="#f09b3c" stroke-width="5" stroke-linecap="round"/>`
  },
  pizzaKnight: {
    body: '#e6a14e', light: '#ffe28b', trim: '#704533', clothes: '#d8a65d',
    head: `<path d="M31 36q33-14 66 0L73 100q-8 13-17 0z" fill="#f4cf70" stroke="#704533" stroke-width="6"/><path d="M35 38q29-11 58 0l-5 11q-24-9-48 0z" fill="#b9783f" stroke="#704533" stroke-width="4"/>`,
    gear: `<path d="M35 39q29-16 58 0l-2 16q-27-12-54 0z" fill="#aab5bd" stroke="#704533" stroke-width="5"/><path d="M47 38v10m16-13v11m16-9v10" stroke="#f3e5c8" stroke-width="4"/><circle cx="51" cy="62" r="7" fill="#c9483c"/><circle cx="74" cy="76" r="7" fill="#c9483c"/><circle cx="57" cy="88" r="6" fill="#c9483c"/><path d="M91 67 106 88m-8-13 10-2" stroke="#aebbc4" stroke-width="5" stroke-linecap="round"/>`,
    tail: `<path d="M40 77 25 86l10 15m55-23 12 9-7 12" fill="#f1c766" stroke="#704533" stroke-width="5"/>`,
    face: `<circle cx="55" cy="61" r="3" fill="#3a302a"/><circle cx="73" cy="61" r="3" fill="#3a302a"/><path d="M58 70q6 5 12 0" fill="none" stroke="#704533" stroke-width="3"/>`
  },
  beeAstronaut: {
    body: '#f4c844', light: '#fff0a4', trim: '#3e3a35', clothes: '#252c3b',
    head: `<circle cx="64" cy="51" r="29" fill="#f5cb45" stroke="#3e3a35" stroke-width="5"/><path d="M38 73q26-13 52 0v12q-26-12-52 0z" fill="#252c3b"/><path d="M42 89q22-10 44 0" stroke="#f5cb45" stroke-width="8"/>`,
    gear: `<circle cx="64" cy="49" r="39" fill="none" stroke="#bce9f2" stroke-width="5"/><path d="M53 25q-9-18-20-10m42 10q9-18 20-10" fill="none" stroke="#3e3a35" stroke-width="4"/><circle cx="32" cy="14" r="5" fill="#ffd75d"/><circle cx="96" cy="14" r="5" fill="#ffd75d"/><path d="M42 85h44l8 19H34z" fill="#76b8ce" stroke="#3e3a35" stroke-width="4"/><path d="M49 101 39 113m40-12 10 12" stroke="#f18b44" stroke-width="5"/>`,
    tail: `<path d="M36 55q-19-24-25 0 0 19 25 17m56-17q19-24 25 0 0 19-25 17" fill="#e6f9ff" stroke="#53788c" stroke-width="4"/>`,
    face: `<ellipse cx="54" cy="50" rx="5" ry="7" fill="#303744"/><ellipse cx="74" cy="50" rx="5" ry="7" fill="#303744"/><path d="M58 64q6 5 12 0" fill="none" stroke="#8c5638" stroke-width="3"/><circle cx="48" cy="62" r="4" fill="#f28d81"/><circle cx="80" cy="62" r="4" fill="#f28d81"/>`
  }
};

const playerCharacterFrame = (character, pose, action) => {
  const stride = action === 'jump' ? (pose % 2 ? 8 : -8) : [-6, 0, 6, 0][pose % 4];
  const bounce = action === 'jump' ? -7 : action === 'run' ? [-1, -5, -1, -4][pose % 4] : [0, -2, 0, -1][pose % 4];
  const armLift = action === 'jump' ? -17 : action === 'run' ? [-16, 11, 16, -11][pose % 4] : [-8, 5, 8, -5][pose % 4];
  const legY = action === 'jump' ? 100 : 91;
  const outline = character.trim;
  return `
    <ellipse cx="64" cy="119" rx="34" ry="5" fill="#263b42" opacity=".18"/>
    <g transform="translate(0 ${bounce})">
      ${character.tail}
      <path d="M49 ${legY}h16l-3 16-12 3-7-5zm17 0h15l6 13-7 6-12-3z"
        fill="${character.body}" stroke="${outline}" stroke-width="4" stroke-linejoin="round"
        transform="translate(${stride} 0)"/>
      <path d="M43 111q-10 0-12 7 1 6 20 4l8-5-4-6zm39 0q13-1 16 7-2 6-21 4l-7-5 4-6z"
        fill="${character.clothes}" stroke="${outline}" stroke-width="4" stroke-linejoin="round"/>
      <path d="M42 77q-16 4-19 17l12 8 18-14m34-11q16 4 19 17l-12 8-18-14"
        fill="${character.body}" stroke="${outline}" stroke-width="5" stroke-linejoin="round"
        transform="rotate(${armLift} 64 83)"/>
      <path d="M36 94q-8 2-9 9 4 6 13 2l6-6m46-5q8 2 9 9-4 6-13 2l-6-6"
        fill="${character.light}" stroke="${outline}" stroke-width="4" stroke-linecap="round"/>
      <path d="${character.bodyShape || 'M43 65q21-14 42 0l-3 38q-18 12-36 0z'}"
        fill="${character.body}" stroke="${outline}" stroke-width="5" stroke-linejoin="round"/>
      <path d="M49 79q15 7 30 0v20q-15 9-30 0z" fill="${character.light}" opacity=".92"/>
      <g>${character.head}</g>
      <g>${character.face}</g>
      <g>${character.gear}</g>
      <path d="M49 107h10m12 0h10" stroke="${character.light}" stroke-width="3" stroke-linecap="round"/>
      <path d="M42 74q8-6 15-3m18 0q7-3 12 3" fill="none" stroke="#fff" stroke-width="3" opacity=".4"/>
    </g>
  `;
};

const makePlayerCharacterArt = () => Object.fromEntries(
  Object.entries(playerCharacterLooks).map(([id, character]) => {
    const poses = action => [0, 1, 2, 3].map(pose => playerCharacterFrame(character, pose, action));
    return [id, {
      sprite: shell(playerCharacterFrame(character, 0, 'idle'), 1, 128),
      idle: characterSheet(poses('idle')),
      walk: characterSheet(poses('walk')),
      run: characterSheet(poses('run')),
      jump: characterSheet(poses('jump'))
    }];
  })
);

export const playerCharacterArt = makePlayerCharacterArt();

export const characterArt = {
  coin: shell(coin(), 1, 128),
  mysteryBox: shell(mysteryBox(), 1, 128),
  player: shell(hero(), 1, 128),
  playerIdle: characterSheet(idleFrames(hero)),
  playerWalk: characterSheet(idleFrames(hero)),
  playerRun: characterSheet([0, 1, 2, 3].map(pose => hero(pose))),
  playerJump: characterSheet([0, 1, 2, 3].map(pose => hero(pose, true))),
  goomba: shell(bug(), 1, 128),
  goombaIdle: characterSheet(idleFrames(bug)),
  goombaWalk: characterSheet(idleFrames(bug)),
  koopa: shell(koopa(), 1, 128),
  koopaIdle: characterSheet(idleFrames(koopa)),
  koopaWalk: characterSheet(idleFrames(koopa)),
  bat: shell(bat(), 1, 128),
  batIdle: characterSheet(idleFrames(bat)),
  batWalk: characterSheet(idleFrames(bat)),
  bosses: {}
};

const additionalBossTypes = [
  ['candyGolem', 'candyGolem'],
  ['moonBunny', 'moonBunny'],
  ['coralKraken', 'coralKraken'],
  ['cloudYeti', 'cloudYeti'],
  ['clockworkOwl', 'clockworkOwl'],
  ['volcanoTurtle', 'volcanoTurtle'],
  ['rainbowUnicorn', 'rainbowUnicorn']
];

for (const [type, lookId] of additionalBossTypes) {
  characterArt.bosses[type] = shell(additionalBoss(type, additionalBossLooks[lookId]), 1, 256);
}
characterArt.bosses.slimeKing = shell(boss('slimeKing'), 1, 256);
characterArt.bosses.roboCrab = shell(boss('roboCrab'), 1, 256);
characterArt.bosses.skyDragon = shell(boss('skyDragon'), 1, 256);

const skyColors = {
  storybook: '#a5dcdf', sunset: '#f6bd9c', desert: '#b9dfdc', ice: '#a8d7e8',
  candy: '#f9d1df', forest: '#9dbb87', volcano: '#8e4d59', ocean: '#91d7ce',
  space: '#293b70', haunted: '#59566b'
};
const tileColors = {
  p: '#2247db', g: '#468f49', s: '#d3a048', t: '#777f8a', n: '#edfaff',
  b: '#ac634c', q: '#ffcb35', i: '#168b64', l: '#b979d4', h: '#ed5128',
  w: '#8d5bc0', f: '#f2f3ff', e: '#a43556', o: '#651e50', c: '#ffe44b'
};

export function renderCommunityPreview(preview, title) {
  if (!preview || !Number.isInteger(preview.cols) || preview.cols < 8 || preview.cols > 256 ||
    !Number.isInteger(preview.rows) || preview.rows < 8 || preview.rows > 100 ||
    !Object.hasOwn(skyColors, preview.theme) || !Array.isArray(preview.tiles) ||
    preview.tiles.length !== preview.rows || preview.tiles.some(row =>
      typeof row !== 'string' || row.length !== preview.cols || /[^.pgstnbqilhwfeoc]/.test(row))) {
    throw new TypeError('Invalid level preview.');
  }
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 180;
  canvas.className = 'community-preview';
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', `Map preview of ${title}: ${preview.cols} columns by ${preview.rows} rows`);
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Your browser could not draw the level preview.');
  context.fillStyle = '#e8eef0';
  context.fillRect(0, 0, canvas.width, canvas.height);
  const scale = Math.min(canvas.width / preview.cols, canvas.height / preview.rows);
  const x = (canvas.width - preview.cols * scale) / 2;
  const y = (canvas.height - preview.rows * scale) / 2;
  context.fillStyle = skyColors[preview.theme];
  context.fillRect(x, y, preview.cols * scale, preview.rows * scale);
  for (let row = 0; row < preview.rows; row++) {
    for (let col = 0; col < preview.cols; col++) {
      const code = preview.tiles[row][col];
      if (code === '.') continue;
      context.fillStyle = tileColors[code];
      context.fillRect(x + col * scale, y + row * scale, scale + 0.1, scale + 0.1);
    }
  }
  return canvas;
}

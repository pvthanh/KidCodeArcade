// Deep-copies plain JSON data. Strings are immutable, so large embedded images and audio
// are shared between copies instead of being duplicated like JSON.parse(JSON.stringify()) does.
export function cloneData(value) {
  if (Array.isArray(value)) {
    const copy = new Array(value.length);
    for (let index = 0; index < value.length; index++) copy[index] = cloneData(value[index]);
    return copy;
  }
  if (value && typeof value === 'object') {
    const copy = {};
    for (const key of Object.keys(value)) copy[key] = cloneData(value[key]);
    return copy;
  }
  return value;
}

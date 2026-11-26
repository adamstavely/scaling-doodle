// Every style in the web app goes through design tokens. Fails on:
//   - colour literals (#hex, rgb(), hsl(), oklch(), named colours)
//   - lengths and times written as numbers (16px, 1.5rem, 200ms) outside @media queries
//   - font-family that isn't a token
//   - a var(--x) that isn't a Trench Coat DTCG token (--tc-*), an Energy Studio token (--es-*), or a custom
//     property the same file sets at runtime (declared in `:style`, e.g. --axis)
//   - inline style="" or :style that sets anything but custom properties
// Allowed: 0, unitless numbers, percentages, fr, 100vh, and keywords (transparent, currentColor, inherit, none, auto).
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { energyStudioTokens, trenchCoatTokens } from './tokens.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const known = new Set([...trenchCoatTokens().values(), ...energyStudioTokens().map(([name]) => name)]);
const GENERATED = join(root, 'src/styles/tokens.css');

const files = (dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? files(join(dir, e.name)) : /\.(vue|css)$/.test(e.name) ? [join(dir, e.name)] : [],
  );

const COLOUR = /#[0-9a-f]{3,8}\b|\b(?:rgba?|hsla?|oklch|oklab|lab|lch|hwb)\(/i;
const NAMED_COLOUR = /(?:^|[\s:,(])(?:white|black|red|blue|green|gray|grey|yellow|orange|purple|pink)(?=[\s;,)]|$)/i;
// 100vh / 100dvh (the whole viewport) is layout, not a design value, so it's allowed.
const LENGTH = /(?<![\w-])(?!100d?v[hw]\b)-?\d*\.?\d+(?:px|rem|em|ex|ch|vw|vh|dvh|svh|lvh|vmin|vmax|pt|cm|mm|in|ms|s|deg)\b/;

const problems = [];
for (const file of files(join(root, 'src'))) {
  if (file === GENERATED) continue;
  const text = readFileSync(file, 'utf8');
  const rel = relative(root, file);
  const lines = text.split('\n');
  const isVue = file.endsWith('.vue');
  const runtimeProps = new Set([...text.matchAll(/'(--[\w-]+)':/g)].map((m) => m[1]));

  let inStyle = !isVue;
  let inTemplate = false;
  lines.forEach((line, i) => {
    const at = `${rel}:${i + 1}`;
    if (isVue) {
      if (/^<style\b/.test(line)) return void (inStyle = true);
      if (/^<\/style>/.test(line)) return void (inStyle = false);
      if (/^<template>/.test(line)) inTemplate = true;
      if (/^<\/template>/.test(line)) inTemplate = false;
    }
    if (inTemplate) {
      if (/\sstyle="/.test(line)) problems.push(`${at} inline style="": use a class and tokens`);
      const bound = line.match(/:style="([^"]*)"/);
      if (bound && /[{,]\s*(?!'--)[\w'"-]+\s*:/.test(bound[1]))
        problems.push(`${at} :style may only set custom properties ('--name'): ${bound[1]}`);
      return;
    }
    if (!inStyle) return;
    const css = line.replace(/\/\*.*?\*\//g, '');
    if (/^\s*@media\b/.test(css)) return;
    if (COLOUR.test(css)) problems.push(`${at} colour literal: use a --tc-/--es- colour token`);
    if (NAMED_COLOUR.test(css.replace(/^[^:]*:/, ':')) && /:/.test(css)) problems.push(`${at} named colour: use a token`);
    if (LENGTH.test(css)) problems.push(`${at} raw length or time "${css.match(LENGTH)[0]}": use a token`);
    if (/font-family\s*:(?!\s*(?:var\(|inherit))/.test(css)) problems.push(`${at} font-family must be a token`);
    for (const [, name] of css.matchAll(/var\((--[\w-]+)/g))
      if (!known.has(name) && !runtimeProps.has(name)) problems.push(`${at} ${name} is not a DTCG design token`);
  });
}

if (problems.length) {
  console.error(`Styles must use design tokens (${problems.length} problem${problems.length > 1 ? 's' : ''}):`);
  for (const p of problems) console.error(`  ${p}`);
  process.exit(1);
}
console.log('Styles use design tokens only.');

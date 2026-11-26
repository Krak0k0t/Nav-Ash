import * as THREE from 'three';
import {createRng} from '../core/rng';
import {heightCanvasToNormalTexture} from './materials/proceduralMaps';

export interface ProceduralTextures {
  groundAlbedo: THREE.CanvasTexture;
  groundNormal: THREE.DataTexture;
  groundRoughness: THREE.CanvasTexture;
  woodAlbedo: THREE.CanvasTexture;
  woodNormal: THREE.DataTexture;
  woodBump: THREE.CanvasTexture;
  stoneAlbedo: THREE.CanvasTexture;
  stoneNormal: THREE.DataTexture;
  stoneRoughness: THREE.CanvasTexture;
  birchAlbedo: THREE.CanvasTexture;
  birchNormal: THREE.DataTexture;
  ironAlbedo: THREE.CanvasTexture;
  ironNormal: THREE.DataTexture;
  ironRoughness: THREE.CanvasTexture;
  mailAlbedo: THREE.CanvasTexture;
  mailNormal: THREE.DataTexture;
  mailRoughness: THREE.CanvasTexture;
  clothAlbedo: THREE.CanvasTexture;
  clothNormal: THREE.DataTexture;
  boneAlbedo: THREE.CanvasTexture;
  boneNormal: THREE.DataTexture;
  lamellarAlbedo: THREE.CanvasTexture;
  lamellarNormal: THREE.DataTexture;
  shieldAlbedo: THREE.CanvasTexture;
  shieldNormal: THREE.DataTexture;
  dispose: () => void;
}

function makeCanvas(size: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D canvas unavailable');
  return [canvas, ctx];
}

function finishTexture(
  canvas: HTMLCanvasElement,
  repeatX: number,
  repeatY: number,
  isColor: boolean,
  maxAnisotropy: number,
): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeatX, repeatY);
  tex.colorSpace = isColor ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  tex.anisotropy = Math.max(1, Math.min(8, maxAnisotropy));
  tex.needsUpdate = true;
  return tex;
}

export function createProceduralTextures(
  seed: number,
  maxAnisotropy: number,
): ProceduralTextures {
  const rng = createRng(seed ^ 0x9e3779b9);

  // 1. Dark peat soil, moss clusters, roots, wet mud & pebbles (512px)
  const [gCanvas, gCtx] = makeCanvas(512);
  const [rCanvas, rCtx] = makeCanvas(512);
  const [ghCanvas, ghCtx] = makeCanvas(512);

  gCtx.fillStyle = '#0f1411';
  gCtx.fillRect(0, 0, 512, 512);
  rCtx.fillStyle = '#dadada';
  rCtx.fillRect(0, 0, 512, 512);
  ghCtx.fillStyle = '#787878';
  ghCtx.fillRect(0, 0, 512, 512);

  for (let i = 0; i < 600; i++) {
    const x = rng.range(0, 512);
    const y = rng.range(0, 512);
    const rad = rng.range(5, 22);
    const roll = rng.next();
    const color =
      roll > 0.64
        ? 'rgba(26, 42, 24, 0.34)'
        : roll > 0.3
          ? 'rgba(22, 18, 14, 0.38)'
          : 'rgba(9, 12, 10, 0.42)';
    const hVal = roll > 0.64 ? 155 : roll > 0.3 ? 125 : 95;
    for (const ox of [-512, 0, 512]) {
      if (x + rad + ox < 0 || x - rad + ox > 512) continue;
      for (const oy of [-512, 0, 512]) {
        if (y + rad + oy < 0 || y - rad + oy > 512) continue;
        gCtx.fillStyle = color;
        gCtx.beginPath();
        gCtx.ellipse(
          x + ox,
          y + oy,
          rad,
          rad * rng.range(0.55, 0.95),
          rng.range(0, Math.PI),
          0,
          Math.PI * 2,
        );
        gCtx.fill();

        ghCtx.fillStyle = `rgba(${hVal},${hVal},${hVal},0.32)`;
        ghCtx.beginPath();
        ghCtx.arc(x + ox, y + oy, rad * 0.75, 0, Math.PI * 2);
        ghCtx.fill();
      }
    }
  }

  // Soft damp mud basins
  for (let i = 0; i < 12; i++) {
    const px = rng.range(48, 464);
    const py = rng.range(48, 464);
    const rx = rng.range(24, 48);
    const ry = rng.range(16, 36);
    const rot = rng.range(0, Math.PI);

    const drawPatch = (
      ctx: CanvasRenderingContext2D,
      inner: string,
      mid: string,
      outer: string,
    ) => {
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(rot);
      ctx.scale(1, ry / rx);
      const grad = ctx.createRadialGradient(0, 0, rx * 0.1, 0, 0, rx);
      grad.addColorStop(0, inner);
      grad.addColorStop(0.55, mid);
      grad.addColorStop(1, outer);
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(0, 0, rx, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    };

    drawPatch(gCtx, 'rgba(6,9,8,0.68)', 'rgba(11,15,13,0.34)', 'rgba(15,20,17,0)');
    drawPatch(rCtx, 'rgba(84,84,84,0.72)', 'rgba(138,138,138,0.42)', 'rgba(218,218,218,0)');
    drawPatch(ghCtx, 'rgba(42,42,42,0.7)', 'rgba(92,92,92,0.35)', 'rgba(120,120,120,0)');
  }

  // Twigs, pine needles & roots for sharp ground normal relief
  for (let i = 0; i < 720; i++) {
    const x = rng.range(0, 512);
    const y = rng.range(0, 512);
    const len = rng.range(5, 18);
    const ang = rng.range(0, Math.PI * 2);
    const tx = x + Math.cos(ang) * len;
    const ty = y + Math.sin(ang) * len;

    gCtx.strokeStyle =
      rng.next() > 0.4 ? 'rgba(58, 48, 36, 0.48)' : 'rgba(20, 32, 20, 0.52)';
    gCtx.lineWidth = rng.range(1.0, 2.4);
    gCtx.beginPath();
    gCtx.moveTo(x, y);
    gCtx.lineTo(tx, ty);
    gCtx.stroke();

    ghCtx.strokeStyle = 'rgba(215, 215, 215, 0.45)';
    ghCtx.lineWidth = rng.range(1.2, 2.6);
    ghCtx.beginPath();
    ghCtx.moveTo(x, y);
    ghCtx.lineTo(tx, ty);
    ghCtx.stroke();
  }

  // 2. Carved weathered dark oak + Slavic diamond notches (256px)
  const [wCanvas, wCtx] = makeCanvas(256);
  const [wbCanvas, wbCtx] = makeCanvas(256);
  wCtx.fillStyle = '#2d2219';
  wCtx.fillRect(0, 0, 256, 256);
  wbCtx.fillStyle = '#888888';
  wbCtx.fillRect(0, 0, 256, 256);

  for (let x = 0; x < 256; x += 2) {
    const tone = rng.int(26, 62);
    wCtx.fillStyle = `rgb(${tone}, ${Math.round(tone * 0.78)}, ${Math.round(tone * 0.6)})`;
    wCtx.fillRect(x, 0, 2, 256);
    const h = rng.int(95, 185);
    wbCtx.fillStyle = `rgb(${h},${h},${h})`;
    wbCtx.fillRect(x, 0, 2, 256);
  }
  // Age knots, deep bark fissures & moss-stained grooves
  for (let i = 0; i < 65; i++) {
    const kx = rng.range(0, 256);
    const ky = rng.range(0, 256);
    const hLen = rng.range(16, 64);
    wCtx.fillStyle = i % 4 === 0 ? 'rgba(24, 42, 22, 0.45)' : 'rgba(14, 10, 7, 0.62)';
    wCtx.fillRect(kx, ky, rng.range(1.5, 3.2), hLen);
    wbCtx.fillStyle = 'rgba(28, 28, 28, 0.72)';
    wbCtx.fillRect(kx, ky, rng.range(1.5, 3.0), hLen);
  }
  // Fine diagonal wood grain scratches & weather cracks
  for (let i = 0; i < 48; i++) {
    const sx = rng.range(0, 256);
    const sy = rng.range(0, 256);
    const ex = sx + rng.range(-10, 10);
    const ey = sy + rng.range(14, 42);
    wCtx.strokeStyle = 'rgba(11, 8, 5, 0.55)';
    wCtx.lineWidth = 1.2;
    wCtx.beginPath();
    wCtx.moveTo(sx, sy);
    wCtx.lineTo(ex, ey);
    wCtx.stroke();
    wbCtx.strokeStyle = '#181818';
    wbCtx.lineWidth = 1.4;
    wbCtx.beginPath();
    wbCtx.moveTo(sx, sy);
    wbCtx.lineTo(ex, ey);
    wbCtx.stroke();
  }
  // Carved Slavic geometric notches
  wCtx.strokeStyle = '#120d09';
  wCtx.lineWidth = 3;
  wbCtx.strokeStyle = '#1e1e1e';
  wbCtx.lineWidth = 4;
  for (let y = 24; y < 240; y += 48) {
    for (let x = 16; x < 240; x += 32) {
      for (const ctx of [wCtx, wbCtx]) {
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + 14, y - 13);
        ctx.lineTo(x + 28, y);
        ctx.lineTo(x + 14, y + 13);
        ctx.closePath();
        ctx.stroke();
      }
    }
  }

  // 3. Moss-covered chiseled granite stone (256px)
  const [sCanvas, sCtx] = makeCanvas(256);
  const [srCanvas, srCtx] = makeCanvas(256);
  const [shCanvas, shCtx] = makeCanvas(256);
  sCtx.fillStyle = '#262b29';
  sCtx.fillRect(0, 0, 256, 256);
  srCtx.fillStyle = '#c8c8c8';
  srCtx.fillRect(0, 0, 256, 256);
  shCtx.fillStyle = '#8a8a8a';
  shCtx.fillRect(0, 0, 256, 256);

  for (let i = 0; i < 520; i++) {
    const x = rng.range(0, 256);
    const y = rng.range(0, 256);
    const rad = rng.range(3, 15);
    const isMoss = rng.next() > 0.64;
    sCtx.fillStyle = isMoss ? 'rgba(34, 54, 30, 0.56)' : 'rgba(62, 68, 65, 0.36)';
    sCtx.beginPath();
    sCtx.arc(x, y, rad, 0, Math.PI * 2);
    sCtx.fill();

    shCtx.fillStyle = isMoss ? 'rgba(170,170,170,0.35)' : 'rgba(110,110,110,0.35)';
    shCtx.beginPath();
    shCtx.arc(x, y, rad, 0, Math.PI * 2);
    shCtx.fill();

    if (!isMoss && rng.next() > 0.65) {
      srCtx.fillStyle = 'rgba(90,90,90,0.4)';
      srCtx.beginPath();
      srCtx.arc(x, y, rad, 0, Math.PI * 2);
      srCtx.fill();
    }
  }
  sCtx.strokeStyle = 'rgba(12, 15, 14, 0.72)';
  sCtx.lineWidth = 2;
  shCtx.strokeStyle = '#181818';
  shCtx.lineWidth = 2.5;
  for (let i = 0; i < 28; i++) {
    const cx = rng.range(0, 256);
    const cy = rng.range(0, 256);
    for (const ctx of [sCtx, shCtx]) {
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      let nx = cx;
      let ny = cy;
      for (let k = 0; k < 4; k++) {
        nx += rng.range(-20, 20);
        ny += rng.range(-20, 20);
        ctx.lineTo(nx, ny);
      }
      ctx.stroke();
    }
  }

  // 4. Weathered birch bark with lichen & horizontal lenticels (256px)
  const [bCanvas, bCtx] = makeCanvas(256);
  const [bhCanvas, bhCtx] = makeCanvas(256);
  bCtx.fillStyle = '#978b78';
  bCtx.fillRect(0, 0, 256, 256);
  bhCtx.fillStyle = '#a0a0a0';
  bhCtx.fillRect(0, 0, 256, 256);
  const barkGrad = bCtx.createLinearGradient(0, 256, 0, 0);
  barkGrad.addColorStop(0, '#191d17');
  barkGrad.addColorStop(0.32, 'rgba(34, 38, 29, 0.68)');
  barkGrad.addColorStop(1, 'rgba(151, 139, 120, 0)');
  bCtx.fillStyle = barkGrad;
  bCtx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 230; i++) {
    const x = rng.range(0, 220);
    const y = rng.range(0, 256);
    const w = rng.range(10, 56);
    const h = rng.range(1.5, 6);
    bCtx.fillStyle = rng.next() > 0.25 ? '#1b1915' : '#4a4338';
    bCtx.fillRect(x, y, w, h);
    bhCtx.fillStyle = '#363636';
    bhCtx.fillRect(x, y, w, h);
  }

  // 5. Forged hammered & battle-scarred Slavic iron (256px)
  const [iaCanvas, iaCtx] = makeCanvas(256);
  const [irCanvas, irCtx] = makeCanvas(256);
  const [ihCanvas, ihCtx] = makeCanvas(256);
  iaCtx.fillStyle = '#585e64';
  iaCtx.fillRect(0, 0, 256, 256);
  irCtx.fillStyle = '#828282';
  irCtx.fillRect(0, 0, 256, 256);
  ihCtx.fillStyle = '#888888';
  ihCtx.fillRect(0, 0, 256, 256);

  for (let i = 0; i < 540; i++) {
    const x = rng.range(0, 256);
    const y = rng.range(0, 256);
    const r = rng.range(3.5, 14);
    const v = rng.int(65, 152);
    iaCtx.fillStyle = `rgba(${Math.round(v * 0.65)}, ${Math.round(v * 0.68)}, ${Math.round(v * 0.72)}, 0.35)`;
    iaCtx.beginPath();
    iaCtx.arc(x, y, r, 0, Math.PI * 2);
    iaCtx.fill();

    irCtx.fillStyle = `rgba(${rng.int(75, 178)}, ${rng.int(75, 178)}, ${rng.int(75, 178)}, 0.45)`;
    irCtx.beginPath();
    irCtx.arc(x, y, r, 0, Math.PI * 2);
    irCtx.fill();

    ihCtx.fillStyle = `rgba(${rng.int(55, 152)}, ${rng.int(55, 152)}, ${rng.int(55, 152)}, 0.45)`;
    ihCtx.beginPath();
    ihCtx.arc(x, y, r * 0.85, 0, Math.PI * 2);
    ihCtx.fill();
  }
  // Fine brushed-grain directional polishing micro-scratches
  for (let i = 0; i < 140; i++) {
    const sx = rng.range(0, 256);
    const sy = rng.range(0, 256);
    const len = rng.range(6, 28);
    const ang = rng.range(-0.32, 0.32) + (i % 3 === 0 ? 0.85 : 0.25);
    const ex = sx + Math.cos(ang) * len;
    const ey = sy + Math.sin(ang) * len;
    iaCtx.strokeStyle = i % 2 === 0 ? 'rgba(182, 192, 202, 0.34)' : 'rgba(34, 38, 42, 0.36)';
    iaCtx.lineWidth = 0.85;
    iaCtx.beginPath();
    iaCtx.moveTo(sx, sy);
    iaCtx.lineTo(ex, ey);
    iaCtx.stroke();

    irCtx.strokeStyle = i % 2 === 0 ? 'rgba(54, 54, 54, 0.55)' : 'rgba(195, 195, 195, 0.35)';
    irCtx.lineWidth = 0.9;
    irCtx.beginPath();
    irCtx.moveTo(sx, sy);
    irCtx.lineTo(ex, ey);
    irCtx.stroke();

    ihCtx.strokeStyle = i % 2 === 0 ? '#505050' : '#a8a8a8';
    ihCtx.lineWidth = 1.0;
    ihCtx.beginPath();
    ihCtx.moveTo(sx, sy);
    ihCtx.lineTo(ex, ey);
    ihCtx.stroke();
  }
  // Deep battle gouges, sword nicks & ash/soot grime along steel
  for (let i = 0; i < 78; i++) {
    const sx = rng.range(0, 256);
    const sy = rng.range(0, 256);
    const len = rng.range(10, 40);
    const ang = rng.range(0, Math.PI * 2);
    const ex = sx + Math.cos(ang) * len;
    const ey = sy + Math.sin(ang) * len;
    iaCtx.strokeStyle = 'rgba(198, 206, 214, 0.54)';
    iaCtx.lineWidth = 1.25;
    iaCtx.beginPath();
    iaCtx.moveTo(sx, sy);
    iaCtx.lineTo(ex, ey);
    iaCtx.stroke();

    irCtx.strokeStyle = 'rgba(38, 38, 38, 0.68)';
    irCtx.lineWidth = 1.4;
    irCtx.beginPath();
    irCtx.moveTo(sx, sy);
    irCtx.lineTo(ex, ey);
    irCtx.stroke();

    ihCtx.strokeStyle = '#202020';
    ihCtx.lineWidth = 1.65;
    ihCtx.beginPath();
    ihCtx.moveTo(sx, sy);
    ihCtx.lineTo(ex, ey);
    ihCtx.stroke();
  }
  // Subtle soot/mud/rust battle wear patches on iron plates
  for (let i = 0; i < 42; i++) {
    const gx = rng.range(0, 256);
    const gy = rng.range(0, 256);
    const gr = rng.range(8, 26);
    iaCtx.fillStyle = i % 3 === 0 ? 'rgba(46, 29, 18, 0.24)' : 'rgba(14, 15, 17, 0.28)';
    iaCtx.beginPath();
    iaCtx.arc(gx, gy, gr, 0, Math.PI * 2);
    iaCtx.fill();
    irCtx.fillStyle = 'rgba(205, 205, 205, 0.34)';
    irCtx.beginPath();
    irCtx.arc(gx, gy, gr, 0, Math.PI * 2);
    irCtx.fill();
  }

  // 6. Interlocked riveted chainmail rings + oil-darkened roughness map (256px)
  const [maCanvas, maCtx] = makeCanvas(256);
  const [mrCanvas, mrCtx] = makeCanvas(256);
  const [mhCanvas, mhCtx] = makeCanvas(256);
  maCtx.fillStyle = '#121417';
  maCtx.fillRect(0, 0, 256, 256);
  mrCtx.fillStyle = '#dedede';
  mrCtx.fillRect(0, 0, 256, 256);
  mhCtx.fillStyle = '#181818';
  mhCtx.fillRect(0, 0, 256, 256);
  for (let y = 6; y < 256; y += 12) {
    const shift = Math.round(y / 12) % 2 === 0 ? 0 : 6;
    for (let x = 6; x < 256; x += 12) {
      const wear = rng.range(0.86, 1.12);
      const colV = Math.round(108 * wear);
      maCtx.strokeStyle = `rgb(${colV}, ${colV + 7}, ${colV + 14})`;
      maCtx.lineWidth = 2.6;
      maCtx.beginPath();
      maCtx.arc(x + shift, y, 5.4, 0, Math.PI * 2);
      maCtx.stroke();

      const rVal = rng.int(58, 92);
      mrCtx.strokeStyle = `rgb(${rVal}, ${rVal}, ${rVal})`;
      mrCtx.lineWidth = 2.8;
      mrCtx.beginPath();
      mrCtx.arc(x + shift, y, 5.4, 0, Math.PI * 2);
      mrCtx.stroke();

      mhCtx.strokeStyle = '#e6e6e6';
      mhCtx.lineWidth = 3.0;
      mhCtx.beginPath();
      mhCtx.arc(x + shift, y, 5.4, 0, Math.PI * 2);
      mhCtx.stroke();

      // Tiny hammered ring rivet glint
      maCtx.fillStyle = '#9aa4ad';
      maCtx.fillRect(x + shift + 4.2, y - 1, 2, 2);
      mhCtx.fillStyle = '#ffffff';
      mhCtx.fillRect(x + shift + 4.2, y - 1, 2, 2);
    }
  }

  // 7. Heavy rough Slavic wool cloth weave (128px)
  const [caCanvas, caCtx] = makeCanvas(128);
  const [chCanvas, chCtx] = makeCanvas(128);
  caCtx.fillStyle = '#202428';
  caCtx.fillRect(0, 0, 128, 128);
  chCtx.fillStyle = '#7c7c7c';
  chCtx.fillRect(0, 0, 128, 128);
  for (let y = 0; y < 128; y += 4) {
    for (let x = 0; x < 128; x += 4) {
      const alt = ((x + y) / 4) % 2 === 0;
      caCtx.fillStyle = alt ? '#292e33' : '#181c20';
      caCtx.fillRect(x, y, 3, 3);
      chCtx.fillStyle = alt ? '#b8b8b8' : '#585858';
      chCtx.fillRect(x, y, 3, 3);
    }
  }

  // 8. Aged bog bone / skull texture with marrow pores & hairline fractures (256px)
  const [boCanvas, boCtx] = makeCanvas(256);
  const [bohCanvas, bohCtx] = makeCanvas(256);
  boCtx.fillStyle = '#7e7462';
  boCtx.fillRect(0, 0, 256, 256);
  bohCtx.fillStyle = '#909090';
  bohCtx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 340; i++) {
    const x = rng.range(0, 256);
    const y = rng.range(0, 256);
    const r = rng.range(2, 12);
    boCtx.fillStyle = rng.next() > 0.5 ? 'rgba(54, 48, 38, 0.35)' : 'rgba(148, 138, 118, 0.25)';
    boCtx.beginPath();
    boCtx.arc(x, y, r, 0, Math.PI * 2);
    boCtx.fill();
    bohCtx.fillStyle = rng.next() > 0.5 ? 'rgba(65,65,65,0.4)' : 'rgba(175,175,175,0.3)';
    bohCtx.beginPath();
    bohCtx.arc(x, y, r, 0, Math.PI * 2);
    bohCtx.fill();
  }
  for (let i = 0; i < 42; i++) {
    const sx = rng.range(0, 256);
    const sy = rng.range(0, 256);
    const ex = sx + rng.range(-24, 24);
    const ey = sy + rng.range(-24, 24);
    boCtx.strokeStyle = 'rgba(28, 22, 16, 0.58)';
    boCtx.lineWidth = 1.1;
    boCtx.beginPath();
    boCtx.moveTo(sx, sy);
    boCtx.lineTo(ex, ey);
    boCtx.stroke();
    bohCtx.strokeStyle = '#242424';
    bohCtx.lineWidth = 1.4;
    bohCtx.beginPath();
    bohCtx.moveTo(sx, sy);
    bohCtx.lineTo(ex, ey);
    bohCtx.stroke();
  }

  // 9. Rus Overlapping Lamellar Steel & Leather-Laced Scales (256px)
  const [laCanvas, laCtx] = makeCanvas(256);
  const [lhCanvas, lhCtx] = makeCanvas(256);
  laCtx.fillStyle = '#24272b';
  laCtx.fillRect(0, 0, 256, 256);
  lhCtx.fillStyle = '#404040';
  lhCtx.fillRect(0, 0, 256, 256);
  const scaleW = 32;
  const scaleH = 26;
  for (let row = 0; row < 12; row++) {
    const sy = row * scaleH - 8;
    const xOff = (row % 2) * (scaleW * 0.5);
    for (let col = -1; col < 10; col++) {
      const sx = col * scaleW + xOff;
      const shade = rng.int(62, 88);
      laCtx.fillStyle = `rgb(${shade}, ${shade + 4}, ${shade + 9})`;
      laCtx.strokeStyle = '#121417';
      laCtx.lineWidth = 2.2;
      laCtx.beginPath();
      laCtx.moveTo(sx + 2, sy);
      laCtx.lineTo(sx + scaleW - 2, sy);
      laCtx.lineTo(sx + scaleW - 3, sy + scaleH * 0.65);
      laCtx.quadraticCurveTo(sx + scaleW * 0.5, sy + scaleH + 4, sx + 3, sy + scaleH * 0.65);
      laCtx.closePath();
      laCtx.fill();
      laCtx.stroke();

      const hGrad = lhCtx.createLinearGradient(sx, sy, sx, sy + scaleH);
      hGrad.addColorStop(0, '#c2c2c2');
      hGrad.addColorStop(0.75, '#f0f0f0');
      hGrad.addColorStop(1, '#262626');
      lhCtx.fillStyle = hGrad;
      lhCtx.strokeStyle = '#141414';
      lhCtx.lineWidth = 2.4;
      lhCtx.beginPath();
      lhCtx.moveTo(sx + 2, sy);
      lhCtx.lineTo(sx + scaleW - 2, sy);
      lhCtx.lineTo(sx + scaleW - 3, sy + scaleH * 0.65);
      lhCtx.quadraticCurveTo(sx + scaleW * 0.5, sy + scaleH + 4, sx + 3, sy + scaleH * 0.65);
      lhCtx.closePath();
      lhCtx.fill();
      lhCtx.stroke();

      // Leather lacing & bronze rivets at top of each scale
      laCtx.fillStyle = '#5a3b22';
      laCtx.fillRect(sx + scaleW * 0.5 - 3, sy + 4, 6, 4);
      lhCtx.fillStyle = '#ffffff';
      lhCtx.fillRect(sx + scaleW * 0.5 - 3, sy + 4, 6, 4);
    }
  }

  // 10. Painted Weathered Slavic Wooden Shield (256px)
  const [saCanvas, saCtx] = makeCanvas(256);
  const [shdCanvas, shdCtx] = makeCanvas(256);
  saCtx.fillStyle = '#331514';
  saCtx.fillRect(0, 0, 256, 256);
  shdCtx.fillStyle = '#909090';
  shdCtx.fillRect(0, 0, 256, 256);
  // Vertical planks + wood grain + worn battle gouges
  for (let p = 0; p < 8; p++) {
    const px = p * 32;
    const tone = rng.int(44, 66);
    saCtx.fillStyle = `rgb(${tone}, ${Math.round(tone * 0.38)}, ${Math.round(tone * 0.34)})`;
    saCtx.fillRect(px + 1, 0, 30, 256);
    saCtx.fillStyle = '#120a08';
    saCtx.fillRect(px, 0, 2, 256);
    shdCtx.fillStyle = '#202020';
    shdCtx.fillRect(px, 0, 2, 256);
    for (let g = 0; g < 16; g++) {
      const gx = px + rng.range(3, 28);
      saCtx.fillStyle = 'rgba(18, 10, 8, 0.35)';
      saCtx.fillRect(gx, 0, 1.5, 256);
      shdCtx.fillStyle = 'rgba(65, 65, 65, 0.45)';
      shdCtx.fillRect(gx, 0, 1.5, 256);
    }
  }
  // Faded ochre-bone Slavic border ring & sun notches
  saCtx.strokeStyle = 'rgba(176, 144, 104, 0.62)';
  saCtx.lineWidth = 10;
  saCtx.beginPath();
  saCtx.arc(128, 128, 102, 0, Math.PI * 2);
  saCtx.stroke();
  for (let k = 0; k < 8; k++) {
    const ang = (k / 8) * Math.PI * 2;
    saCtx.strokeStyle = 'rgba(186, 152, 108, 0.48)';
    saCtx.lineWidth = 4;
    saCtx.beginPath();
    saCtx.moveTo(128 + Math.cos(ang) * 44, 128 + Math.sin(ang) * 44);
    saCtx.lineTo(128 + Math.cos(ang) * 96, 128 + Math.sin(ang) * 96);
    saCtx.stroke();
  }
  // Axe notches & mud wear
  for (let i = 0; i < 24; i++) {
    const sx = rng.range(24, 232);
    const sy = rng.range(24, 232);
    const ex = sx + rng.range(-26, 26);
    const ey = sy + rng.range(-26, 26);
    saCtx.strokeStyle = 'rgba(20, 14, 11, 0.72)';
    saCtx.lineWidth = 2;
    saCtx.beginPath();
    saCtx.moveTo(sx, sy);
    saCtx.lineTo(ex, ey);
    saCtx.stroke();
    shdCtx.strokeStyle = '#181818';
    shdCtx.lineWidth = 2.5;
    shdCtx.beginPath();
    shdCtx.moveTo(sx, sy);
    shdCtx.lineTo(ex, ey);
    shdCtx.stroke();
  }

  const groundAlbedo = finishTexture(gCanvas, 16, 16, true, maxAnisotropy);
  const groundRoughness = finishTexture(rCanvas, 16, 16, false, maxAnisotropy);
  const groundNormal = heightCanvasToNormalTexture(ghCanvas, 2.8, 16, 16, maxAnisotropy);

  const woodAlbedo = finishTexture(wCanvas, 1, 2, true, maxAnisotropy);
  const woodBump = finishTexture(wbCanvas, 1, 2, false, maxAnisotropy);
  const woodNormal = heightCanvasToNormalTexture(wbCanvas, 3.0, 1, 2, maxAnisotropy);

  const stoneAlbedo = finishTexture(sCanvas, 2, 2, true, maxAnisotropy);
  const stoneRoughness = finishTexture(srCanvas, 2, 2, false, maxAnisotropy);
  const stoneNormal = heightCanvasToNormalTexture(shCanvas, 3.2, 2, 2, maxAnisotropy);

  const birchAlbedo = finishTexture(bCanvas, 1, 2, true, maxAnisotropy);
  const birchNormal = heightCanvasToNormalTexture(bhCanvas, 2.2, 1, 2, maxAnisotropy);

  const ironAlbedo = finishTexture(iaCanvas, 2, 2, true, maxAnisotropy);
  const ironRoughness = finishTexture(irCanvas, 2, 2, false, maxAnisotropy);
  const ironNormal = heightCanvasToNormalTexture(ihCanvas, 2.4, 2, 2, maxAnisotropy);

  const mailAlbedo = finishTexture(maCanvas, 5, 5, true, maxAnisotropy);
  const mailRoughness = finishTexture(mrCanvas, 5, 5, false, maxAnisotropy);
  const mailNormal = heightCanvasToNormalTexture(mhCanvas, 3.1, 5, 5, maxAnisotropy);

  const clothAlbedo = finishTexture(caCanvas, 5, 5, true, maxAnisotropy);
  const clothNormal = heightCanvasToNormalTexture(chCanvas, 1.8, 5, 5, maxAnisotropy);

  const boneAlbedo = finishTexture(boCanvas, 1, 1, true, maxAnisotropy);
  const boneNormal = heightCanvasToNormalTexture(bohCanvas, 2.4, 1, 1, maxAnisotropy);

  const lamellarAlbedo = finishTexture(laCanvas, 2, 2, true, maxAnisotropy);
  const lamellarNormal = heightCanvasToNormalTexture(lhCanvas, 2.8, 2, 2, maxAnisotropy);

  const shieldAlbedo = finishTexture(saCanvas, 1, 1, true, maxAnisotropy);
  const shieldNormal = heightCanvasToNormalTexture(shdCanvas, 2.6, 1, 1, maxAnisotropy);

  return {
    groundAlbedo,
    groundNormal,
    groundRoughness,
    woodAlbedo,
    woodNormal,
    woodBump,
    stoneAlbedo,
    stoneNormal,
    stoneRoughness,
    birchAlbedo,
    birchNormal,
    ironAlbedo,
    ironNormal,
    ironRoughness,
    mailAlbedo,
    mailNormal,
    mailRoughness,
    clothAlbedo,
    clothNormal,
    boneAlbedo,
    boneNormal,
    lamellarAlbedo,
    lamellarNormal,
    shieldAlbedo,
    shieldNormal,
    dispose: () => {
      groundAlbedo.dispose();
      groundNormal.dispose();
      groundRoughness.dispose();
      woodAlbedo.dispose();
      woodNormal.dispose();
      woodBump.dispose();
      stoneAlbedo.dispose();
      stoneNormal.dispose();
      stoneRoughness.dispose();
      birchAlbedo.dispose();
      birchNormal.dispose();
      ironAlbedo.dispose();
      ironNormal.dispose();
      ironRoughness.dispose();
      mailAlbedo.dispose();
      mailNormal.dispose();
      mailRoughness.dispose();
      clothAlbedo.dispose();
      clothNormal.dispose();
      boneAlbedo.dispose();
      boneNormal.dispose();
      lamellarAlbedo.dispose();
      lamellarNormal.dispose();
      shieldAlbedo.dispose();
      shieldNormal.dispose();
    },
  };
}

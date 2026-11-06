(function () {
  const B = (window.Baller = window.Baller || {});

  const PAD = 52;
  const ALPHA = 32;

  const WALL = {
    mortar: "#5e5146",
    tones: ["#ddd0bc", "#cbbba4", "#efe4d4", "#b7a58e", "#d4c3ab", "#e7d9c6"],
    dark: "#4e4338",
    moss: "#667044",
    light: "#f7f1e6",
    edge: "#3c332b",
  };

  function hash(n) {
    let x = (n + 0x6d2b79f5) | 0;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  }

  function fillStones(ctx, block, palette, salt) {
    const s = block.w;
    ctx.fillStyle = palette.mortar;
    ctx.fillRect(-20, -36, s + 40, s + 56);
    const mod = 7;
    const rowBase = block.r * 4;
    for (let row = -3; row < 8; row++) {
      const y = row * mod;
      const offset = ((rowBase + row) % 2) * 3;
      for (let n = -3; n < 8; n++) {
        const x = n * mod + offset;
        const tone = hash(salt + (rowBase + row) * 131 + (block.c * 4 + n) * 17);
        ctx.fillStyle = palette.tones[Math.floor(tone * palette.tones.length)];
        ctx.fillRect(x, y, 6, 6);
        if (tone > 0.9) {
          ctx.fillStyle = palette.dark;
          ctx.fillRect(x + 1, y + 2, 1, 1);
          ctx.fillRect(x + 4, y + 3, 1, 1);
        } else if (tone < 0.07 && block.r === 0 && y > s - 18) {
          ctx.fillStyle = palette.moss;
          ctx.fillRect(x + 1, y + 4, 3, 2);
        }
      }
    }
  }

  function shade(ctx, block) {
    const s = block.w;
    const light = ctx.createLinearGradient(0, 0, s, s);
    light.addColorStop(0, "rgba(255,248,236,0.42)");
    light.addColorStop(0.42, "rgba(255,248,236,0)");
    light.addColorStop(1, "rgba(28,16,10,0.34)");
    ctx.fillStyle = light;
    ctx.fillRect(-20, -36, s + 40, s + 56);
    ctx.fillStyle = "rgba(255,250,242,0.4)";
    ctx.fillRect(-8, 0, s + 16, 1);
    ctx.fillStyle = "rgba(24,14,8,0.32)";
    ctx.fillRect(-8, s - 3, s + 16, 3);
  }

  function fillClipped(ctx, block, castle, path, palette, salt) {
    ctx.save();
    ctx.clip(path);
    fillStones(ctx, block, palette, salt + (castle.side === "left" ? 11 : 29));
    shade(ctx, block);
    ctx.restore();
    ctx.strokeStyle = palette.edge;
    ctx.lineWidth = 1;
    ctx.stroke(path);
  }

  const PALACE = {
    mortar: "#e7d6a0",
    tones: ["#fbf6d6", "#f4e8b4", "#fff9e4", "#efe2a8", "#f8f0c6", "#f3e6b0"],
    dark: "#cbb67a",
    moss: "#e7d6a0",
    light: "#fffdf2",
    edge: "#c9b56e",
  };

  function palaceRows(castle) {
    let rows = 0;
    for (let i = 0; i < castle.columns.length; i++) {
      if (castle.columns[i].length > rows) rows = castle.columns[i].length;
    }
    return rows;
  }

  function domePath(ctx, cx, base, rx, ry) {
    ctx.beginPath();
    ctx.moveTo(cx - rx, base);
    for (let i = 1; i <= 28; i++) {
      const a = Math.PI * (1 - i / 28);
      ctx.lineTo(cx + Math.cos(a) * rx, base - Math.sin(a) * ry);
    }
    ctx.closePath();
  }

  function paintGlassWindow(ctx, x, y) {
    ctx.fillStyle = "#fff8e2";
    ctx.fillRect(x - 1, y - 1, 12, 16);
    ctx.fillStyle = "#245e86";
    ctx.fillRect(x, y, 10, 14);
    ctx.fillStyle = "#6eb6dc";
    ctx.fillRect(x + 1, y + 1, 8, 12);
    ctx.fillStyle = "#e7f6fd";
    ctx.fillRect(x + 1, y + 1, 3, 4);
    ctx.strokeStyle = "#f7f1dc";
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(x + 5, y + 1);
    ctx.lineTo(x + 5, y + 13);
    ctx.moveTo(x + 1, y + 7);
    ctx.lineTo(x + 9, y + 7);
    ctx.stroke();
  }

  function paintPorticoColumn(ctx, x, y, w, h) {
    ctx.fillStyle = "#fff9e4";
    ctx.fillRect(x - 2, y + h - 6, w + 4, 6);
    ctx.fillStyle = "#e4d29a";
    ctx.fillRect(x - 2, y + h - 2, w + 4, 2);
    ctx.fillStyle = "#fff7dc";
    ctx.fillRect(x, y + 6, w, h - 12);
    ctx.fillStyle = "#e6d4a2";
    ctx.fillRect(x + w - 2, y + 6, 2, h - 12);
    ctx.fillStyle = "rgba(190, 160, 80, 0.35)";
    ctx.fillRect(x + Math.floor(w / 2), y + 8, 1, h - 16);
    ctx.fillStyle = "#fff9e4";
    ctx.fillRect(x - 3, y, w + 6, 3);
    ctx.fillRect(x - 2, y + 3, w + 4, 4);
  }

  function paintRada(ctx, W, H) {
    ctx.fillStyle = "#f7efc2";
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "#ead992";
    for (let y = 12; y < H - 10; y += 9) ctx.fillRect(0, y, W, 1);
    ctx.fillStyle = "rgba(255, 252, 236, 0.7)";
    ctx.fillRect(0, 0, 8, H);
    const side = ctx.createLinearGradient(W - 16, 0, W, 0);
    side.addColorStop(0, "rgba(170, 140, 60, 0)");
    side.addColorStop(1, "rgba(140, 110, 40, 0.22)");
    ctx.fillStyle = side;
    ctx.fillRect(W - 16, 0, 16, H);

    ctx.fillStyle = "#e6d48e";
    ctx.fillRect(0, H - 11, W, 11);
    ctx.fillStyle = "#fff6d6";
    ctx.fillRect(0, H - 11, W, 2);

    const floors = [26, 56, 86, 116];
    for (let i = 0; i < floors.length; i++) {
      paintGlassWindow(ctx, 6, floors[i]);
      paintGlassWindow(ctx, W - 16, floors[i]);
    }

    const colW = 7;
    const left = [30, 48, 66];
    for (let i = 0; i < left.length; i++) {
      paintPorticoColumn(ctx, left[i], 16, colW, H - 28);
      paintPorticoColumn(ctx, W - left[i] - colW, 16, colW, H - 28);
    }

    ctx.fillStyle = "#fff6d2";
    ctx.fillRect(24, 9, W - 48, 8);
    ctx.fillStyle = "#dcc888";
    ctx.fillRect(24, 16, W - 48, 2);

    ctx.fillStyle = "#fff8de";
    ctx.fillRect(76, H - 34, 44, 6);
    ctx.fillStyle = "#e4d08a";
    ctx.fillRect(76, H - 28, 44, 2);
    ctx.fillRect(78, H - 28, 5, 28);
    ctx.fillRect(113, H - 28, 5, 28);

    ctx.fillStyle = "#fff8de";
    ctx.fillRect(-2, 0, W + 4, 7);
    ctx.fillStyle = "#d4c07e";
    ctx.fillRect(-2, 6, W + 4, 2);

    const cx = W / 2;
    const rx = W / 4;
    const base = 3;
    const ry = 40;
    ctx.fillStyle = "#f8f1cc";
    ctx.fillRect(cx - rx + 5, base, rx * 2 - 10, 6);
    ctx.fillStyle = "#6aafd4";
    for (let x = cx - rx + 12; x < cx + rx - 14; x += 11) ctx.fillRect(x, base + 1, 4, 3);

    domePath(ctx, cx, base, rx, ry);
    ctx.save();
    ctx.clip();
    const glass = ctx.createLinearGradient(cx - rx, base - ry, cx + rx * 0.4, base);
    glass.addColorStop(0, "#e7f7fd");
    glass.addColorStop(0.28, "#8ecae6");
    glass.addColorStop(0.62, "#3f8fbe");
    glass.addColorStop(1, "#1f5f86");
    ctx.fillStyle = glass;
    ctx.fillRect(cx - rx - 2, base - ry - 2, rx * 2 + 4, ry + 6);
    ctx.strokeStyle = "rgba(255,255,255,0.62)";
    ctx.lineWidth = 1;
    for (let i = 1; i < 7; i++) {
      const a = Math.PI * (i / 7);
      ctx.beginPath();
      ctx.moveTo(cx, base);
      ctx.lineTo(cx + Math.cos(a) * rx, base - Math.sin(a) * ry);
      ctx.stroke();
    }
    ctx.strokeStyle = "rgba(255,255,255,0.45)";
    for (let n = 0; n < 2; n++) {
      const t = n === 0 ? 0.4 : 0.7;
      const y = base - ry * t;
      const half = rx * Math.sqrt(Math.max(0, 1 - t * t));
      ctx.beginPath();
      ctx.moveTo(cx - half, y);
      ctx.lineTo(cx + half, y);
      ctx.stroke();
    }
    ctx.restore();
    domePath(ctx, cx, base, rx, ry);
    ctx.strokeStyle = "#1c5578";
    ctx.lineWidth = 1.1;
    ctx.stroke();
  }

  function paintExtraWall(ctx, block, castle) {
    if (!block.patched) return;
    const size = B.BALANCE.cell;
    const path = new Path2D();
    for (const key in block.patched) {
      const comma = key.indexOf(",");
      const cx = Number(key.slice(0, comma));
      const cy = Number(key.slice(comma + 1));
      path.rect(cx * size, cy * size, size, size);
    }
    ctx.save();
    ctx.clip(path);
    fillStones(ctx, block, PALACE, 7 + (castle.side === "left" ? 11 : 29));
    shade(ctx, block);
    ctx.fillStyle = PALACE.edge;
    for (const key in block.patched) {
      const comma = key.indexOf(",");
      const cx = Number(key.slice(0, comma));
      const cy = Number(key.slice(comma + 1));
      const x = cx * size;
      const y = cy * size;
      if (!block.patched[cx + "," + (cy - 1)]) ctx.fillRect(x, y, size, 1);
      if (!block.patched[cx + "," + (cy + 1)]) ctx.fillRect(x, y + size - 1, size, 1);
      if (!block.patched[(cx - 1) + "," + cy]) ctx.fillRect(x, y, 1, size);
      if (!block.patched[(cx + 1) + "," + cy]) ctx.fillRect(x + size - 1, y, 1, size);
    }
    ctx.restore();
  }

  function paintWall(ctx, block, castle) {
    if (block.extraWall) {
      paintExtraWall(ctx, block, castle);
      return;
    }
    const s = block.w;
    const rows = palaceRows(castle);
    ctx.save();
    ctx.beginPath();
    ctx.rect(-8, -50, s + 16, s + 62);
    ctx.clip();
    ctx.translate(-block.c * s, -(rows - 1 - block.r) * s);
    paintRada(ctx, B.BALANCE.cols * s, rows * s);
    ctx.restore();
  }

  function paintOrcOverlord(ctx, block) {
    const s = block.w;
    const skin = "#3f9a28";
    const skinDark = "#2a6a18";
    const skinDeep = "#173d0e";
    const hide = "#3a2418";
    const hideDark = "#24160e";
    const iron = "#6a6458";
    const ironDark = "#2c2824";
    const ironLite = "#d2cdc2";
    const rust = "#8a3020";
    const bone = "#f0e2c4";
    const tusk = "#fff6e4";

    ctx.save();
    ctx.beginPath();
    ctx.rect(1, 1, s - 2, s - 2);
    ctx.clip();
    ctx.translate(s / 2, 0);
    ctx.scale(-1, 1);

    ctx.fillStyle = "#4a4036";
    ctx.fillRect(-11, 22, 22, 5);
    ctx.fillStyle = "#8a7a68";
    ctx.fillRect(-11, 22, 22, 1);
    ctx.fillStyle = hideDark;
    ctx.fillRect(-8, 20, 16, 3);

    ctx.fillStyle = ironDark;
    ctx.fillRect(-12, 5, 8, 18);
    ctx.fillStyle = "#3a342c";
    ctx.fillRect(-11, 6, 6, 16);
    ctx.fillStyle = "#6a6054";
    ctx.fillRect(-11, 6, 2, 16);
    ctx.fillStyle = bone;
    ctx.beginPath();
    ctx.moveTo(-12, 6);
    ctx.lineTo(-8, 1);
    ctx.lineTo(-4, 6);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = hideDark;
    ctx.fillRect(-6, 15, 16, 7);
    ctx.fillStyle = hide;
    ctx.fillRect(-6, 15, 16, 2);
    ctx.fillStyle = bone;
    ctx.fillRect(-2, 17, 2, 2);
    ctx.fillRect(4, 17, 2, 2);

    ctx.fillStyle = hideDark;
    ctx.beginPath();
    ctx.moveTo(-4, 8);
    ctx.lineTo(-5, 18);
    ctx.lineTo(8, 18);
    ctx.lineTo(5, 8);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = rust;
    ctx.fillRect(-4, 12, 9, 2);
    ctx.fillStyle = "#c45a40";
    ctx.fillRect(-4, 12, 9, 1);

    ctx.fillStyle = skin;
    ctx.beginPath();
    ctx.moveTo(-1.5, 6.2);
    ctx.lineTo(-7.4, 2.8);
    ctx.lineTo(-2.2, 10.6);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#7a2840";
    ctx.beginPath();
    ctx.moveTo(-2, 6.6);
    ctx.lineTo(-5.6, 4.2);
    ctx.lineTo(-2.6, 9.2);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = skinDark;
    ctx.beginPath();
    ctx.arc(1.2, 9.2, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = skin;
    ctx.beginPath();
    ctx.arc(0.6, 8.4, 4.3, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = skinDark;
    ctx.beginPath();
    ctx.moveTo(3.2, 7.4);
    ctx.lineTo(8.6, 9.4);
    ctx.lineTo(7.2, 12.2);
    ctx.lineTo(2.8, 11);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#0e2408";
    ctx.beginPath();
    ctx.arc(7.1, 10.5, 0.95, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = skinDeep;
    ctx.beginPath();
    ctx.moveTo(-2.2, 6);
    ctx.lineTo(5.2, 5.5);
    ctx.lineTo(4.6, 8);
    ctx.lineTo(-1.4, 8.2);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#140c08";
    ctx.fillRect(1.2, 11.5, 5.2, 1.5);

    ctx.fillStyle = tusk;
    ctx.beginPath();
    ctx.moveTo(3.2, 12.5);
    ctx.lineTo(5.4, 12);
    ctx.lineTo(7.6, 6.4);
    ctx.lineTo(5.6, 6.8);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(1, 12.8);
    ctx.lineTo(2.8, 12.4);
    ctx.lineTo(3.6, 8.4);
    ctx.lineTo(2, 8.8);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = "#8a1814";
    ctx.fillRect(1.4, 7.6, 3.2, 2.4);
    ctx.fillStyle = "#f0d040";
    ctx.fillRect(1.8, 8, 2.4, 1.6);
    ctx.fillStyle = "#120e06";
    ctx.fillRect(2.5, 7.8, 1, 1.9);

    ctx.strokeStyle = skinDeep;
    ctx.lineWidth = 1.05;
    ctx.beginPath();
    ctx.moveTo(-1.4, 5.2);
    ctx.lineTo(0.6, 10.4);
    ctx.stroke();

    ctx.fillStyle = "#2a5c16";
    ctx.beginPath();
    ctx.arc(-1.8, 10.8, 1.05, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = ironDark;
    ctx.fillRect(-3, 3.4, 9, 2.4);
    ctx.fillStyle = iron;
    ctx.fillRect(-3, 2.3, 9, 1.7);
    ctx.fillStyle = ironLite;
    ctx.fillRect(-3, 2.3, 9, 0.7);
    ctx.fillStyle = ironLite;
    ctx.beginPath();
    ctx.moveTo(-3, 3.1);
    ctx.lineTo(-1, 0.2);
    ctx.lineTo(1, 3.1);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(1.2, 3.1);
    ctx.lineTo(2.8, 1.6);
    ctx.lineTo(4.4, 3.1);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(4.6, 3.1);
    ctx.lineTo(6.8, 0);
    ctx.lineTo(8.2, 3.1);
    ctx.fill();
    ctx.fillStyle = "#c42830";
    ctx.fillRect(2.3, 3.5, 2.1, 1.8);

    ctx.strokeStyle = "#6b4428";
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(6, 13);
    ctx.lineTo(11, 7.2);
    ctx.stroke();
    ctx.fillStyle = ironLite;
    ctx.beginPath();
    ctx.moveTo(9.4, 8.6);
    ctx.lineTo(12.3, 5.6);
    ctx.lineTo(12.3, 9.4);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = ironDark;
    ctx.beginPath();
    ctx.moveTo(10.1, 7.8);
    ctx.lineTo(11.6, 6.2);
    ctx.lineTo(11.6, 8.6);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  function paintKing(ctx, block, castle) {
    if (castle.side === "right") {
      paintOrcOverlord(ctx, block);
      return;
    }
    const s = block.w;
    const robe = "#9d2c32";
    const robeDark = "#641820";
    const gold = "#e6c56a";
    const goldDeep = "#a67c32";
    const goldLite = "#fff1c4";
    const wood = "#6b4428";
    const woodLite = "#b07d48";
    const woodDark = "#3a2618";
    const skin = "#f0c4a2";
    const beard = "#f4efe4";

    ctx.save();
    ctx.beginPath();
    ctx.rect(1, 1, s - 2, s - 2);
    ctx.clip();
    ctx.translate(s / 2, 0);

    ctx.fillStyle = "#b7a58e";
    ctx.fillRect(-11, 22, 22, 5);
    ctx.fillStyle = "#efe4d4";
    ctx.fillRect(-11, 22, 22, 1);
    ctx.fillStyle = robeDark;
    ctx.fillRect(-8, 20, 16, 3);

    ctx.fillStyle = woodDark;
    ctx.fillRect(-12, 5, 8, 18);
    ctx.fillStyle = wood;
    ctx.fillRect(-11, 6, 6, 16);
    ctx.fillStyle = woodLite;
    ctx.fillRect(-11, 6, 2, 16);
    ctx.fillStyle = gold;
    ctx.beginPath();
    ctx.moveTo(-12, 6);
    ctx.lineTo(-8, 1);
    ctx.lineTo(-4, 6);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = wood;
    ctx.fillRect(-6, 15, 16, 7);
    ctx.fillStyle = woodLite;
    ctx.fillRect(-6, 15, 16, 2);
    ctx.fillStyle = goldDeep;
    ctx.fillRect(-2, 17, 2, 2);
    ctx.fillRect(4, 17, 2, 2);

    ctx.fillStyle = robe;
    ctx.beginPath();
    ctx.moveTo(-4, 8);
    ctx.lineTo(-5, 18);
    ctx.lineTo(8, 18);
    ctx.lineTo(5, 8);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = gold;
    ctx.fillRect(-4, 12, 9, 2);
    ctx.fillStyle = goldLite;
    ctx.fillRect(-4, 12, 9, 1);

    ctx.fillStyle = skin;
    ctx.beginPath();
    ctx.arc(1, 8, 4.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(4, 6.5);
    ctx.lineTo(8, 8.5);
    ctx.lineTo(4, 10);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = beard;
    ctx.beginPath();
    ctx.moveTo(-1, 9);
    ctx.lineTo(6, 10);
    ctx.lineTo(3, 15);
    ctx.lineTo(-2, 12);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#241c14";
    ctx.fillRect(2, 6, 2, 2);

    ctx.fillStyle = goldDeep;
    ctx.fillRect(-3, 3, 9, 3);
    ctx.fillStyle = gold;
    ctx.fillRect(-3, 2, 9, 2);
    ctx.fillStyle = goldLite;
    ctx.fillRect(-3, 2, 9, 1);
    ctx.fillStyle = gold;
    ctx.beginPath();
    ctx.moveTo(-3, 3);
    ctx.lineTo(-1, 0);
    ctx.lineTo(1, 3);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(1, 3);
    ctx.lineTo(4, 0);
    ctx.lineTo(6, 3);
    ctx.fill();
    ctx.fillStyle = "#2a4178";
    ctx.fillRect(1, 3, 2, 2);

    ctx.strokeStyle = goldDeep;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(6, 13);
    ctx.lineTo(11, 6);
    ctx.stroke();
    ctx.fillStyle = gold;
    ctx.beginPath();
    ctx.arc(11, 5, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = goldLite;
    ctx.beginPath();
    ctx.arc(10.4, 4.4, 0.7, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  function woodPost(ctx, x0, y0, x1, y1) {
    ctx.strokeStyle = "#3a2618";
    ctx.lineWidth = 4.2;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();
    ctx.strokeStyle = "#8a5a34";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x0 - 0.6, y0);
    ctx.lineTo(x1 - 0.6, y1);
    ctx.stroke();
  }

  function paintTower(ctx, block) {
    const s = block.w;
    ctx.lineCap = "butt";
    ctx.lineJoin = "miter";
    woodPost(ctx, 3, s, 8, 4);
    woodPost(ctx, s - 3, s, s - 8, 4);

    ctx.strokeStyle = "#5a3b24";
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.moveTo(7, 9);
    ctx.lineTo(s - 7, 9);
    ctx.moveTo(6, 3.5);
    ctx.lineTo(s - 6, 3.5);
    ctx.stroke();
    ctx.strokeStyle = "#c49a6a";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(7, 8);
    ctx.lineTo(s - 7, 8);
    ctx.stroke();

    ctx.strokeStyle = "#6b4630";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(8, 8);
    ctx.lineTo(s - 9, 3.5);
    ctx.moveTo(s - 8, 8);
    ctx.lineTo(9, 3.5);
    ctx.stroke();

    ctx.strokeStyle = "#2a241c";
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(s / 2, 3.2);
    ctx.lineTo(s / 2, 8.6);
    ctx.stroke();

    ctx.fillStyle = "#6d5138";
    ctx.fillRect(s / 2 - 3, 5.4, 6, 3.4);
    ctx.fillStyle = "#2a2118";
    ctx.fillRect(s / 2 - 3, 7.2, 6, 1);

    if (!block.covered) {
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(s / 2, -13);
      ctx.lineTo(2, 6);
      ctx.lineTo(s - 2, 6);
      ctx.closePath();
      ctx.clip();
      for (let i = 0, y = -13; y < 6; y += 3, i++) {
        ctx.fillStyle = i % 2 ? "#6a3e2c" : "#8d5340";
        ctx.fillRect(0, y, s, 3);
      }
      ctx.restore();
      ctx.strokeStyle = "#3a241c";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(s / 2, -13);
      ctx.lineTo(2, 6);
      ctx.lineTo(s - 2, 6);
      ctx.closePath();
      ctx.stroke();
    }

    ctx.strokeStyle = "#1a1612";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(s / 2, 1.5, 3.4, 0, Math.PI * 2);
    ctx.stroke();
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(s / 2 - 2.4, 1.5);
    ctx.lineTo(s / 2 + 2.4, 1.5);
    ctx.moveTo(s / 2, -0.8);
    ctx.lineTo(s / 2, 3.8);
    ctx.stroke();
    ctx.fillStyle = "#d7dee4";
    ctx.beginPath();
    ctx.arc(s / 2, 1.5, 0.9, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#1c140e";
    for (const point of [[8, 4], [s - 8, 4], [7, 9], [s - 7, 9], [3, s - 1], [s - 3, s - 1]]) {
      ctx.beginPath();
      ctx.arc(point[0], point[1], 1.15, 0, Math.PI * 2);
      ctx.fill();
    }

    if (block.r === 0) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, s - 3, 8, 3);
      ctx.rect(s - 8, s - 3, 8, 3);
      ctx.clip();
      fillStones(ctx, block, WALL, 4);
      ctx.restore();
      ctx.strokeStyle = WALL.edge;
      ctx.lineWidth = 1;
      ctx.strokeRect(0.5, s - 2.5, 7, 2);
      ctx.strokeRect(s - 7.5, s - 2.5, 7, 2);
    }
  }

  function roundWheel(ctx, x, y, radius, light) {
    ctx.fillStyle = "#241910";
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = light;
    ctx.beginPath();
    ctx.arc(x, y, radius - 2.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#241910";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x - radius + 2, y);
    ctx.lineTo(x + radius - 2, y);
    ctx.moveTo(x, y - radius + 2);
    ctx.lineTo(x, y + radius - 2);
    ctx.stroke();
    ctx.fillStyle = "#1a140e";
    ctx.beginPath();
    ctx.arc(x, y, 1.3, 0, Math.PI * 2);
    ctx.fill();
  }

  function paintCannon(ctx, block, castle) {
    const s = block.w;
    const pose = B.cannonLocal(block, castle);
    const pierW = 6;
    const plinth = new Path2D();
    plinth.rect(-1, s - 6, s + 2, 6);
    ctx.__castle = castle;
    const mount = castle.style === "kremlin" ? WALL : PALACE;
    fillClipped(ctx, block, castle, plinth, mount, 3);
    if (block.covered && castle.style !== "kremlin") {
      const lintel = new Path2D();
      lintel.rect(0, 0, s, 4);
      fillClipped(ctx, block, castle, lintel, mount, 3);
      ctx.fillStyle = "rgba(28, 18, 12, 0.4)";
      ctx.fillRect(pose.dir === 1 ? pierW : 0, 3, s - pierW, 1.5);
    }

    const wheelY = s - 5;
    const wheelX = pose.dir === 1 ? s - 11 : 11;
    ctx.fillStyle = "#6b4428";
    ctx.beginPath();
    ctx.moveTo(pose.cx, pose.cy + 2);
    ctx.lineTo(wheelX, wheelY - 3);
    ctx.lineTo(wheelX, wheelY + 1);
    ctx.lineTo(pose.cx, pose.cy + 6);
    ctx.closePath();
    ctx.fill();
    const bedX = pose.dir === 1 ? pierW + 1 : 5;
    ctx.fillRect(bedX, s - 12, s - pierW - 6, 6);
    ctx.strokeStyle = "#3e2918";
    ctx.lineWidth = 1;
    ctx.strokeRect(bedX + 0.5, s - 11.5, s - pierW - 7, 5);

    roundWheel(ctx, pose.dir === 1 ? wheelX - 6 : wheelX + 6, wheelY, 3.4, "#6d4c30");
    roundWheel(ctx, wheelX, wheelY, 4.8, "#a36d42");

    const stackX = pose.dir === 1 ? pierW + 3 : s - pierW - 4;
    paintMiniRocket(ctx, stackX, s - 8, pose.dir);
    paintMiniRocket(ctx, stackX + pose.dir * 8, s - 8, pose.dir);

    ctx.save();
    ctx.translate(pose.cx, pose.cy);
    ctx.rotate(pose.dir === 1 ? -pose.elev : Math.PI + pose.elev);
    const tube = pose.len - 2;
    ctx.fillStyle = "#3e4a34";
    ctx.fillRect(0, -4.2, tube, 8.4);
    ctx.fillStyle = "#73825c";
    ctx.fillRect(0, -4.2, tube, 2.1);
    ctx.fillStyle = "#2a3324";
    ctx.fillRect(0, 2.2, tube, 2);
    ctx.fillStyle = "#1a2016";
    for (let band = 7; band < tube - 8; band += 9) ctx.fillRect(band, -4.2, 1.5, 8.4);
    ctx.fillStyle = "#242c20";
    ctx.fillRect(tube - 7, -5.1, 7, 10.2);
    ctx.fillStyle = "#a3ad86";
    ctx.fillRect(tube - 7, -5.1, 7, 1.6);
    ctx.fillStyle = "#10140e";
    ctx.fillRect(tube - 5, -2.4, 4, 4.8);
    ctx.fillStyle = "#c5ced4";
    ctx.fillRect(6, -1.6, tube - 18, 3.2);
    ctx.fillStyle = "#f4f7f8";
    ctx.fillRect(6, -1.6, tube - 18, 1);
    ctx.fillStyle = "#d4552a";
    ctx.beginPath();
    ctx.moveTo(tube - 12, -1.7);
    ctx.lineTo(tube - 4.2, 0);
    ctx.lineTo(tube - 12, 1.7);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#3a2a22";
    ctx.beginPath();
    ctx.moveTo(6, -1.5);
    ctx.lineTo(3.2, -3.2);
    ctx.lineTo(7, 0);
    ctx.lineTo(3.2, 3.2);
    ctx.lineTo(6, 1.5);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#12160f";
    ctx.fillRect(0.8, -2.2, 3.4, 4.4);
    ctx.strokeStyle = "#241c14";
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(10, -4.2);
    ctx.lineTo(10, -7.2);
    ctx.lineTo(16, -7.2);
    ctx.stroke();
    ctx.fillStyle = "#e6d7b0";
    ctx.fillRect(15.2, -8, 2.2, 1.6);
    ctx.fillStyle = "#5a3a24";
    ctx.fillRect(8, 4.2, 3.2, 3.6);
    ctx.restore();

    ctx.fillStyle = "#2c3828";
    ctx.beginPath();
    ctx.arc(pose.cx, pose.cy, 3.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#c5d0a4";
    ctx.beginPath();
    ctx.arc(pose.cx - 0.8, pose.cy - 0.9, 0.9, 0, Math.PI * 2);
    ctx.fill();
  }

  function paintMiniRocket(ctx, x, y, dir) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(dir, 1);
    ctx.fillStyle = "#d5dee6";
    ctx.fillRect(0, -1.3, 6.5, 2.6);
    ctx.fillStyle = "#f7fafc";
    ctx.fillRect(0, -1.3, 6.5, 0.8);
    ctx.fillStyle = "#d4552a";
    ctx.beginPath();
    ctx.moveTo(6.5, -1.3);
    ctx.lineTo(9, 0);
    ctx.lineTo(6.5, 1.3);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#3a2a22";
    ctx.beginPath();
    ctx.moveTo(0.4, -1.2);
    ctx.lineTo(-1.6, -2.4);
    ctx.lineTo(1.2, 0);
    ctx.lineTo(-1.6, 2.4);
    ctx.lineTo(0.4, 1.2);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function drawRocket(ctx, x, y, ang, time, sam) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(ang);
    const flick = 0.82 + Math.sin(time * 0.05) * 0.28;
    const glow = ctx.createRadialGradient(-9, 0, 1, -9, 0, 14);
    glow.addColorStop(0, sam ? "rgba(244, 251, 255, 0.95)" : "rgba(255, 236, 170, 0.95)");
    glow.addColorStop(0.4, sam ? "rgba(120, 176, 235, 0.75)" : "rgba(255, 110, 24, 0.7)");
    glow.addColorStop(1, sam ? "rgba(40, 110, 200, 0)" : "rgba(255, 60, 10, 0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(-9, 0, 13 * flick, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = sam ? "#d7e8ff" : "#ff4a10";
    ctx.beginPath();
    ctx.moveTo(-5, 0);
    ctx.lineTo(-16 * flick, -3.6);
    ctx.lineTo(-10, 0);
    ctx.lineTo(-16 * flick, 3.6);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = sam ? "#f7fbff" : "#ffb03a";
    ctx.beginPath();
    ctx.moveTo(-5, 0);
    ctx.lineTo(-11 * flick, -1.8);
    ctx.lineTo(-8, 0);
    ctx.lineTo(-11 * flick, 1.8);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = sam ? "#ffffff" : "#fff6d0";
    ctx.beginPath();
    ctx.moveTo(-5, 0);
    ctx.lineTo(-8, -0.8);
    ctx.lineTo(-8, 0.8);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#7a2820";
    ctx.beginPath();
    ctx.moveTo(-4, -1.7);
    ctx.lineTo(-7.5, -4.4);
    ctx.lineTo(-1.2, -1.7);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-4, 1.7);
    ctx.lineTo(-7.5, 4.4);
    ctx.lineTo(-1.2, 1.7);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = sam ? "#e7eef4" : "#d5dee6";
    ctx.fillRect(-4, -2.3, 11, 4.6);
    ctx.fillStyle = sam ? "#ffffff" : "#f7fafc";
    ctx.fillRect(-4, -2.3, 11, 1.3);
    ctx.fillStyle = sam ? "#2c74c8" : "#d4552a";
    ctx.fillRect(2.4, -2.3, 2.2, 4.6);
    ctx.fillStyle = sam ? "#d7e6f5" : "#e25a28";
    ctx.beginPath();
    ctx.moveTo(7, -2.3);
    ctx.lineTo(13.5, 0);
    ctx.lineTo(7, 2.3);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = sam ? "#ffffff" : "#ffd0b0";
    ctx.beginPath();
    ctx.moveTo(7, -2.3);
    ctx.lineTo(10.4, -0.35);
    ctx.lineTo(7, -0.2);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function paintBits(ctx, bits) {
    const rank = { smoke: 0, fire: 1, spark: 2, flash: 3, ring: 4 };
    const ordered = bits.slice().sort(function (a, c) {
      return (rank[a.kind] || 2) - (rank[c.kind] || 2);
    });
    for (const bit of ordered) {
      const haze = bit.kind === "smoke" ? 0.62 : 1;
      ctx.globalAlpha = Math.max(0, Math.min(1, bit.life * haze));
      if (bit.kind === "ring") {
        ctx.strokeStyle = bit.color;
        ctx.lineWidth = bit.width == null ? 3 : bit.width;
        ctx.beginPath();
        ctx.arc(bit.x, bit.y, Math.max(1, bit.size), 0, Math.PI * 2);
        ctx.stroke();
      } else if (bit.kind === "flash") {
        const radius = Math.max(1, bit.size);
        const glow = ctx.createRadialGradient(bit.x, bit.y, 0, bit.x, bit.y, radius);
        glow.addColorStop(0, "#ffffff");
        glow.addColorStop(0.22, "#ffe7a0");
        glow.addColorStop(0.55, "rgba(255, 120, 30, 0.7)");
        glow.addColorStop(1, "rgba(255, 60, 10, 0)");
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(bit.x, bit.y, radius, 0, Math.PI * 2);
        ctx.fill();
      } else if (bit.kind === "spark") {
        ctx.fillStyle = bit.color;
        ctx.fillRect(bit.x, bit.y, bit.size, bit.size);
      } else {
        const radius = Math.max(0.8, bit.size);
        const glow = ctx.createRadialGradient(bit.x, bit.y, radius * 0.2, bit.x, bit.y, radius);
        glow.addColorStop(0, bit.color);
        glow.addColorStop(1, bit.kind === "smoke" ? "rgba(70,64,58,0)" : "rgba(255,70,10,0)");
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(bit.x, bit.y, radius, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
  }

  const BRICK = {
    mortar: "#5a221e",
    tones: ["#a33b34", "#8d302b", "#b84b40", "#7a2824", "#c45c4c", "#96342e"],
    light: "#f4efe4",
    edge: "#3c1412",
    star: "#d3222a",
  };

  const BRICK_BLUE = {
    mortar: "#1e2a52",
    tones: ["#3b5aa3", "#2b4a8d", "#4064b8", "#24407a", "#4c6cc4", "#2e5096"],
    light: "#dce6f4",
    edge: "#121c3c",
    star: "#3a6fd0",
  };

  function brickOf(castle) {
    return castle && castle.brick === "blue" ? BRICK_BLUE : BRICK;
  }

  function fillBricks(ctx, block, salt, brick) {
    brick = brick || BRICK;
    const s = block.w;
    ctx.fillStyle = brick.mortar;
    ctx.fillRect(-12, -52, s + 24, s + 80);
    const bh = 4;
    const bw = 8;
    for (let row = -14; row < 16; row++) {
      const y = row * bh;
      const offset = ((block.r * 7 + row) % 2) * 4;
      for (let n = -2; n < 6; n++) {
        const x = n * (bw + 1) + offset - 4;
        const tone = hash(salt + (block.r * 7 + row) * 97 + (block.c * 5 + n) * 13);
        ctx.fillStyle = brick.tones[Math.floor(tone * brick.tones.length)];
        ctx.fillRect(x, y, bw, bh - 1);
      }
    }
  }

  function fillClippedBricks(ctx, block, path, salt, brick) {
    ctx.save();
    ctx.clip(path);
    fillBricks(ctx, block, salt, brick);
    shade(ctx, block);
    ctx.restore();
  }

  function curtainPath(s) {
    const path = new Path2D();
    const left = 4;
    const right = s - 4;
    const mid = s / 2;
    const base = 13;
    path.moveTo(0, base);
    path.lineTo(left, base);
    path.lineTo(left, 3);
    path.lineTo(left + 3.5, 0);
    path.lineTo(mid, 9);
    path.lineTo(right - 3.5, 0);
    path.lineTo(right, 3);
    path.lineTo(right, base);
    path.lineTo(s, base);
    path.lineTo(s, s);
    path.lineTo(0, s);
    path.closePath();
    return path;
  }

  function paintWhiteFoot(ctx, s, brick) {
    ctx.fillStyle = brick.light;
    ctx.fillRect(-1, s - 6, s + 2, 6);
    ctx.fillStyle = "#d5cbb8";
    ctx.fillRect(-1, s - 2, s + 2, 2);
  }

  function paintTowerQuoins(ctx, s, brick) {
    ctx.fillStyle = brick.light;
    for (let y = 2; y < s - 6; y += 7) {
      ctx.fillRect(-1, y, 3, 4);
      ctx.fillRect(s - 2, y, 3, 4);
    }
  }

  function paintGallery(ctx, s, brick) {
    ctx.fillStyle = brick.light;
    ctx.fillRect(-1, 0, s + 2, 8);
    ctx.fillStyle = "#d9d0c0";
    ctx.fillRect(-1, 7, s + 2, 1.2);
    ctx.fillStyle = "#241816";
    for (let i = 0; i < 3; i++) {
      const x = 3.2 + i * 8;
      ctx.beginPath();
      ctx.arc(x + 2.1, 6.4, 2, Math.PI, 0);
      ctx.fill();
    }
  }

  function paintClock(ctx, s) {
    const cx = s / 2;
    const cy = 18;
    ctx.fillStyle = "#f7f3e8";
    ctx.beginPath();
    ctx.arc(cx, cy, 6.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#e0b45a";
    ctx.lineWidth = 1.3;
    ctx.stroke();
    ctx.fillStyle = "#1c140e";
    for (let i = 0; i < 4; i++) {
      const a = i * Math.PI / 2;
      ctx.fillRect(cx + Math.sin(a) * 4.4 - 0.5, cy - Math.cos(a) * 4.4 - 0.5, 1, 1);
    }
    ctx.strokeStyle = "#1c140e";
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + 2.4, cy - 2.2);
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx - 0.6, cy - 4.2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, cy, 0.8, 0, Math.PI * 2);
    ctx.fill();
  }

  function paintKremlinWindow(ctx, s, y, brick) {
    ctx.fillStyle = "#1a1210";
    ctx.beginPath();
    ctx.moveTo(s / 2 - 3, y + 8);
    ctx.lineTo(s / 2 - 3, y + 3);
    ctx.arc(s / 2, y + 3, 3, Math.PI, 0);
    ctx.lineTo(s / 2 + 3, y + 8);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = brick.light;
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  function paintKremlinGate(ctx, s, brick) {
    const radius = s / 2 - 5;
    ctx.fillStyle = "#140c0a";
    ctx.beginPath();
    ctx.moveTo(5, s - 5);
    ctx.lineTo(5, s - 16);
    ctx.arc(s / 2, s - 16, radius, Math.PI, 0);
    ctx.lineTo(s - 5, s - 5);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = brick.light;
    ctx.lineWidth = 1.3;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(s / 2, s - 16 - radius);
    ctx.lineTo(s / 2, s - 6);
    ctx.moveTo(6, s - 10);
    ctx.lineTo(s - 6, s - 10);
    ctx.stroke();
  }

  function paintStar(ctx, x, y, r, color) {
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const ang = -Math.PI / 2 + i * Math.PI / 5;
      const rad = i % 2 === 0 ? r : r * 0.4;
      const px = x + Math.cos(ang) * rad;
      const py = y + Math.sin(ang) * rad;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fillStyle = color || "#d3222a";
    ctx.fill();
    ctx.strokeStyle = "#f3d78a";
    ctx.lineWidth = 0.7;
    ctx.stroke();
  }

  function paintTent(ctx, s, peak, brick) {
    ctx.beginPath();
    ctx.moveTo(s / 2, peak);
    ctx.lineTo(s + 1, 2);
    ctx.lineTo(-1, 2);
    ctx.closePath();
    ctx.save();
    ctx.clip();
    for (let band = 0, y = peak; y < 4; y += 3.2, band++) {
      ctx.fillStyle = band % 2 ? "#176348" : "#2f8f64";
      ctx.fillRect(-4, y, s + 8, 3.2);
    }
    ctx.fillStyle = "rgba(214, 244, 224, 0.35)";
    ctx.beginPath();
    ctx.moveTo(s / 2, peak);
    ctx.lineTo(s / 2 + 3, 2);
    ctx.lineTo(2, 2);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    ctx.strokeStyle = "#0c3024";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(s / 2, peak);
    ctx.lineTo(s + 1, 2);
    ctx.lineTo(-1, 2);
    ctx.closePath();
    ctx.stroke();
    ctx.fillStyle = (brick || BRICK).light;
    ctx.fillRect(-2, 0, s + 4, 3);
    ctx.fillStyle = "#c9bfa8";
    ctx.fillRect(-2, 2.2, s + 4, 1);
  }

  function paintKremlinWall(ctx, block, castle) {
    const s = block.w;
    const brick = brickOf(castle);
    const role = castle.kremlinTowers && castle.kremlinTowers[block.c];
    const top = !block.covered;
    const path = new Path2D();
    if (role) path.rect(-1, 0, s + 2, s);
    else if (top) {
      const merlon = curtainPath(s);
      path.addPath(merlon);
    } else path.rect(0, 0, s, s);
    if (block.r === 0) path.rect(-1, s - 5, s + 2, 6);
    fillClippedBricks(ctx, block, path, 5, brick);
    ctx.save();
    ctx.clip(path);
    if (role) paintTowerQuoins(ctx, s, brick);
    if (block.r === 0) paintWhiteFoot(ctx, s, brick);
    if (block.c === (castle.gateCol || 0) && block.r === 0) paintKremlinGate(ctx, s, brick);
    else if (top && role) {
      paintGallery(ctx, s, brick);
      if (role === "great") paintClock(ctx, s);
    } else if (role) paintKremlinWindow(ctx, s, block.r === 0 ? 6 : 8, brick);
    else if (!top) paintKremlinWindow(ctx, s, 6, brick);
    ctx.restore();
    if (top && !role) {
      ctx.strokeStyle = brick.light;
      ctx.lineWidth = 1.15;
      ctx.stroke(path);
    }
    ctx.strokeStyle = brick.edge;
    ctx.lineWidth = 1;
    ctx.stroke(path);
    if (top && role) {
      const peak = role === "great" ? -42 : -28;
      paintTent(ctx, s, peak, brick);
      paintStar(ctx, s / 2, peak, role === "great" ? 4.7 : 3.5, brick.star);
    }
  }

  function paintBunkerShell(ctx, castle) {
    if (castle.style !== "kremlin") return;
    const keep = castle.blocks.find((block) => block.type === "keep");
    if (!keep) return;
    const bunker = B.BUNKER;
    const x = keep.x - bunker.chamberSide;
    const y = keep.y - bunker.chamberHead;
    const w = keep.w + bunker.chamberSide * 2;
    const h = bunker.chamberHead + keep.h + bunker.chamberFoot;
    const shaftW = bunker.shaftW;
    const shaftX = keep.x + (keep.w - shaftW) / 2;
    const shaftTop = castle.padY - 8;
    const holeX = shaftX + 4;
    const holeW = shaftW - 8;

    ctx.save();
    ctx.fillStyle = "#3a4a28";
    ctx.fillRect(shaftX - 3, shaftTop, shaftW + 6, y - shaftTop);
    ctx.fillStyle = "#6d726c";
    ctx.fillRect(shaftX, shaftTop, shaftW, y - shaftTop);
    ctx.fillStyle = "#2a2f2d";
    ctx.fillRect(holeX, shaftTop, holeW, y - shaftTop + 8);
    ctx.fillStyle = "#4e5550";
    for (let rib = shaftTop + 16; rib < y - 6; rib += 14) {
      ctx.fillRect(shaftX, rib, 4, 2);
      ctx.fillRect(shaftX + shaftW - 4, rib, 4, 2);
    }

    ctx.fillStyle = "#3a4a28";
    ctx.fillRect(x - 3, y - 2, w + 6, h + 5);
    ctx.fillStyle = "#6d726c";
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = "#2a2f2d";
    ctx.fillRect(x + 5, y + 7, w - 10, h - 12);
    ctx.fillStyle = "#8d8678";
    ctx.fillRect(x, y, w, 7);
    ctx.fillStyle = "#f4efe4";
    ctx.fillRect(x, y, w, 1.4);
    ctx.fillStyle = "#3e3a34";
    for (let i = 10; i < w - 6; i += 11) {
      const tick = x + i;
      if (tick + 2 > holeX && tick < holeX + holeW) continue;
      ctx.fillRect(tick, y + 4, 2, 6);
    }
    ctx.fillStyle = "#2a2f2d";
    ctx.fillRect(holeX, y, holeW, 10);
    ctx.strokeStyle = "#c4b48a";
    ctx.lineWidth = 1;
    ctx.strokeRect(holeX - 1, y + 1, holeW + 2, 8);

    const railL = holeX + 1;
    const railR = holeX + holeW - 2;
    ctx.strokeStyle = "#a89878";
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(railL, shaftTop + 4);
    ctx.lineTo(railL, y + bunker.chamberHead - 2);
    ctx.moveTo(railR, shaftTop + 4);
    ctx.lineTo(railR, y + bunker.chamberHead - 2);
    ctx.stroke();
    for (let ly = shaftTop + 10; ly < y + bunker.chamberHead - 2; ly += 5) {
      ctx.beginPath();
      ctx.moveTo(railL, ly);
      ctx.lineTo(railR, ly);
      ctx.stroke();
    }

    ctx.fillStyle = "#f2d48a";
    ctx.beginPath();
    ctx.arc(x + w - 16, y + 14, 1.7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#5c574e";
    ctx.fillRect(x + 5, y + h - 8, w - 10, 4);
    ctx.restore();
  }

  function paintHouse(ctx, block) {
    const w = block.w;
    const h = block.h;
    const tone = hash(block.x * 3 + 11);
    const walls = ["#ddd4c2", "#cfc6b4", "#d7d6c4", "#e3d6b0"];
    const wall = walls[Math.floor(tone * walls.length)];
    const seam = "#8d8474";
    const glass = "#1c2a34";
    const frame = "#f3eee4";
    const balconyBay = tone > 0.5 ? 0 : 2;
    const roofH = 5;
    const baseH = 4;
    const bodyTop = roofH;
    const bodyH = h - roofH - baseH;
    const floorH = Math.floor(bodyH / 4);
    const groundExtra = bodyH - floorH * 4;
    const winW = 7;
    const winH = 6;

    ctx.fillStyle = "#4e4840";
    ctx.fillRect(-1, roofH - 2, w + 2, 3);
    ctx.fillStyle = "#3c3832";
    ctx.fillRect(0, 0, w, roofH);
    ctx.fillStyle = "#2e2a26";
    ctx.fillRect(0, 0, w, 1);
    ctx.fillStyle = "#6a6458";
    ctx.fillRect(w * 0.62, 1, 4, 3);

    if (!block.hits) {
      ctx.strokeStyle = "#2a261f";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(w * 0.28, 0);
      ctx.lineTo(w * 0.28, -7);
      ctx.moveTo(w * 0.28 - 4, -5);
      ctx.lineTo(w * 0.28 + 4, -7);
      ctx.moveTo(w * 0.28 - 3, -3);
      ctx.lineTo(w * 0.28 + 3, -5);
      ctx.stroke();
    }

    ctx.fillStyle = wall;
    ctx.fillRect(0, bodyTop, w, bodyH);
    ctx.fillStyle = "rgba(255,248,236,0.28)";
    ctx.fillRect(0, bodyTop, 1, bodyH);
    ctx.fillStyle = "rgba(36,28,20,0.22)";
    ctx.fillRect(w - 2, bodyTop, 2, bodyH);

    ctx.fillStyle = seam;
    ctx.fillRect(Math.round(w / 3), bodyTop, 1, bodyH);
    ctx.fillRect(Math.round((2 * w) / 3), bodyTop, 1, bodyH);

    let y = bodyTop;
    for (let floor = 0; floor < 4; floor++) {
      const fh = floor === 3 ? floorH + groundExtra : floorH;
      if (floor > 0) {
        ctx.fillStyle = seam;
        ctx.fillRect(0, y, w, 1);
      }
      const ground = floor === 3;
      for (let bay = 0; bay < 3; bay++) {
        const cx = Math.round(((bay + 0.5) * w) / 3);
        if (ground && bay === 1) {
          const doorW = 8;
          const doorH = 11;
          const doorX = cx - doorW / 2;
          const doorY = y + fh - doorH;
          ctx.fillStyle = "#5c564c";
          ctx.fillRect(doorX - 2, doorY - 2, doorW + 4, 2);
          ctx.fillStyle = "#2a241c";
          ctx.fillRect(doorX, doorY, doorW, doorH);
          ctx.fillStyle = "#c4b48a";
          ctx.fillRect(doorX + doorW - 3, doorY + 5, 1, 1);
          continue;
        }
        const wx = cx - Math.floor(winW / 2);
        const wy = y + (ground ? 3 : 2);
        if (!ground && bay === balconyBay) {
          ctx.fillStyle = "#b9b2a4";
          ctx.fillRect(wx - 2, wy + winH, winW + 4, 2);
          ctx.fillStyle = "#5e584e";
          ctx.fillRect(wx - 2, wy - 1, 1, winH + 3);
          ctx.fillRect(wx + winW + 1, wy - 1, 1, winH + 3);
          ctx.fillRect(wx - 2, wy + 2, winW + 4, 1);
        }
        ctx.fillStyle = frame;
        ctx.fillRect(wx - 1, wy - 1, winW + 2, winH + 2);
        ctx.fillStyle = glass;
        ctx.fillRect(wx, wy, winW, winH);
        ctx.fillStyle = frame;
        ctx.fillRect(wx + 3, wy, 1, winH);
        ctx.fillRect(wx, wy + 2, winW, 1);
        if (hash(block.x + floor * 17 + bay * 5) > 0.78) {
          ctx.fillStyle = "#f6f1e6";
          ctx.fillRect(wx, wy, 2, winH);
        }
      }
      y += fh;
    }

    ctx.fillStyle = "#6a6358";
    ctx.fillRect(0, h - baseH, w, baseH);
    ctx.fillStyle = "#514c44";
    ctx.fillRect(0, h - 2, w, 2);

    const hits = block.hits || 0;
    if (!hits) return;

    function scorch(x, y, rw, rh, alpha) {
      ctx.fillStyle = "rgba(24,18,14," + alpha + ")";
      ctx.fillRect(x, y, rw, rh);
    }
    function punch(x, y, rw, rh) {
      ctx.save();
      ctx.globalCompositeOperation = "destination-out";
      ctx.fillStyle = "#000";
      ctx.fillRect(x, y, rw, rh);
      ctx.restore();
    }
    function breakWindow(floor, bay) {
      const wy = bodyTop + floor * floorH + (floor === 3 ? 3 : 2);
      const cx = Math.round(((bay + 0.5) * w) / 3);
      punch(cx - Math.floor(winW / 2) - 1, wy - 1, winW + 2, winH + 2);
    }

    scorch(2, bodyTop, 20, 16, 0.55);
    if (hits >= 2) {
      scorch(w * 0.35, bodyTop + floorH, w * 0.6, floorH * 2, 0.5);
      scorch(Math.round(w / 2) - 6, h - baseH - 14, 10, 12, 0.7);
    }
    if (hits >= 3) scorch(0, bodyTop, w, bodyH, 0.45);

    ctx.strokeStyle = "#1a1612";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(14, bodyTop + 4);
    ctx.lineTo(18, bodyTop + 18);
    ctx.lineTo(15, bodyTop + 28);
    ctx.stroke();

    breakWindow(0, 0);
    breakWindow(1, 2);
    breakWindow(2, 0);
    if (hits >= 2) {
      breakWindow(0, 1);
      breakWindow(0, 2);
      breakWindow(1, 0);
      breakWindow(1, 1);
      breakWindow(2, 1);
      punch(w - 18, -2, 20, 18);
      punch(16, bodyTop + floorH + 2, 12, 14);
    }
    if (hits >= 3) {
      punch(-2, -8, w * 0.7, 14);
      punch(w - 18, bodyTop, 20, floorH * 3);
      punch(8, bodyTop + floorH, 18, floorH * 2);
      breakWindow(2, 2);
      breakWindow(3, 0);
      breakWindow(3, 2);
      ctx.fillStyle = "#5c564c";
      ctx.fillRect(1, h - 12, 16, 8);
      ctx.fillStyle = "#3e3830";
      ctx.fillRect(6, h - 16, 10, 6);
      ctx.fillRect(w - 18, h - 9, 14, 5);
    }
  }

  function paintPatriot(ctx, block) {
    const g = B.PATRIOT;
    const h = block.h;
    ctx.save();
    if (block.side !== "left") {
      ctx.translate(block.w, 0);
      ctx.scale(-1, 1);
    }
    ctx.lineJoin = "round";
    roundWheel(ctx, 22, h - 7, 6, "#5c5348");
    roundWheel(ctx, 78, h - 7, 6, "#5c5348");

    ctx.fillStyle = "#3c472c";
    ctx.fillRect(8, h - 22, 84, 14);
    ctx.fillStyle = "#667548";
    ctx.fillRect(8, h - 22, 84, 3);
    ctx.fillStyle = "#2a3320";
    ctx.fillRect(8, h - 10, 84, 2);

    ctx.fillStyle = "#4a5838";
    ctx.fillRect(8, h - 40, 22, 20);
    ctx.fillStyle = "#6d7c50";
    ctx.fillRect(8, h - 40, 22, 3);
    ctx.fillStyle = block.side === "left" ? "#e0a45a" : "#a33b34";
    ctx.fillRect(8, h - 34, 3, 14);
    ctx.fillStyle = "#d5e4ee";
    ctx.fillRect(13, h - 36, 12, 8);
    ctx.fillStyle = "#8fb4c8";
    ctx.fillRect(13, h - 36, 12, 2);
    ctx.strokeStyle = "#243044";
    ctx.lineWidth = 1;
    ctx.strokeRect(13.5, h - 35.5, 11, 7);

    ctx.strokeStyle = "#2a3320";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(18, h - 40);
    ctx.lineTo(18, 8);
    ctx.stroke();
    ctx.fillStyle = "#d7dee4";
    ctx.beginPath();
    ctx.ellipse(18, 8, 7, 4.2, -0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#8aa0ae";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = "#f4f8fb";
    ctx.beginPath();
    ctx.ellipse(16, 7, 2.2, 1.2, -0.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.translate(g.pivotX, g.pivotY);
    ctx.rotate(-(g.elev * Math.PI) / 180);
    ctx.fillStyle = "#2f3a24";
    ctx.fillRect(-8, -9, g.tube + 12, 18);
    ctx.fillStyle = "#5d6b42";
    ctx.fillRect(-8, -9, g.tube + 12, 4);
    ctx.strokeStyle = "#1c2416";
    ctx.lineWidth = 1;
    ctx.strokeRect(-8.5, -9.5, g.tube + 13, 19);
    for (let i = 0; i < 4; i++) {
      const y = -7 + i * 3.6;
      ctx.fillStyle = "#d5dee6";
      ctx.fillRect(2, y, g.tube - 4, 2.6);
      ctx.fillStyle = "#f7fafc";
      ctx.fillRect(2, y, g.tube - 4, 0.8);
      ctx.fillStyle = "#e7eef4";
      ctx.beginPath();
      ctx.moveTo(g.tube - 2, y);
      ctx.lineTo(g.tube + 3, y + 1.3);
      ctx.lineTo(g.tube - 2, y + 2.6);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#2c74c8";
      ctx.fillRect(g.tube - 8, y, 2, 2.6);
    }
    ctx.restore();
    ctx.restore();
  }

  function limb(ctx, x0, y0, x1, y1, width, color) {
    const dx = x1 - x0;
    const dy = y1 - y0;
    const len = Math.hypot(dx, dy) || 1;
    const px = (-dy / len) * width * 0.5;
    const py = (dx / len) * width * 0.5;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x0 + px, y0 + py);
    ctx.lineTo(x1 + px, y1 + py);
    ctx.lineTo(x1 - px, y1 - py);
    ctx.lineTo(x0 - px, y0 - py);
    ctx.closePath();
    ctx.fill();
  }

  function paintRig(ctx, block) {
    const w = block.w;
    const h = block.h;
    const steel = "#3e4c58";
    const steelLite = "#8ea0ae";
    const ink = "#1c242c";
    const foot = h - 6;

    ctx.fillStyle = "#3a3228";
    ctx.fillRect(1, foot, w - 2, 6);
    ctx.fillStyle = "#6a5a48";
    ctx.fillRect(1, foot, w - 2, 1.5);

    ctx.fillStyle = "#4a3428";
    ctx.fillRect(2, foot - 18, 16, 18);
    ctx.fillStyle = "#c4552a";
    ctx.fillRect(2, foot - 18, 16, 4);
    ctx.fillStyle = "#241c14";
    ctx.fillRect(4, foot - 12, 12, 1.4);
    ctx.fillRect(4, foot - 8, 12, 1.4);
    ctx.fillStyle = "#e6c56a";
    ctx.fillRect(4, foot - 12, 6, 1.4);
    ctx.fillRect(10, foot - 8, 6, 1.4);

    ctx.fillStyle = "#2a2118";
    ctx.beginPath();
    ctx.ellipse(w - 12, foot - 4, 9, 4.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#3a2618";
    ctx.beginPath();
    ctx.ellipse(w - 12, foot - 7, 9, 4.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#6a5344";
    ctx.beginPath();
    ctx.ellipse(w - 15, foot - 8.4, 3, 1.4, 0, 0, Math.PI * 2);
    ctx.fill();

    const top = 8;
    const mid = w * 0.5;
    limb(ctx, 7, foot, mid - 3, top, 3.4, steel);
    limb(ctx, w - 7, foot, mid + 3, top, 3.4, steel);
    limb(ctx, 7, foot, mid - 3, top, 1.3, steelLite);
    limb(ctx, w - 7, foot, mid + 3, top, 1.3, steelLite);
    for (let i = 1; i <= 4; i++) {
      const t = i / 5;
      const y = foot + (top - foot) * t;
      const half = (w * 0.36) * (1 - t) + 4;
      limb(ctx, mid - half, y, mid + half, y, 2.2, steel);
      if (i % 2) limb(ctx, mid - half, y, mid + half * 0.15, y - 12, 1.6, ink);
    }
    limb(ctx, mid, top + 2, mid, foot - 2, 2.4, "#1a120e");
    limb(ctx, mid, top + 2, mid, foot - 2, 0.8, "#5c4a38");

    ctx.fillStyle = steelLite;
    ctx.fillRect(mid - 8, 2, 16, 7);
    ctx.fillStyle = steel;
    ctx.fillRect(mid - 8, 2, 16, 2);
    ctx.fillStyle = "#e07a3d";
    ctx.beginPath();
    ctx.arc(mid, 5, 1.6, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#14110e";
    ctx.beginPath();
    ctx.ellipse(mid, foot - 1, 3.2, 1.5, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  function paintBlock(ctx, block, castle) {
    if (block.type === "house") paintHouse(ctx, block);
    else if (block.type === "patriot") paintPatriot(ctx, block);
    else if (block.type === "rig") paintRig(ctx, block);
    else if (block.type === "tower") paintTower(ctx, block);
    else if (block.type === "cannon") paintCannon(ctx, block, castle);
    else if (block.type === "keep") paintKing(ctx, block, castle);
    else if (castle.style === "kremlin") paintKremlinWall(ctx, block, castle);
    else paintWall(ctx, block, castle);
  }

  function copyCells(cells) {
    const copy = {};
    for (const key in cells) copy[key] = 1;
    return copy;
  }

  function cellBox(block, key) {
    const size = B.BALANCE.cell;
    const comma = key.indexOf(",");
    const cx = Number(key.slice(0, comma));
    const cy = Number(key.slice(comma + 1));
    return { x: block.x + cx * size, y: block.y + cy * size, w: size, h: size };
  }

  function rectHitsDisk(x, y, radius, box) {
    const nx = Math.max(box.x, Math.min(x, box.x + box.w));
    const ny = Math.max(box.y, Math.min(y, box.y + box.h));
    const dx = x - nx;
    const dy = y - ny;
    return dx * dx + dy * dy <= radius * radius;
  }

  function craterCovers(castle, box) {
    const craters = castle.terrain && castle.terrain.craters;
    if (!craters) return false;
    for (let i = 0; i < craters.length; i++) {
      const crater = craters[i];
      if (rectHitsDisk(crater.x, crater.y, crater.r, box)) return true;
    }
    return false;
  }

  function cellsFromAlpha(image, width, height) {
    const size = B.BALANCE.cell;
    const cells = {};
    const data = image.data;
    for (let py = 0; py < height; py++) {
      const row = py * width;
      for (let px = 0; px < width; px++) {
        if (data[(row + px) * 4 + 3] < ALPHA) continue;
        const cx = Math.floor((px - PAD) / size);
        const cy = Math.floor((py - PAD) / size);
        cells[cx + "," + cy] = 1;
      }
    }
    return cells;
  }

  function adoptCells(block, castle, scanned) {
    const next = {};
    if (!block.base) {
      block.base = scanned;
      if (block.live) {
        for (const key in block.live) if (scanned[key]) next[key] = 1;
        block.live = next;
      } else {
        block.live = copyCells(scanned);
      }
      return;
    }
    if (!block.live) {
      block.live = copyCells(scanned);
      block.base = scanned;
      return;
    }
    for (const key in scanned) {
      if (block.live[key]) next[key] = 1;
      else if (!block.base[key] && !craterCovers(castle, cellBox(block, key))) next[key] = 1;
    }
    block.live = next;
    block.base = scanned;
  }

  function bake(block, castle) {
    const canvas = document.createElement("canvas");
    canvas.width = block.w + PAD * 2;
    canvas.height = block.h + PAD * 2;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    ctx.save();
    ctx.translate(PAD, PAD);
    paintBlock(ctx, block, castle);
    ctx.restore();
    const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
    adoptCells(block, castle, cellsFromAlpha(image, canvas.width, canvas.height));
    const size = B.BALANCE.cell;
    ctx.globalCompositeOperation = "destination-out";
    ctx.fillStyle = "#000";
    for (const key in block.base) {
      if (block.live[key]) continue;
      const comma = key.indexOf(",");
      const cx = Number(key.slice(0, comma));
      const cy = Number(key.slice(comma + 1));
      const x = PAD + cx * size;
      const y = PAD + cy * size;
      if (x + size <= 0 || y + size <= 0 || x >= canvas.width || y >= canvas.height) continue;
      ctx.fillRect(x, y, size, size);
    }
    return {
      canvas,
      ox: block.x - PAD,
      oy: block.y - PAD,
    };
  }

  function boundsOf(block) {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const key in block.live) {
      const box = cellBox(block, key);
      if (box.x < minX) minX = box.x;
      if (box.y < minY) minY = box.y;
      if (box.x + box.w > maxX) maxX = box.x + box.w;
      if (box.y + box.h > maxY) maxY = box.y + box.h;
    }
    if (minX === Infinity) return null;
    return { minX, minY, maxX, maxY };
  }

  B.solidMask = function solidMask(block, castle) {
    if (block.type === "gap") return null;
    const elev = block.type === "cannon" ? castle.elevation : 0;
    const covered = block.covered ? 1 : 0;
    const hits = block.hits || 0;
    if (block._mask && block._maskElev === elev && block._maskCovered === covered && block._maskHits === hits) {
      if (!block._bounds) block._bounds = boundsOf(block);
      return block._mask;
    }
    block._mask = bake(block, castle);
    block._maskElev = elev;
    block._maskCovered = covered;
    block._maskHits = hits;
    block._bounds = boundsOf(block);
    return block._mask;
  };

  B.diskTouchesBlock = function diskTouchesBlock(block, x, y, radius) {
    for (const key in block.live) {
      if (rectHitsDisk(x, y, radius, cellBox(block, key))) return true;
    }
    return false;
  };

  B.carveBlock = function carveBlock(block, x, y, radius) {
    let removed = false;
    const next = {};
    for (const key in block.live) {
      if (rectHitsDisk(x, y, radius, cellBox(block, key))) removed = true;
      else next[key] = 1;
    }
    if (!removed) return false;
    block.live = next;
    block._mask = null;
    return true;
  };

  B.solidDistance = function solidDistance(x, y, radius, block, castle) {
    if (block.type === "gap") return Infinity;
    if (block.live && !B.hasCells(block.live)) return Infinity;
    B.solidMask(block, castle);
    const box = block._bounds;
    if (!box || !block.live) return Infinity;
    if (x + radius < box.minX || x - radius > box.maxX || y + radius < box.minY || y - radius > box.maxY) return Infinity;
    const limit = radius * radius;
    let best = Infinity;
    for (const key in block.live) {
      const cell = cellBox(block, key);
      const nx = Math.max(cell.x, Math.min(x, cell.x + cell.w));
      const ny = Math.max(cell.y, Math.min(y, cell.y + cell.h));
      const dx = x - nx;
      const dy = y - ny;
      const dist = dx * dx + dy * dy;
      if (dist <= limit && dist < best) best = dist;
    }
    return best;
  };

  function blit(ctx, block, castle) {
    if (block.type === "gap") return;
    if (block.live && !B.hasCells(block.live)) return;
    const mask = B.solidMask(block, castle);
    if (!mask || !B.hasCells(block.live)) return;
    const smoothing = ctx.imageSmoothingEnabled;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(mask.canvas, mask.ox, mask.oy);
    ctx.imageSmoothingEnabled = smoothing;
  }

  function drawDrone(ctx, x, y, ang, time) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(ang);
    ctx.scale(1.8, 1.8);
    const flick = 0.75 + Math.sin(time * 0.04) * 0.25;
    ctx.fillStyle = "rgba(255, 90, 40, " + (0.55 + flick * 0.35) + ")";
    ctx.beginPath();
    ctx.moveTo(-6, 0);
    ctx.lineTo(-16 * flick, -2.6);
    ctx.lineTo(-16 * flick, 2.6);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#2a241c";
    ctx.beginPath();
    ctx.moveTo(-4, 0);
    ctx.lineTo(3, -15);
    ctx.lineTo(7, -13);
    ctx.lineTo(2, -1.4);
    ctx.lineTo(7, 13);
    ctx.lineTo(3, 15);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#4a4036";
    ctx.beginPath();
    ctx.moveTo(-11, -3);
    ctx.lineTo(11, -3);
    ctx.lineTo(16, 0);
    ctx.lineTo(11, 3);
    ctx.lineTo(-11, 3);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#ff3b30";
    ctx.fillRect(3.5, -3, 4.2, 6);
    ctx.fillStyle = "#f4efe4";
    ctx.fillRect(-3, -2, 3.4, 1.7);
    ctx.restore();
  }

  function drawDroneFlight(ctx, path, index, time) {
    if (!path || !path.length || index < 0) return;
    const clamped = Math.max(0, Math.min(path.length - 1, index));
    const i0 = Math.min(path.length - 1, Math.floor(clamped));
    const i1 = Math.min(path.length - 1, i0 + 1);
    const t = clamped - i0;
    const a = path[i0];
    const c = path[i1];
    const back = path[Math.max(0, i0 - 2)];
    const fore = path[Math.min(path.length - 1, i0 + 2)];
    const ang = Math.atan2(fore.y - back.y, fore.x - back.x);
    drawDrone(ctx, a.x + (c.x - a.x) * t, a.y + (c.y - a.y) * t, ang, time);
  }

  function drawPuttyKnife(ctx, x, y, match) {
    if (x == null || y == null) return;
    const plan = B.wallPatchPlan ? B.wallPatchPlan(match.left, x, y) : null;
    ctx.save();
    if (plan) {
      if (plan.valid) {
        ctx.fillStyle = "rgba(247, 239, 194, 0.85)";
        for (let i = 0; i < plan.cells.length; i++) {
          const c = plan.cells[i];
          ctx.fillRect(c.x, c.y, c.w, c.h);
        }
        ctx.strokeStyle = "#5c8c28";
        ctx.lineWidth = 2;
        ctx.strokeRect(plan.x - 0.5, plan.y - 0.5, plan.w + 1, plan.h + 1);
      } else {
        ctx.fillStyle = "rgba(226, 59, 18, 0.24)";
        ctx.fillRect(plan.x, plan.y, plan.w, plan.h);
        ctx.strokeStyle = "rgba(255, 80, 50, 0.85)";
        ctx.lineWidth = 2;
        ctx.strokeRect(plan.x - 0.5, plan.y - 0.5, plan.w + 1, plan.h + 1);
      }
    }

    ctx.translate(x, y);
    ctx.rotate(Math.PI * 0.26);

    // Mortar bead along the leading scraping edge
    ctx.fillStyle = "#f4e8b4";
    ctx.fillRect(-3, -18, 6, 36);
    ctx.fillStyle = "#fff9e4";
    ctx.fillRect(-3, -17, 3, 34);

    // Flaring trapezoid steel blade
    ctx.beginPath();
    ctx.moveTo(0, -18);
    ctx.lineTo(44, -5.5);
    ctx.lineTo(52, -5.5);
    ctx.lineTo(52, 5.5);
    ctx.lineTo(44, 5.5);
    ctx.lineTo(0, 18);
    ctx.closePath();
    const bladeGrad = ctx.createLinearGradient(0, -18, 0, 18);
    bladeGrad.addColorStop(0, "#f2f6fa");
    bladeGrad.addColorStop(0.45, "#c8d4de");
    bladeGrad.addColorStop(1, "#85939e");
    ctx.fillStyle = bladeGrad;
    ctx.fill();
    ctx.strokeStyle = "#241c14";
    ctx.lineWidth = 2.4;
    ctx.stroke();

    // Bright bevel at scraping edge
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(1, -16.5, 3.5, 33);

    // Brass bolster ferrule
    ctx.fillStyle = "#d4a856";
    ctx.fillRect(50, -7.5, 10, 15);
    ctx.fillStyle = "#fff1c4";
    ctx.fillRect(50, -7.5, 10, 3);
    ctx.strokeStyle = "#241c14";
    ctx.lineWidth = 2.2;
    ctx.strokeRect(50, -7.5, 10, 15);

    // Wooden / lacquered handle
    ctx.beginPath();
    ctx.moveTo(60, -8.5);
    ctx.lineTo(104, -10.5);
    ctx.arc(104, 0, 10.5, -Math.PI / 2, Math.PI / 2);
    ctx.lineTo(60, 8.5);
    ctx.closePath();
    const handleGrad = ctx.createLinearGradient(60, -10, 60, 10);
    handleGrad.addColorStop(0, "#c44536");
    handleGrad.addColorStop(0.35, "#9d2c32");
    handleGrad.addColorStop(1, "#5a161b");
    ctx.fillStyle = handleGrad;
    ctx.fill();
    ctx.strokeStyle = "#241c14";
    ctx.lineWidth = 2.4;
    ctx.stroke();

    // Brass rivet & hanging hole
    ctx.fillStyle = "#e6c56a";
    ctx.beginPath();
    ctx.arc(72, 0, 2.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#241c14";
    ctx.beginPath();
    ctx.arc(102, 0, 3.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#d4a856";
    ctx.lineWidth = 1.4;
    ctx.stroke();

    ctx.restore();
  }

  function drawDroneRange(ctx, match) {
    const b = B.BALANCE;
    const home = B.droneHome(match.left);
    const limitX = home.x + B.droneRange(match.rulers.left);
    if (limitX >= b.viewW) return;
    const groundY = match.terrain.yAt(limitX);
    ctx.save();
    ctx.fillStyle = "rgba(180, 28, 18, 0.08)";
    ctx.fillRect(limitX, 0, b.viewW - limitX, b.viewH);
    ctx.strokeStyle = "rgba(196, 36, 22, 0.85)";
    ctx.lineWidth = 3;
    ctx.setLineDash([14, 10]);
    ctx.beginPath();
    ctx.moveTo(limitX, 24);
    ctx.lineTo(limitX, groundY);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "rgba(196, 36, 22, 0.92)";
    ctx.font = "bold 18px Palatino, Georgia, serif";
    ctx.textAlign = "right";
    ctx.fillText("Max drone range", limitX - 10, 56);
    ctx.restore();
  }

  function drawCrosshair(ctx, x, y, outOfRange) {
    const arm = 72;
    const gap = 16;
    const ring = 34;
    const main = outOfRange ? "#9a8f84" : "#ff2d2d";
    const rim = outOfRange ? "#322b26" : "#2a0a0a";
    function stroke(color, width) {
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.beginPath();
      ctx.moveTo(x - arm, y);
      ctx.lineTo(x - gap, y);
      ctx.moveTo(x + gap, y);
      ctx.lineTo(x + arm, y);
      ctx.moveTo(x, y - arm);
      ctx.lineTo(x, y - gap);
      ctx.moveTo(x, y + gap);
      ctx.lineTo(x + arm, y);
      ctx.moveTo(x + ring, y);
      ctx.arc(x, y, ring, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.save();
    ctx.lineCap = "round";
    stroke(rim, 10);
    stroke(main, 5);
    if (outOfRange) {
      ctx.strokeStyle = "#d92b1c";
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(x - 18, y - 18);
      ctx.lineTo(x + 18, y + 18);
      ctx.moveTo(x + 18, y - 18);
      ctx.lineTo(x - 18, y + 18);
      ctx.stroke();
    } else {
      ctx.fillStyle = main;
      ctx.beginPath();
      ctx.arc(x, y, 4.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  // Free Game aim keeps this much of each flight curve at full strength.
  // The rest fades to nothing, so the landing point is a guess.
  const FREE_AIM_SHOWN = 2 / 3;

  function pathLengths(points) {
    const lens = new Array(points.length);
    lens[0] = 0;
    for (let i = 1; i < points.length; i++) {
      lens[i] = lens[i - 1] + Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
    }
    return lens;
  }

  function aimAlpha(frac) {
    if (frac <= FREE_AIM_SHOWN) return 1;
    return Math.max(0, (1 - frac) / (1 - FREE_AIM_SHOWN));
  }

  function pointAlong(points, lens, frac) {
    const total = lens[lens.length - 1];
    if (!(total > 0)) return { x: points[0].x, y: points[0].y };
    const target = total * Math.max(0, Math.min(1, frac));
    let lo = 1;
    let hi = points.length - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (lens[mid] < target) lo = mid + 1;
      else hi = mid;
    }
    const span = lens[lo] - lens[lo - 1];
    const t = span > 0 ? (target - lens[lo - 1]) / span : 0;
    return {
      x: points[lo - 1].x + (points[lo].x - points[lo - 1].x) * t,
      y: points[lo - 1].y + (points[lo].y - points[lo - 1].y) * t,
    };
  }

  function pointsUntil(points, lens, frac) {
    const total = lens[lens.length - 1];
    const target = total * frac;
    const out = [points[0]];
    for (let i = 1; i < points.length; i++) {
      if (lens[i] >= target) {
        out.push(pointAlong(points, lens, frac));
        return out;
      }
      out.push(points[i]);
    }
    return out;
  }

  function tracePoints(ctx, points) {
    if (!points.length) return;
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
  }

  function fillSpread(ctx, low, high) {
    ctx.beginPath();
    ctx.moveTo(high[0].x, high[0].y);
    for (let i = 1; i < high.length; i++) ctx.lineTo(high[i].x, high[i].y);
    for (let i = low.length - 1; i >= 0; i--) ctx.lineTo(low[i].x, low[i].y);
    ctx.closePath();
    ctx.fill();
  }

  function strokeSpread(ctx, points) {
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
    ctx.stroke();
  }

  function fillSpreadFaded(ctx, low, high, lowLens, highLens) {
    const shownLow = pointsUntil(low, lowLens, FREE_AIM_SHOWN);
    const shownHigh = pointsUntil(high, highLens, FREE_AIM_SHOWN);
    ctx.globalAlpha = 1;
    ctx.beginPath();
    tracePoints(ctx, shownHigh);
    for (let i = shownLow.length - 1; i >= 0; i--) ctx.lineTo(shownLow[i].x, shownLow[i].y);
    ctx.closePath();
    ctx.fill();

    const slices = 14;
    const tail = 1 - FREE_AIM_SHOWN;
    for (let s = 0; s < slices; s++) {
      const a = FREE_AIM_SHOWN + tail * (s / slices);
      const c = FREE_AIM_SHOWN + tail * ((s + 1) / slices);
      const h0 = pointAlong(high, highLens, a);
      const h1 = pointAlong(high, highLens, c);
      const l1 = pointAlong(low, lowLens, c);
      const l0 = pointAlong(low, lowLens, a);
      ctx.globalAlpha = aimAlpha((a + c) / 2);
      ctx.beginPath();
      ctx.moveTo(h0.x, h0.y);
      ctx.lineTo(h1.x, h1.y);
      ctx.lineTo(l1.x, l1.y);
      ctx.lineTo(l0.x, l0.y);
      ctx.closePath();
      ctx.fill();
    }
  }

  function strokeSpreadFaded(ctx, points, lens) {
    const shown = pointsUntil(points, lens, FREE_AIM_SHOWN);
    ctx.globalAlpha = 1;
    ctx.lineDashOffset = 0;
    strokeSpread(ctx, shown);

    let offset = lens[lens.length - 1] * FREE_AIM_SHOWN;
    const slices = 14;
    const tail = 1 - FREE_AIM_SHOWN;
    for (let s = 0; s < slices; s++) {
      const a = FREE_AIM_SHOWN + tail * (s / slices);
      const c = FREE_AIM_SHOWN + tail * ((s + 1) / slices);
      const p0 = pointAlong(points, lens, a);
      const p1 = pointAlong(points, lens, c);
      ctx.globalAlpha = aimAlpha((a + c) / 2);
      ctx.lineDashOffset = -offset;
      ctx.beginPath();
      ctx.moveTo(p0.x, p0.y);
      ctx.lineTo(p1.x, p1.y);
      ctx.stroke();
      offset += Math.hypot(p1.x - p0.x, p1.y - p0.y);
    }
  }

  function drawSpreadBounds(ctx, low, high, fadeTail) {
    if (!low || !high || low.length < 2 || high.length < 2) return;
    ctx.save();
    ctx.fillStyle = "rgba(24, 16, 10, 0.1)";
    ctx.strokeStyle = "rgba(24, 16, 10, 0.42)";
    ctx.lineWidth = 1.8;
    ctx.setLineDash([7, 7]);
    if (fadeTail) {
      const lowLens = pathLengths(low);
      const highLens = pathLengths(high);
      fillSpreadFaded(ctx, low, high, lowLens, highLens);
      strokeSpreadFaded(ctx, low, lowLens);
      strokeSpreadFaded(ctx, high, highLens);
    } else {
      fillSpread(ctx, low, high);
      strokeSpread(ctx, low);
      strokeSpread(ctx, high);
    }
    ctx.restore();
  }

  function drawAimDots(ctx, points, fadeTail) {
    ctx.save();
    ctx.fillStyle = "#000";
    const lens = fadeTail ? pathLengths(points) : null;
    const total = lens ? lens[lens.length - 1] : 0;
    for (let i = 0; i < points.length; i += 3) {
      const p = points[i];
      ctx.globalAlpha = fadeTail && total > 0 ? aimAlpha(lens[i] / total) : 1;
      if (ctx.globalAlpha <= 0) continue;
      ctx.fillRect(p.x - 1.5, p.y - 1.5, 3, 3);
    }
    ctx.restore();
  }

  function drawFlight(ctx, path, index, time, sam) {
    if (!path || !path.length || index < 0) return;
    const tip = Math.min(path.length - 1, Math.floor(index));
    const from = Math.max(0, tip - 16);
    for (let i = from; i <= tip; i++) {
      const p = path[i];
      const along = (i - from) / Math.max(1, tip - from);
      const radius = 2.2 + along * 6.5;
      ctx.globalAlpha = 0.18 + along * 0.7;
      const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, radius);
      glow.addColorStop(0, along > 0.7 ? (sam ? "#e7f3ff" : "#fff4c2") : (sam ? "#6aa6e8" : "#ff8a1e"));
      glow.addColorStop(1, sam ? "rgba(80,140,220,0)" : "rgba(255,60,10,0)");
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    const clamped = Math.max(0, Math.min(path.length - 1, index));
    const i0 = Math.min(path.length - 1, Math.floor(clamped));
    const i1 = Math.min(path.length - 1, i0 + 1);
    const t = clamped - i0;
    const a = path[i0];
    const c = path[i1];
    const back = path[Math.max(0, i0 - 2)];
    const fore = path[Math.min(path.length - 1, i0 + 2)];
    const ang = Math.atan2(fore.y - back.y, fore.x - back.x);
    drawRocket(ctx, a.x + (c.x - a.x) * t, a.y + (c.y - a.y) * t, ang, time, sam);
  }

  function drawIntercept(ctx, ice, time) {
    if (!ice || ice.index < 0) return;
    drawFlight(ctx, ice.path, ice.index, time, true);
  }

  let backdropCache = null;

  function fbm(x, seed, octaves) {
    let val = 0;
    let amp = 0.5;
    let freq = 1;
    for (let i = 0; i < octaves; i++) {
      const xi = Math.floor(x * freq);
      const xf = x * freq - xi;
      const u = xf * xf * (3 - 2 * xf);
      const a = hash(seed + i * 1013 + xi * 37);
      const b = hash(seed + i * 1013 + (xi + 1) * 37);
      val += (a + (b - a) * u) * amp;
      amp *= 0.5;
      freq *= 2.07;
    }
    return val;
  }

  function paintCloudBank(ctx, cx, cy, rx, ry, puffs, opacity, seed) {
    ctx.save();
    ctx.globalAlpha = opacity;
    for (let i = 0; i < puffs; i++) {
      const t = (i / (puffs - 1)) * 2 - 1;
      const px = cx + t * rx * 0.78 + (hash(seed + i * 19) - 0.5) * rx * 0.22;
      const arch = 1 - t * t * 0.85;
      const py = cy - arch * ry * 0.48 + (hash(seed + i * 31) - 0.5) * ry * 0.18;
      const prx = rx * (0.32 + 0.3 * arch + hash(seed + i * 43) * 0.16);
      const pry = ry * (0.44 + 0.38 * arch + hash(seed + i * 59) * 0.16);

      const shade = ctx.createRadialGradient(px - prx * 0.2, py - pry * 0.35, prx * 0.08, px, py, Math.max(prx, pry));
      shade.addColorStop(0, "rgba(255, 253, 248, 0.92)");
      shade.addColorStop(0.55, "rgba(240, 245, 250, 0.72)");
      shade.addColorStop(0.85, "rgba(182, 198, 214, 0.38)");
      shade.addColorStop(1, "rgba(164, 182, 198, 0)");
      ctx.fillStyle = shade;
      ctx.beginPath();
      ctx.ellipse(px, py, prx, pry, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    const baseGrad = ctx.createLinearGradient(cx, cy - ry * 0.15, cx, cy + ry * 0.65);
    baseGrad.addColorStop(0, "rgba(215, 226, 236, 0)");
    baseGrad.addColorStop(0.6, "rgba(148, 166, 186, 0.38)");
    baseGrad.addColorStop(1, "rgba(128, 148, 170, 0)");
    ctx.fillStyle = baseGrad;
    ctx.beginPath();
    ctx.ellipse(cx, cy + ry * 0.22, rx * 0.95, ry * 0.38, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function paintPine(ctx, x, y, scale, tint) {
    const h = 18 * scale;
    const w = 6.5 * scale;
    ctx.fillStyle = "#3a281b";
    ctx.fillRect(x - 0.8 * scale, y - 3.5 * scale, 1.6 * scale, 4.5 * scale);
    for (let tier = 0; tier < 3; tier++) {
      const ty = y - 2.5 * scale - tier * (h * 0.27);
      const tw = w * (1 - tier * 0.22);
      const th = h * (0.48 - tier * 0.06);
      ctx.fillStyle = tint.dark;
      ctx.beginPath();
      ctx.moveTo(x, ty - th);
      ctx.lineTo(x + tw, ty);
      ctx.lineTo(x - tw, ty);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = tint.light;
      ctx.beginPath();
      ctx.moveTo(x, ty - th);
      ctx.lineTo(x - tw * 0.15, ty);
      ctx.lineTo(x - tw, ty);
      ctx.closePath();
      ctx.fill();
    }
  }

  function paintDeciduous(ctx, x, y, scale, tint, seed) {
    ctx.fillStyle = "#423022";
    ctx.fillRect(x - 1 * scale, y - 5 * scale, 2 * scale, 6 * scale);
    const r = 5.8 * scale;
    const offsets = [
      [-0.45, -0.7, 0.78],
      [0.45, -0.65, 0.75],
      [0, -1.1, 0.88],
    ];
    for (let i = 0; i < offsets.length; i++) {
      const ox = x + offsets[i][0] * r;
      const oy = y - 4 * scale + offsets[i][1] * r;
      const rad = r * offsets[i][2] * (0.92 + hash(seed + i * 13) * 0.16);
      ctx.fillStyle = tint.dark;
      ctx.beginPath();
      ctx.arc(ox, oy, rad, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = tint.light;
      ctx.beginPath();
      ctx.arc(ox - rad * 0.22, oy - rad * 0.22, rad * 0.72, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function getBackdrop(w, h, horizon, valleyStart, valleyEnd) {
    const key = w + ":" + h + ":" + horizon + ":" + valleyStart + ":" + valleyEnd;
    if (backdropCache && backdropCache.key === key) return backdropCache.canvas;

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");

    const sky = ctx.createLinearGradient(0, 0, 0, horizon + 40);
    sky.addColorStop(0, "#3b6998");
    sky.addColorStop(0.28, "#6796be");
    sky.addColorStop(0.58, "#9ec2d8");
    sky.addColorStop(0.82, "#cfe0dc");
    sky.addColorStop(0.95, "#e6dfc8");
    sky.addColorStop(1, "#d9c6a0");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);

    const sunX = 520;
    const sunY = 230;
    const sunHalo = ctx.createRadialGradient(sunX, sunY, 10, sunX, sunY, 540);
    sunHalo.addColorStop(0, "rgba(255, 252, 232, 0.95)");
    sunHalo.addColorStop(0.08, "rgba(255, 244, 204, 0.65)");
    sunHalo.addColorStop(0.28, "rgba(255, 232, 178, 0.22)");
    sunHalo.addColorStop(0.6, "rgba(245, 218, 170, 0.06)");
    sunHalo.addColorStop(1, "rgba(245, 218, 170, 0)");
    ctx.fillStyle = sunHalo;
    ctx.fillRect(0, 0, w, horizon);

    ctx.fillStyle = "#fffdf2";
    ctx.beginPath();
    ctx.arc(sunX, sunY, 34, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.strokeStyle = "rgba(255, 250, 236, 0.18)";
    ctx.lineWidth = 3;
    for (let i = 0; i < 28; i++) {
      const cx = (i * 210 + hash(i * 17) * 140) % w;
      const cy = 70 + hash(i * 29) * 320;
      const len = 90 + hash(i * 43) * 180;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.quadraticCurveTo(cx + len * 0.5, cy - 8, cx + len, cy + 4);
      ctx.stroke();
    }
    ctx.restore();

    // Organic cloud formations at varied altitudes and scales (non-repeating across 4800px)
    const cloudDefs = [
      { x: 240, y: 310, rx: 190, ry: 48, puffs: 9, op: 0.85, s: 11 },
      { x: 680, y: 180, rx: 280, ry: 62, puffs: 11, op: 0.72, s: 23 },
      { x: 1180, y: 440, rx: 220, ry: 52, puffs: 8, op: 0.78, s: 37 },
      { x: 1560, y: 260, rx: 340, ry: 74, puffs: 12, op: 0.88, s: 53 },
      { x: 2040, y: 520, rx: 170, ry: 38, puffs: 7, op: 0.65, s: 71 },
      { x: 2420, y: 210, rx: 390, ry: 82, puffs: 13, op: 0.82, s: 89 },
      { x: 2950, y: 390, rx: 250, ry: 58, puffs: 10, op: 0.76, s: 107 },
      { x: 3410, y: 160, rx: 310, ry: 68, puffs: 11, op: 0.7, s: 131 },
      { x: 3890, y: 470, rx: 260, ry: 54, puffs: 9, op: 0.8, s: 157 },
      { x: 4380, y: 280, rx: 330, ry: 72, puffs: 12, op: 0.85, s: 193 },
      { x: 890, y: 680, rx: 240, ry: 42, puffs: 8, op: 0.52, s: 229 },
      { x: 1840, y: 740, rx: 310, ry: 48, puffs: 10, op: 0.48, s: 263 },
      { x: 2780, y: 710, rx: 270, ry: 44, puffs: 9, op: 0.5, s: 293 },
      { x: 3720, y: 760, rx: 290, ry: 46, puffs: 9, op: 0.46, s: 331 },
      { x: 4580, y: 690, rx: 210, ry: 38, puffs: 7, op: 0.52, s: 367 },
    ];
    for (let i = 0; i < cloudDefs.length; i++) {
      const c = cloudDefs[i];
      paintCloudBank(ctx, c.x, c.y, c.rx, c.ry, c.puffs, c.op, c.s);
    }

    const crestX = (valleyStart + valleyEnd) / 2;

    // 1. Distant high alpine peaks rendered onto an atmospheric layer with 10px Gaussian feathering
    // (Because the 4800px canvas downscales ~4.7x when zoomed out, a 10px blur eliminates CSS downscale aliasing)
    const alpsCanvas = document.createElement("canvas");
    alpsCanvas.width = w;
    alpsCanvas.height = h;
    const alpsCtx = alpsCanvas.getContext("2d");

    // Back-range distant pale summits for layered depth
    const backSummits = [
      { x: 260, y: horizon - 460 },
      { x: 820, y: horizon - 600 },
      { x: 1480, y: horizon - 440 },
      { x: 2140, y: horizon - 640 },
      { x: 2820, y: horizon - 460 },
      { x: 3520, y: horizon - 630 },
      { x: 4180, y: horizon - 450 },
      { x: 4800, y: horizon - 550 },
    ];
    const backAlps = new Path2D();
    backAlps.moveTo(-40, h);
    backAlps.lineTo(-40, horizon - 500);
    for (let i = 0; i < backSummits.length; i++) {
      const p0 = i === 0 ? { x: -40, y: horizon - 500 } : backSummits[i - 1];
      const p1 = backSummits[i];
      const midX = (p0.x + p1.x) * 0.5;
      backAlps.bezierCurveTo(midX, p0.y, midX, p1.y, p1.x, p1.y);
    }
    backAlps.lineTo(w + 40, h);
    backAlps.closePath();

    const backAlpsGrad = alpsCtx.createLinearGradient(0, horizon - 680, 0, horizon);
    backAlpsGrad.addColorStop(0, "rgba(134, 162, 188, 0.68)");
    backAlpsGrad.addColorStop(0.5, "rgba(160, 184, 204, 0.58)");
    backAlpsGrad.addColorStop(1, "rgba(196, 212, 222, 0.35)");
    alpsCtx.fillStyle = backAlpsGrad;
    alpsCtx.fill(backAlps);

    // Broad, sweeping alpine ridge with low-slope cubic Bezier curves so diagonals never stair-step
    const nodes = [
      { x: -40, y: horizon - 390 },
      { x: 460, y: horizon - 660, peak: true },
      { x: 960, y: horizon - 420 },
      { x: 1520, y: horizon - 710, peak: true },
      { x: 2040, y: horizon - 440 },
      { x: 2560, y: horizon - 740, peak: true },
      { x: 3120, y: horizon - 420 },
      { x: 3680, y: horizon - 690, peak: true },
      { x: 4180, y: horizon - 430 },
      { x: 4620, y: horizon - 640, peak: true },
      { x: 4840, y: horizon - 460 },
    ];

    const farPath = new Path2D();
    farPath.moveTo(-40, h);
    farPath.lineTo(nodes[0].x, nodes[0].y);
    for (let i = 1; i < nodes.length; i++) {
      const p0 = nodes[i - 1];
      const p1 = nodes[i];
      const span = p1.x - p0.x;
      farPath.bezierCurveTo(p0.x + span * 0.48, p0.y, p1.x - span * 0.48, p1.y, p1.x, p1.y);
    }
    farPath.lineTo(w + 40, h);
    farPath.closePath();

    const farGrad = alpsCtx.createLinearGradient(0, horizon - 760, 0, horizon);
    farGrad.addColorStop(0, "#708eab");
    farGrad.addColorStop(0.38, "#84a0b9");
    farGrad.addColorStop(0.72, "#a2b8ca");
    farGrad.addColorStop(1, "#c6d2d9");
    alpsCtx.fillStyle = farGrad;
    alpsCtx.fill(farPath);

    alpsCtx.save();
    alpsCtx.clip(farPath);

    // Soft sunlit & shaded slopes on each peak
    for (let i = 1; i < nodes.length - 1; i++) {
      const pk = nodes[i];
      if (!pk.peak) continue;
      const leftSaddle = nodes[i - 1];
      const rightSaddle = nodes[i + 1];
      const peakH = horizon - pk.y;

      const leftGrad = alpsCtx.createLinearGradient(leftSaddle.x, pk.y, pk.x + 60, horizon);
      leftGrad.addColorStop(0, "rgba(255, 253, 246, 0.45)");
      leftGrad.addColorStop(0.55, "rgba(244, 248, 252, 0.22)");
      leftGrad.addColorStop(1, "rgba(244, 248, 252, 0)");
      alpsCtx.fillStyle = leftGrad;
      alpsCtx.beginPath();
      alpsCtx.moveTo(leftSaddle.x, horizon);
      alpsCtx.lineTo(leftSaddle.x, leftSaddle.y);
      alpsCtx.bezierCurveTo(
        leftSaddle.x + (pk.x - leftSaddle.x) * 0.48,
        leftSaddle.y,
        pk.x - (pk.x - leftSaddle.x) * 0.48,
        pk.y,
        pk.x,
        pk.y
      );
      alpsCtx.bezierCurveTo(
        pk.x - 36,
        pk.y + peakH * 0.35,
        pk.x + 32,
        pk.y + peakH * 0.7,
        pk.x - 12,
        horizon
      );
      alpsCtx.closePath();
      alpsCtx.fill();

      const rightGrad = alpsCtx.createLinearGradient(pk.x, pk.y, rightSaddle.x, horizon);
      rightGrad.addColorStop(0, "rgba(48, 68, 94, 0.36)");
      rightGrad.addColorStop(0.6, "rgba(64, 86, 112, 0.16)");
      rightGrad.addColorStop(1, "rgba(64, 86, 112, 0)");
      alpsCtx.fillStyle = rightGrad;
      alpsCtx.beginPath();
      alpsCtx.moveTo(pk.x, pk.y);
      alpsCtx.bezierCurveTo(
        pk.x + (rightSaddle.x - pk.x) * 0.48,
        pk.y,
        rightSaddle.x - (rightSaddle.x - pk.x) * 0.48,
        rightSaddle.y,
        rightSaddle.x,
        rightSaddle.y
      );
      alpsCtx.lineTo(rightSaddle.x, horizon);
      alpsCtx.lineTo(pk.x - 12, horizon);
      alpsCtx.bezierCurveTo(
        pk.x + 32,
        pk.y + peakH * 0.7,
        pk.x - 36,
        pk.y + peakH * 0.35,
        pk.x,
        pk.y
      );
      alpsCtx.closePath();
      alpsCtx.fill();
    }

    // Soft snow mantle across the upper elevations
    const snowGrad = alpsCtx.createLinearGradient(0, horizon - 750, 0, horizon - 360);
    snowGrad.addColorStop(0, "rgba(248, 252, 255, 0.78)");
    snowGrad.addColorStop(0.5, "rgba(232, 242, 250, 0.48)");
    snowGrad.addColorStop(0.82, "rgba(212, 226, 240, 0.16)");
    snowGrad.addColorStop(1, "rgba(202, 218, 234, 0)");
    alpsCtx.fillStyle = snowGrad;
    alpsCtx.beginPath();
    alpsCtx.moveTo(-40, horizon - 760);
    alpsCtx.lineTo(w + 40, horizon - 760);
    alpsCtx.lineTo(w + 40, horizon - 340);
    for (let i = nodes.length - 1; i >= 1; i--) {
      const p1 = nodes[i];
      const p0 = nodes[i - 1];
      const span = p1.x - p0.x;
      const y1 = Math.max(p1.y + 190, horizon - 380);
      const y0 = Math.max(p0.y + 190, horizon - 380);
      alpsCtx.bezierCurveTo(p1.x - span * 0.48, y1, p0.x + span * 0.48, y0, p0.x, y0);
    }
    alpsCtx.closePath();
    alpsCtx.fill();
    alpsCtx.restore();

    // Pre-filter with 10px Gaussian blur so the 4.7x browser downscale is completely free of aliasing
    ctx.save();
    ctx.filter = "blur(10px)";
    ctx.drawImage(alpsCanvas, 0, 0);
    ctx.restore();

    // Distant atmospheric valley haze between far alpine peaks and mid mountains
    const hazeFar = ctx.createLinearGradient(0, horizon - 380, 0, horizon - 80);
    hazeFar.addColorStop(0, "rgba(198, 214, 224, 0)");
    hazeFar.addColorStop(0.6, "rgba(208, 220, 224, 0.35)");
    hazeFar.addColorStop(1, "rgba(218, 224, 216, 0.58)");
    ctx.fillStyle = hazeFar;
    ctx.fillRect(0, horizon - 380, w, 310);

    // 2. Mid-distance forested mountains rendered onto an atmospheric layer with 5px blur
    const midCanvas = document.createElement("canvas");
    midCanvas.width = w;
    midCanvas.height = h;
    const midCtx = midCanvas.getContext("2d");

    const stepMid = 6;
    const midCount = Math.ceil(w / stepMid) + 1;
    const rawMid = new Float32Array(midCount);
    const midRidge = new Float32Array(midCount);
    for (let i = 0; i < midCount; i++) {
      const x = i * stepMid;
      const broad = fbm(x * 0.0007, 409, 2) * 230;
      const detail = fbm(x * 0.0018, 503, 2) * 40;
      const valley = Math.exp(-Math.pow((x - crestX) / 580, 2)) * 100;
      rawMid[i] = horizon - 95 - broad - detail - valley;
    }
    const midSmooth = 16;
    for (let i = 0; i < midCount; i++) {
      let sum = 0;
      let wtSum = 0;
      for (let k = -midSmooth; k <= midSmooth; k++) {
        const j = Math.max(0, Math.min(midCount - 1, i + k));
        const wt = midSmooth + 1 - Math.abs(k);
        sum += rawMid[j] * wt;
        wtSum += wt;
      }
      midRidge[i] = sum / wtSum;
    }

    const midPath = new Path2D();
    midPath.moveTo(0, h);
    midPath.lineTo(0, midRidge[0]);
    for (let i = 1; i < midCount - 1; i++) {
      const xMid = (i + 0.5) * stepMid;
      const yMid = (midRidge[i] + midRidge[i + 1]) * 0.5;
      midPath.quadraticCurveTo(i * stepMid, midRidge[i], xMid, yMid);
    }
    midPath.lineTo(w, midRidge[midCount - 1]);
    midPath.lineTo(w, h);
    midPath.closePath();

    const midGrad = midCtx.createLinearGradient(0, horizon - 420, 0, horizon);
    midGrad.addColorStop(0, "#4c6b58");
    midGrad.addColorStop(0.45, "#5d7d5e");
    midGrad.addColorStop(0.85, "#78946c");
    midGrad.addColorStop(1, "#94ab82");
    midCtx.fillStyle = midGrad;
    midCtx.fill(midPath);

    midCtx.save();
    midCtx.clip(midPath);
    for (let i = 15; i < midCount - 15; i += 20) {
      const x = i * stepMid;
      const y = midRidge[i];
      const slope = midRidge[i + 6] - midRidge[i - 6];
      const glow = midCtx.createRadialGradient(x, y + 60, 10, x, y + 80, 180);
      if (slope < 0) {
        glow.addColorStop(0, "rgba(208, 224, 176, 0.22)");
        glow.addColorStop(1, "rgba(208, 224, 176, 0)");
      } else {
        glow.addColorStop(0, "rgba(32, 48, 38, 0.26)");
        glow.addColorStop(1, "rgba(32, 48, 38, 0)");
      }
      midCtx.fillStyle = glow;
      midCtx.beginPath();
      midCtx.arc(x, y + 80, 180, 0, Math.PI * 2);
      midCtx.fill();
    }
    midCtx.restore();

    ctx.save();
    ctx.filter = "blur(5px)";
    ctx.drawImage(midCanvas, 0, 0);
    ctx.restore();

    const mist1 = ctx.createLinearGradient(0, horizon - 210, 0, horizon - 10);
    mist1.addColorStop(0, "rgba(216, 226, 220, 0)");
    mist1.addColorStop(0.65, "rgba(218, 226, 214, 0.34)");
    mist1.addColorStop(1, "rgba(226, 222, 198, 0.52)");
    ctx.fillStyle = mist1;
    ctx.fillRect(0, horizon - 210, w, 205);

    // 3. Near rolling hills & pastures with clustered woodland groves
    const stepNear = 4;
    const nearCount = Math.ceil(w / stepNear) + 1;
    const nearRidge = new Float32Array(nearCount);
    ctx.beginPath();
    ctx.moveTo(0, h);
    for (let i = 0; i < nearCount; i++) {
      const x = i * stepNear;
      const n = fbm(x * 0.0024, 601, 4) * 95 + fbm(x * 0.007, 643, 2) * 28;
      const valley = (x > valleyStart - 180 && x < valleyEnd + 180)
        ? Math.sin(Math.max(0, Math.min(1, (x - (valleyStart - 180)) / (valleyEnd - valleyStart + 360))) * Math.PI) * 76
        : 0;
      const y = horizon - 24 - n - valley;
      nearRidge[i] = y;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(w, h);
    ctx.closePath();

    const nearGrad = ctx.createLinearGradient(0, horizon - 190, 0, horizon + 20);
    nearGrad.addColorStop(0, "#6e914a");
    nearGrad.addColorStop(0.55, "#59783b");
    nearGrad.addColorStop(1, "#445e2b");
    ctx.fillStyle = nearGrad;
    ctx.fill();

    ctx.save();
    ctx.clip();
    // Sunlit pasture bands & contour shading on near hills
    for (let i = 0; i < nearCount - 2; i += 2) {
      const x = i * stepNear;
      const y = nearRidge[i];
      const nextY = nearRidge[i + 2];
      if (nextY < y) {
        ctx.fillStyle = "rgba(196, 218, 122, 0.16)";
        ctx.fillRect(x, y, stepNear * 2 + 2, 95);
      } else {
        ctx.fillStyle = "rgba(30, 46, 20, 0.18)";
        ctx.fillRect(x, y, stepNear * 2 + 2, 95);
      }
    }
    ctx.strokeStyle = "rgba(188, 210, 130, 0.22)";
    ctx.lineWidth = 2;
    for (let band = 1; band <= 4; band++) {
      ctx.beginPath();
      for (let i = 0, x = 0; i < nearCount; i += 2, x += 8) {
        const y = nearRidge[i] + band * 22 + Math.sin(x * 0.009 + band * 1.4) * 8;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    ctx.restore();

    // Clustered groves of trees along the near hill ridge (instead of uniform spacing)
    const farTreeTint = { dark: "#344e32", light: "#527347" };
    for (let x = 20; x < w - 20; x += 9) {
      const grove = fbm(x * 0.006, 709, 2);
      if (grove < 0.48) continue;
      if (hash(x * 19 + 701) < 0.25) continue;
      const idx = Math.min(nearRidge.length - 1, Math.floor(x / stepNear));
      const y = nearRidge[idx] + 4 + hash(x * 23) * 14;
      const scale = 0.65 + hash(x * 31) * 0.55;
      if (hash(x * 41) > 0.35) paintPine(ctx, x, y, scale, farTreeTint);
      else paintDeciduous(ctx, x, y, scale * 0.95, farTreeTint, x);
    }

    backdropCache = { key, canvas };
    return canvas;
  }

  function isClearGround(x, match, b) {
    const pad = 22;
    const castleSpan = b.cols * b.block;
    if (x > match.left.originX - pad && x < match.left.originX + castleSpan + 72) return false;
    if (x > match.right.originX - 72 && x < match.right.originX + castleSpan + pad) return false;
    for (const castle of [match.left, match.right]) {
      const houses = castle.houses || [];
      for (let i = 0; i < houses.length; i++) {
        const h = houses[i];
        if (x > h.x - 14 && x < h.x + h.w + 14) return false;
      }
      const mines = castle.mines || [];
      for (let i = 0; i < mines.length; i++) {
        const m = mines[i];
        if (x > m.x - 14 && x < m.x + m.w + 14) return false;
      }
      const rigs = castle.rigs || [];
      for (let i = 0; i < rigs.length; i++) {
        const r = rigs[i];
        if (x > r.x - 14 && x < r.x + r.w + 14) return false;
      }
      const p = castle.patriot;
      if (p && x > p.x - 14 && x < p.x + p.w + 14) return false;
    }
    const craters = match.terrain.craters || [];
    for (let i = 0; i < craters.length; i++) {
      const c = craters[i];
      if (Math.abs(x - c.x) < c.r + 8) return false;
    }
    return true;
  }

  function paintForegroundTerrain(ctx, match) {
    const b = B.BALANCE;
    const w = b.viewW;
    const h = b.viewH;
    const terrain = match.terrain;
    const horizon = terrain.leftY;

    const surface = new Path2D();
    surface.moveTo(0, h);
    for (let x = 0; x <= w; x += 3) {
      surface.lineTo(x, terrain.yAt(x));
    }
    surface.lineTo(w, h);
    surface.closePath();

    ctx.save();
    ctx.clip(surface);

    const earthGrad = ctx.createLinearGradient(0, horizon - 80, 0, h);
    earthGrad.addColorStop(0, "#6d8c42");
    earthGrad.addColorStop(0.18, "#587334");
    earthGrad.addColorStop(0.32, "#6b533b");
    earthGrad.addColorStop(0.58, "#4e3c2a");
    earthGrad.addColorStop(1, "#2c221a");
    ctx.fillStyle = earthGrad;
    ctx.fillRect(0, horizon - 100, w, h - horizon + 100);

    for (let band = 0; band < 6; band++) {
      const depth = 22 + band * 26;
      ctx.fillStyle = band % 2 === 0 ? "rgba(38, 28, 18, 0.24)" : "rgba(124, 98, 68, 0.16)";
      ctx.beginPath();
      ctx.moveTo(0, h);
      for (let x = 0; x <= w; x += 12) {
        const sy = terrain.yAt(x) + depth + Math.sin(x * 0.008 + band * 1.7) * 6 + (hash(x + band * 97) - 0.5) * 4;
        ctx.lineTo(x, sy);
      }
      ctx.lineTo(w, h);
      ctx.closePath();
      ctx.fill();
    }

    const vStart = terrain.valleyStart;
    const vEnd = terrain.valleyEnd;
    for (let x = vStart - 16; x <= vEnd + 16; x += 6) {
      const y = terrain.yAt(x);
      const yNext = terrain.yAt(x + 6);
      const slope = (yNext - y) / 6;
      const steep = Math.abs(slope);
      if (steep > 0.14) {
        const rockH = 26 + steep * 65 + hash(x * 13) * 18;
        ctx.fillStyle = slope < 0 ? "#8c857b" : "#56514a";
        ctx.beginPath();
        ctx.moveTo(x, y + 3);
        ctx.lineTo(x + 7, yNext + 3);
        ctx.lineTo(x + 5, yNext + rockH);
        ctx.lineTo(x - 2, y + rockH * 0.9);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = "rgba(30, 26, 22, 0.38)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x + 1, y + 6);
        ctx.lineTo(x + 3, y + rockH * 0.75);
        ctx.stroke();
      } else {
        ctx.fillStyle = slope < 0 ? "rgba(182, 204, 112, 0.18)" : "rgba(28, 42, 18, 0.22)";
        ctx.fillRect(x, y, 7, 28);
      }
    }

    for (let i = 0; i < 420; i++) {
      const rx = hash(i * 73 + 19) * w;
      const ry = terrain.yAt(rx) + 14 + hash(i * 131 + 7) * (h - horizon - 20);
      const rw = 3 + hash(i * 43) * 9;
      const rh = 2 + hash(i * 59) * 5;
      ctx.fillStyle = i % 3 === 0 ? "rgba(138, 128, 114, 0.38)" : i % 3 === 1 ? "rgba(44, 34, 24, 0.42)" : "rgba(96, 78, 58, 0.35)";
      ctx.beginPath();
      ctx.ellipse(rx, ry, rw, rh, (hash(i * 17) - 0.5) * 0.6, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.beginPath();
    for (let x = 0; x <= w; x += 4) {
      const y = terrain.yAt(x);
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    for (let x = w; x >= 0; x -= 4) {
      const y = terrain.yAt(x) + 10 + (hash(x * 7) - 0.5) * 5;
      ctx.lineTo(x, y);
    }
    ctx.closePath();
    const turfGrad = ctx.createLinearGradient(0, horizon - 80, 0, horizon + 24);
    turfGrad.addColorStop(0, "#8fb352");
    turfGrad.addColorStop(0.55, "#6b8e3d");
    turfGrad.addColorStop(1, "#486328");
    ctx.fillStyle = turfGrad;
    ctx.fill();

    const craters = terrain.craters || [];
    for (let i = 0; i < craters.length; i++) {
      const c = craters[i];
      const scorch = ctx.createRadialGradient(c.x, c.y + c.r * 0.3, 2, c.x, c.y + c.r * 0.3, c.r * 1.45);
      scorch.addColorStop(0, "rgba(20, 15, 12, 0.88)");
      scorch.addColorStop(0.55, "rgba(42, 31, 22, 0.68)");
      scorch.addColorStop(0.82, "rgba(68, 50, 34, 0.35)");
      scorch.addColorStop(1, "rgba(68, 50, 34, 0)");
      ctx.fillStyle = scorch;
      ctx.beginPath();
      ctx.arc(c.x, c.y + c.r * 0.3, c.r * 1.45, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();

    ctx.lineCap = "round";
    for (let x = 0; x < w; x += 4) {
      const y0 = terrain.yAt(x);
      const y1 = terrain.yAt(x + 4);
      const slope = (y1 - y0) / 4;
      ctx.strokeStyle = slope < -0.05 ? "#9ec25e" : slope > 0.05 ? "#4a662b" : "#769943";
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(x, y0);
      ctx.lineTo(x + 4, y1);
      ctx.stroke();
    }

    const nearTreeTint = { dark: "#2d4726", light: "#4d6e38" };
    for (let x = 24; x < w - 24; x += 18) {
      const r = hash(x * 37 + 911);
      if (r < 0.62) continue;
      if (!isClearGround(x, match, b)) continue;
      const y = terrain.yAt(x) + 1;
      const scale = 0.72 + hash(x * 53) * 0.52;
      if (hash(x * 67) > 0.42) paintPine(ctx, x, y, scale, nearTreeTint);
      else paintDeciduous(ctx, x, y, scale, nearTreeTint, x + 500);
    }

    ctx.lineWidth = 1.1;
    for (let x = 6; x < w - 6; x += 7) {
      if (hash(x * 19 + 3) < 0.35) continue;
      const y = terrain.yAt(x);
      let charred = false;
      for (let i = 0; i < craters.length; i++) {
        if (Math.abs(x - craters[i].x) < craters[i].r * 1.2) {
          charred = true;
          break;
        }
      }
      if (charred) continue;
      const sway = (hash(x * 29) - 0.5) * 3;
      const gh = 3 + hash(x * 41) * 4.5;
      ctx.strokeStyle = hash(x * 13) > 0.5 ? "#88ab4c" : "#56752f";
      ctx.beginPath();
      ctx.moveTo(x, y + 1);
      ctx.lineTo(x + sway - 1.5, y - gh);
      ctx.moveTo(x + 2, y + 1);
      ctx.lineTo(x + 2 + sway + 1.5, y - gh * 0.85);
      ctx.stroke();
    }
  }

  B.drawScene = function drawScene(ctx, match, time) {
    const b = B.BALANCE;
    const w = b.viewW;
    const h = b.viewH;
    const horizon = match.terrain.leftY;

    const backdrop = getBackdrop(w, h, horizon, match.terrain.valleyStart, match.terrain.valleyEnd);
    ctx.drawImage(backdrop, 0, 0);

    paintForegroundTerrain(ctx, match);

    for (const castle of [match.left, match.right]) {
      const width = b.cols * b.block;
      const gx = castle.originX + width / 2;
      ctx.fillStyle = "rgba(36, 28, 18, 0.22)";
      ctx.beginPath();
      ctx.ellipse(gx, match.terrain.yAt(gx) + 3, width * 0.46, 6, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    for (const castle of [match.left, match.right]) {
      for (const house of castle.houses) {
        if (house.type !== "house") continue;
        const gx = house.x + house.w / 2;
        ctx.fillStyle = "rgba(36, 28, 18, 0.18)";
        ctx.beginPath();
        const bulk = house.hits >= 3 ? 0.28 : house.hits >= 2 ? 0.34 : 0.42;
        ctx.ellipse(gx, match.terrain.yAt(gx) + 2, house.w * bulk, 3.5, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      const mines = castle.mines || [];
      for (let i = 0; i < mines.length; i++) {
        const mine = mines[i];
        if (mine.type !== "tower") continue;
        const gx = mine.x + mine.w / 2;
        ctx.fillStyle = "rgba(36, 28, 18, 0.2)";
        ctx.beginPath();
        ctx.ellipse(gx, match.terrain.yAt(gx) + 2, mine.w * 0.42, 3.2, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      const rigs = castle.rigs || [];
      for (let i = 0; i < rigs.length; i++) {
        const rig = rigs[i];
        if (rig.type !== "rig") continue;
        const gx = rig.x + rig.w / 2;
        ctx.fillStyle = "rgba(36, 28, 18, 0.22)";
        ctx.beginPath();
        ctx.ellipse(gx, match.terrain.yAt(gx) + 2, rig.w * 0.46, 3.4, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    for (const castle of [match.left, match.right]) {
      paintBunkerShell(ctx, castle);
      for (const house of castle.houses) blit(ctx, house, castle);
      const ordered = castle.blocks.slice().sort((a, c) => a.r - c.r || a.c - c.c);
      for (const block of ordered) {
        if (block.type !== "cannon" && block.type !== "keep") blit(ctx, block, castle);
      }
      for (const block of ordered) {
        if (block.type === "keep") blit(ctx, block, castle);
      }
      for (const block of ordered) {
        if (block.type === "cannon") blit(ctx, block, castle);
      }
    }

    ctx.strokeStyle = "#3f562b";
    ctx.lineWidth = 1;
    for (const castle of [match.left, match.right]) {
      for (let i = 0; i < 8; i++) {
        const x = castle.originX + 10 + i * 24;
        const y = match.terrain.yAt(x);
        ctx.beginPath();
        ctx.moveTo(x, y + 1);
        ctx.lineTo(x - 2, y + 7);
        ctx.moveTo(x, y + 1);
        ctx.lineTo(x + 3, y + 8);
        ctx.stroke();
      }
    }

    for (const castle of [match.left, match.right]) {
      const patriot = castle.patriot;
      if (!patriot || patriot.type !== "patriot") continue;
      const gx = patriot.x + patriot.w / 2;
      ctx.fillStyle = "rgba(36, 28, 18, 0.22)";
      ctx.beginPath();
      ctx.ellipse(gx, match.terrain.yAt(gx) + 2, patriot.w * 0.34, 3.4, 0, 0, Math.PI * 2);
      ctx.fill();
      blit(ctx, patriot, castle);
    }

    if (match.phase === "aim" && match.turn === "left" && match.preview) {
      const fadeAim = match.mode === "free";
      drawSpreadBounds(ctx, match.previewLow, match.previewHigh, fadeAim);
      drawAimDots(ctx, match.preview, fadeAim);
    }

    paintBits(ctx, match.fx);

    if (match.phase === "fly" && match.shot && match.shot.path.length) {
      const ice = match.shot.intercept;
      const cap = ice && ice.success ? Math.min(match.shot.index, ice.meetAt) : match.shot.index;
      if (match.shot.drone) drawDroneFlight(ctx, match.shot.path, cap, time);
      else drawFlight(ctx, match.shot.path, cap, time, false);
    }
    const currentIce = match.shot && match.shot.intercept;
    if (currentIce) drawIntercept(ctx, currentIce, time);
    if (match.intercept && match.intercept !== currentIce) drawIntercept(ctx, match.intercept, time);

    ctx.fillStyle = "#241c14";
    ctx.font = "16px Palatino, Georgia, serif";
    ctx.fillText("You", match.left.originX, match.left.padY + 22);
    ctx.fillText("Enemy", match.right.originX + b.cols * b.block + 12, match.right.padY - 8);
    const wind = Math.round(match.wind);
    const arrow = wind === 0 ? "still" : wind > 0 ? "→".repeat(Math.min(4, Math.ceil(wind / 12))) : "←".repeat(Math.min(4, Math.ceil(-wind / 12)));
    // The battlefield is 4800px wide and then scaled to the window, so a fixed
    // canvas font shrinks to a few pixels. Size the readout in screen pixels.
    const windPx = Math.round(40 * (w / (ctx.canvas.clientWidth || w)));
    ctx.font = windPx + "px Palatino, Georgia, serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText("Wind " + wind + "  " + arrow, w / 2, Math.round(windPx * 0.15));
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";

    if (match.droneAim && match.phase === "aim" && match.turn === "left") {
      drawDroneRange(ctx, match);
      const outOfRange = !B.droneInRange(match, "left", match.droneAim.x);
      drawCrosshair(ctx, match.droneAim.x, match.droneAim.y, outOfRange);
    }
    if (match.wallTool && match.wallTool.onMap && match.phase === "aim" && match.turn === "left") {
      drawPuttyKnife(ctx, match.wallTool.x, match.wallTool.y, match);
    }
  };
})();

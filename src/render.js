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

  function paintWall(ctx, block, castle) {
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

  function paintKing(ctx, block, castle) {
    const s = block.w;
    const robe = castle.side === "left" ? "#9d2c32" : "#2a4178";
    const robeDark = castle.side === "left" ? "#641820" : "#162446";
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
    if (castle.side === "right") ctx.scale(-1, 1);

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
    ctx.fillStyle = castle.side === "left" ? "#2a4178" : "#9d2c32";
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

  function drawRocket(ctx, x, y, ang, time) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(ang);
    const flick = 0.82 + Math.sin(time * 0.05) * 0.28;
    const glow = ctx.createRadialGradient(-9, 0, 1, -9, 0, 14);
    glow.addColorStop(0, "rgba(255, 236, 170, 0.95)");
    glow.addColorStop(0.4, "rgba(255, 110, 24, 0.7)");
    glow.addColorStop(1, "rgba(255, 60, 10, 0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(-9, 0, 13 * flick, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ff4a10";
    ctx.beginPath();
    ctx.moveTo(-5, 0);
    ctx.lineTo(-16 * flick, -3.6);
    ctx.lineTo(-10, 0);
    ctx.lineTo(-16 * flick, 3.6);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#ffb03a";
    ctx.beginPath();
    ctx.moveTo(-5, 0);
    ctx.lineTo(-11 * flick, -1.8);
    ctx.lineTo(-8, 0);
    ctx.lineTo(-11 * flick, 1.8);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#fff6d0";
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
    ctx.fillStyle = "#d5dee6";
    ctx.fillRect(-4, -2.3, 11, 4.6);
    ctx.fillStyle = "#f7fafc";
    ctx.fillRect(-4, -2.3, 11, 1.3);
    ctx.fillStyle = "#d4552a";
    ctx.fillRect(2.4, -2.3, 2.2, 4.6);
    ctx.fillStyle = "#e25a28";
    ctx.beginPath();
    ctx.moveTo(7, -2.3);
    ctx.lineTo(13.5, 0);
    ctx.lineTo(7, 2.3);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#ffd0b0";
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
        ctx.lineWidth = 3;
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
  };

  function fillBricks(ctx, block, salt) {
    const s = block.w;
    ctx.fillStyle = BRICK.mortar;
    ctx.fillRect(-12, -52, s + 24, s + 80);
    const bh = 4;
    const bw = 8;
    for (let row = -14; row < 16; row++) {
      const y = row * bh;
      const offset = ((block.r * 7 + row) % 2) * 4;
      for (let n = -2; n < 6; n++) {
        const x = n * (bw + 1) + offset - 4;
        const tone = hash(salt + (block.r * 7 + row) * 97 + (block.c * 5 + n) * 13);
        ctx.fillStyle = BRICK.tones[Math.floor(tone * BRICK.tones.length)];
        ctx.fillRect(x, y, bw, bh - 1);
      }
    }
  }

  function fillClippedBricks(ctx, block, path, salt) {
    ctx.save();
    ctx.clip(path);
    fillBricks(ctx, block, salt);
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

  function paintWhiteFoot(ctx, s) {
    ctx.fillStyle = BRICK.light;
    ctx.fillRect(-1, s - 6, s + 2, 6);
    ctx.fillStyle = "#d5cbb8";
    ctx.fillRect(-1, s - 2, s + 2, 2);
  }

  function paintTowerQuoins(ctx, s) {
    ctx.fillStyle = BRICK.light;
    for (let y = 2; y < s - 6; y += 7) {
      ctx.fillRect(-1, y, 3, 4);
      ctx.fillRect(s - 2, y, 3, 4);
    }
  }

  function paintGallery(ctx, s) {
    ctx.fillStyle = BRICK.light;
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

  function paintKremlinWindow(ctx, s, y) {
    ctx.fillStyle = "#1a1210";
    ctx.beginPath();
    ctx.moveTo(s / 2 - 3, y + 8);
    ctx.lineTo(s / 2 - 3, y + 3);
    ctx.arc(s / 2, y + 3, 3, Math.PI, 0);
    ctx.lineTo(s / 2 + 3, y + 8);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = BRICK.light;
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  function paintKremlinGate(ctx, s) {
    const radius = s / 2 - 5;
    ctx.fillStyle = "#140c0a";
    ctx.beginPath();
    ctx.moveTo(5, s - 5);
    ctx.lineTo(5, s - 16);
    ctx.arc(s / 2, s - 16, radius, Math.PI, 0);
    ctx.lineTo(s - 5, s - 5);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = BRICK.light;
    ctx.lineWidth = 1.3;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(s / 2, s - 16 - radius);
    ctx.lineTo(s / 2, s - 6);
    ctx.moveTo(6, s - 10);
    ctx.lineTo(s - 6, s - 10);
    ctx.stroke();
  }

  function paintStar(ctx, x, y, r) {
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
    ctx.fillStyle = "#d3222a";
    ctx.fill();
    ctx.strokeStyle = "#f3d78a";
    ctx.lineWidth = 0.7;
    ctx.stroke();
  }

  function paintTent(ctx, s, peak) {
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
    ctx.fillStyle = BRICK.light;
    ctx.fillRect(-2, 0, s + 4, 3);
    ctx.fillStyle = "#c9bfa8";
    ctx.fillRect(-2, 2.2, s + 4, 1);
  }

  function paintKremlinWall(ctx, block, castle) {
    const s = block.w;
    const role = castle.kremlinTowers && castle.kremlinTowers[block.c];
    const top = !block.covered;
    const path = new Path2D();
    if (role) path.rect(-1, 0, s + 2, s);
    else if (top) {
      const merlon = curtainPath(s);
      path.addPath(merlon);
    } else path.rect(0, 0, s, s);
    if (block.r === 0) path.rect(-1, s - 5, s + 2, 6);
    fillClippedBricks(ctx, block, path, 5);
    ctx.save();
    ctx.clip(path);
    if (role) paintTowerQuoins(ctx, s);
    if (block.r === 0) paintWhiteFoot(ctx, s);
    if (block.c === 0 && block.r === 0) paintKremlinGate(ctx, s);
    else if (top && role) {
      paintGallery(ctx, s);
      if (role === "great") paintClock(ctx, s);
    } else if (role) paintKremlinWindow(ctx, s, block.r === 0 ? 6 : 8);
    else if (!top) paintKremlinWindow(ctx, s, 6);
    ctx.restore();
    if (top && !role) {
      ctx.strokeStyle = BRICK.light;
      ctx.lineWidth = 1.15;
      ctx.stroke(path);
    }
    ctx.strokeStyle = BRICK.edge;
    ctx.lineWidth = 1;
    ctx.stroke(path);
    if (top && role) {
      const peak = role === "great" ? -42 : -28;
      paintTent(ctx, s, peak);
      paintStar(ctx, s / 2, peak, role === "great" ? 4.7 : 3.5);
    }
  }

  function paintBunkerShell(ctx, castle) {
    if (castle.style !== "kremlin") return;
    const keep = castle.blocks.find((block) => block.type === "keep");
    if (!keep) return;
    const x = keep.x - 30;
    const y = castle.padY + 1;
    const w = keep.w + 60;
    const h = keep.y + keep.h + 8 - y;
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = "#3a4a28";
    ctx.fillRect(-3, -2, w + 6, h + 5);
    ctx.fillStyle = "#6d726c";
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "#2a2f2d";
    ctx.fillRect(5, 7, w - 10, h - 12);
    ctx.fillStyle = "#8d8678";
    ctx.fillRect(0, 0, w, 7);
    ctx.fillStyle = "#f4efe4";
    ctx.fillRect(0, 0, w, 1.4);
    ctx.fillStyle = "#3e3a34";
    for (let i = 10; i < w - 6; i += 11) ctx.fillRect(i, 4, 2, 6);
    ctx.strokeStyle = "#c4b48a";
    ctx.lineWidth = 1;
    ctx.strokeRect(w / 2 - 6, 1, 12, 5);
    ctx.fillStyle = "#241c14";
    ctx.fillRect(w / 2 - 5, 2, 10, 3);
    ctx.strokeStyle = "#a89878";
    ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(11, 9);
    ctx.lineTo(11, h - 8);
    ctx.moveTo(17, 9);
    ctx.lineTo(17, h - 8);
    ctx.stroke();
    for (let ly = 14; ly < h - 10; ly += 5) {
      ctx.beginPath();
      ctx.moveTo(11, ly);
      ctx.lineTo(17, ly);
      ctx.stroke();
    }
    ctx.fillStyle = "#f2d48a";
    ctx.beginPath();
    ctx.arc(w - 16, 14, 1.7, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#5c574e";
    ctx.fillRect(5, h - 8, w - 10, 4);
    ctx.restore();
  }

  function paintBlock(ctx, block, castle) {
    if (block.type === "tower") paintTower(ctx, block);
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

  B.solidMask = function solidMask(block, castle) {
    if (block.type === "gap") return null;
    const elev = block.type === "cannon" ? castle.elevation : 0;
    const covered = block.covered ? 1 : 0;
    if (block._mask && block._maskElev === elev && block._maskCovered === covered) return block._mask;
    block._mask = bake(block, castle);
    block._maskElev = elev;
    block._maskCovered = covered;
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
    if (!block.live) return Infinity;
    const limit = radius * radius;
    let best = Infinity;
    for (const key in block.live) {
      const box = cellBox(block, key);
      const nx = Math.max(box.x, Math.min(x, box.x + box.w));
      const ny = Math.max(box.y, Math.min(y, box.y + box.h));
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

  B.drawScene = function drawScene(ctx, match, time) {
    const b = B.BALANCE;
    const w = b.viewW;
    const h = b.viewH;
    const sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, "#8eb7d2");
    sky.addColorStop(0.55, "#d5e6dc");
    sky.addColorStop(1, "#c4b48a");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = "rgba(255,244,214,0.9)";
    ctx.beginPath();
    ctx.arc(150, 78, 28, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "rgba(255,255,255,0.45)";
    const clouds = [];
    for (let base = 0; base < w; base += 960) {
      clouds.push([base + 220, 70], [base + 560, 48], [base + 760, 90]);
    }
    for (const cloud of clouds) {
      ctx.beginPath();
      ctx.ellipse(cloud[0], cloud[1], 46, 16, 0, 0, Math.PI * 2);
      ctx.ellipse(cloud[0] + 28, cloud[1] + 6, 30, 14, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = "#7ea35a";
    ctx.beginPath();
    ctx.moveTo(0, h);
    for (let x = 0; x <= w; x += 6) {
      const far = match.terrain.yAt(x) - 36 - Math.sin(x * 0.01) * 10;
      ctx.lineTo(x, far);
    }
    ctx.lineTo(w, h);
    ctx.fill();

    ctx.fillStyle = "#5f7d3f";
    ctx.beginPath();
    ctx.moveTo(0, h);
    for (let x = 0; x <= w; x += 4) ctx.lineTo(x, match.terrain.yAt(x));
    ctx.lineTo(w, h);
    ctx.fill();
    ctx.strokeStyle = "#3f562b";
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let x = 0; x <= w; x += 4) {
      const y = match.terrain.yAt(x);
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    for (const castle of [match.left, match.right]) {
      const width = b.cols * b.block;
      const gx = castle.originX + width / 2;
      ctx.fillStyle = "rgba(36, 28, 18, 0.22)";
      ctx.beginPath();
      ctx.ellipse(gx, match.terrain.yAt(gx) + 3, width * 0.46, 6, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    for (const castle of [match.left, match.right]) {
      paintBunkerShell(ctx, castle);
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

    if (match.phase === "aim" && match.turn === "left" && match.preview) {
      ctx.fillStyle = "rgba(255,244,220,0.55)";
      for (let i = 0; i < match.preview.length; i += 3) {
        const p = match.preview[i];
        ctx.fillRect(p.x - 1.5, p.y - 1.5, 3, 3);
      }
    }

    paintBits(ctx, match.fx);

    if (match.phase === "fly" && match.shot && match.shot.path.length) {
      const burn = match.shot.path;
      const tip = Math.min(burn.length - 1, Math.floor(match.shot.index));
      const from = Math.max(0, tip - 16);
      for (let i = from; i <= tip; i++) {
        const p = burn[i];
        const along = (i - from) / Math.max(1, tip - from);
        const radius = 2.2 + along * 6.5;
        ctx.globalAlpha = 0.18 + along * 0.7;
        const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, radius);
        glow.addColorStop(0, along > 0.7 ? "#fff4c2" : "#ff8a1e");
        glow.addColorStop(1, "rgba(255,60,10,0)");
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      const path = match.shot.path;
      const index = Math.max(0, Math.min(path.length - 1, match.shot.index));
      const i0 = Math.min(path.length - 1, Math.floor(index));
      const i1 = Math.min(path.length - 1, i0 + 1);
      const t = index - i0;
      const a = path[i0];
      const c = path[i1];
      const back = path[Math.max(0, i0 - 2)];
      const fore = path[Math.min(path.length - 1, i0 + 2)];
      const ang = Math.atan2(fore.y - back.y, fore.x - back.x);
      drawRocket(ctx, a.x + (c.x - a.x) * t, a.y + (c.y - a.y) * t, ang, time);
    }

    ctx.fillStyle = "#241c14";
    ctx.font = "16px Palatino, Georgia, serif";
    ctx.fillText("You", match.left.originX, match.left.padY + 22);
    ctx.fillText("Enemy", match.right.originX + b.cols * b.block + 12, match.right.padY - 8);
    const wind = Math.round(match.wind);
    const arrow = wind === 0 ? "still" : wind > 0 ? "→".repeat(Math.min(4, Math.ceil(wind / 12))) : "←".repeat(Math.min(4, Math.ceil(-wind / 12)));
    ctx.font = "18px Palatino, Georgia, serif";
    ctx.textAlign = "center";
    ctx.fillText("Wind " + wind + "  " + arrow, w / 2, 32);
    ctx.textAlign = "left";
  };
})();

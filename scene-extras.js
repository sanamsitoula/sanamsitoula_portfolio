// scene-extras.js — additional 3D objects + per-frame updates
// Each builder returns { group, update(time, dt, ctx) } so the main scene can
// just collect updates and call them in its loop.

import * as THREE from 'three';

// ─────────────────────────────────────────────────────────────────────────────
// Asteroid belt — instanced mesh of low-poly rocks spread along the camera path
export function buildAsteroids(palette, count = 80) {
  const geom = new THREE.IcosahedronGeometry(0.18, 0);
  // squash a few verts for irregular shape
  const pos = geom.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const s = 0.6 + Math.random() * 0.8;
    pos.setXYZ(i, pos.getX(i) * s, pos.getY(i) * (0.7 + Math.random() * 0.5), pos.getZ(i) * s);
  }
  geom.computeVertexNormals();

  const mat = new THREE.MeshStandardMaterial({
    color: 0x6a7290,
    roughness: 0.95,
    metalness: 0.05,
    flatShading: true,
  });

  const mesh = new THREE.InstancedMesh(geom, mat, count);
  const dummy = new THREE.Object3D();
  const data = [];

  for (let i = 0; i < count; i++) {
    // distribute along camera path z range, broad x/y spread
    const z = 8 - (i / count) * 64 + (Math.random() - 0.5) * 6;
    const x = (Math.random() - 0.5) * 26;
    const y = (Math.random() - 0.5) * 12;
    const scale = 0.4 + Math.random() * 1.6;

    data.push({
      basePos: new THREE.Vector3(x, y, z),
      scale,
      rotSpeed: new THREE.Vector3(
        (Math.random() - 0.5) * 0.4,
        (Math.random() - 0.5) * 0.4,
        (Math.random() - 0.5) * 0.4
      ),
      rot: new THREE.Vector3(Math.random() * Math.PI, Math.random() * Math.PI, 0),
      bobPhase: Math.random() * Math.PI * 2,
      bobAmp: 0.1 + Math.random() * 0.3,
      parallax: 0.15 + Math.random() * 0.35, // how much it reacts to scroll velocity
    });

    dummy.position.copy(data[i].basePos);
    dummy.rotation.set(data[i].rot.x, data[i].rot.y, data[i].rot.z);
    dummy.scale.setScalar(scale);
    dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix);
  }
  mesh.instanceMatrix.needsUpdate = true;

  const update = (time, dt, ctx) => {
    for (let i = 0; i < count; i++) {
      const d = data[i];
      d.rot.x += d.rotSpeed.x * dt;
      d.rot.y += d.rotSpeed.y * dt;
      d.rot.z += d.rotSpeed.z * dt;

      // scroll velocity → small directional push + scroll progress → vertical sweep
      const sx = ctx.scrollVel * d.parallax * 6;
      const sy = ctx.scrollVel * d.parallax * 3 + Math.sin(ctx.scroll * Math.PI * 2 + d.bobPhase) * d.parallax * 1.2;

      dummy.position.set(
        d.basePos.x + sx,
        d.basePos.y + sy + Math.sin(time * 0.4 + d.bobPhase) * d.bobAmp,
        d.basePos.z
      );
      dummy.rotation.set(d.rot.x, d.rot.y, d.rot.z);
      dummy.scale.setScalar(d.scale);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
  };

  return { group: mesh, update };
}

// ─────────────────────────────────────────────────────────────────────────────
// Comets — small glowing heads with trailing particles
export function buildComets(palette, count = 3) {
  const group = new THREE.Group();
  const comets = [];

  const colors = [palette.accent, palette.glow2, palette.glow1];

  for (let i = 0; i < count; i++) {
    const color = colors[i % colors.length];
    const cGroup = new THREE.Group();

    // head
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.12, 12, 12),
      new THREE.MeshBasicMaterial({ color })
    );
    cGroup.add(head);

    // glow halo (sprite)
    const haloTex = makeRadialGlowTexture();
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({
      map: haloTex,
      color,
      transparent: true,
      opacity: 0.8,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }));
    halo.scale.set(1.2, 1.2, 1);
    cGroup.add(halo);

    // trail — line of fading points
    const trailLen = 40;
    const trailGeom = new THREE.BufferGeometry();
    const trailPos = new Float32Array(trailLen * 3);
    const trailCol = new Float32Array(trailLen * 3);
    const c3 = new THREE.Color(color);
    for (let j = 0; j < trailLen; j++) {
      trailPos[j*3] = 0;
      trailPos[j*3+1] = 0;
      trailPos[j*3+2] = 0;
      trailCol[j*3]   = c3.r;
      trailCol[j*3+1] = c3.g;
      trailCol[j*3+2] = c3.b;
    }
    trailGeom.setAttribute('position', new THREE.BufferAttribute(trailPos, 3));
    trailGeom.setAttribute('color', new THREE.BufferAttribute(trailCol, 3));
    const trailMat = new THREE.PointsMaterial({
      size: 0.18,
      vertexColors: true,
      transparent: true,
      opacity: 0.7,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    });
    const trail = new THREE.Points(trailGeom, trailMat);
    group.add(trail);

    // path: a wide arc across the scene depth
    const startZ = 10 - i * 18;
    const path = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-15 - Math.random() * 5, 4 + Math.random() * 3, startZ),
      new THREE.Vector3(-5, 1 + Math.random() * 2, startZ - 8),
      new THREE.Vector3(5, -2 + Math.random() * 2, startZ - 18),
      new THREE.Vector3(15 + Math.random() * 5, -3, startZ - 28),
    ]);

    group.add(cGroup);
    comets.push({
      group: cGroup,
      head,
      halo,
      trail,
      trailPos,
      trailLen,
      path,
      progress: i / count,
      speed: 0.03 + Math.random() * 0.02,
      color: c3,
    });
  }

  const update = (time, dt, ctx) => {
    for (const c of comets) {
      c.progress += c.speed * dt * (1 + ctx.scrollVelAbs * 8);
      if (c.progress > 1) c.progress -= 1;
      const p = c.path.getPoint(c.progress);
      c.group.position.copy(p);

      // pulse halo
      c.halo.scale.setScalar(1 + Math.sin(time * 4) * 0.2);

      // shift trail buffer
      const arr = c.trailPos;
      for (let j = c.trailLen - 1; j > 0; j--) {
        arr[j*3]   = arr[(j-1)*3];
        arr[j*3+1] = arr[(j-1)*3+1];
        arr[j*3+2] = arr[(j-1)*3+2];
      }
      arr[0] = p.x; arr[1] = p.y; arr[2] = p.z;
      c.trail.geometry.attributes.position.needsUpdate = true;
    }
  };

  return { group, update, comets };
}

function makeRadialGlowTexture() {
  const size = 128;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(size/2, size/2, 0, size/2, size/2, size/2);
  g.addColorStop(0,   'rgba(255,255,255,1)');
  g.addColorStop(0.3, 'rgba(255,255,255,0.5)');
  g.addColorStop(1,   'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const t = new THREE.CanvasTexture(c);
  return t;
}

// ─────────────────────────────────────────────────────────────────────────────
// Holographic terminal panels — canvas-textured floating screens
export function buildHoloPanels(palette) {
  const group = new THREE.Group();
  const panels = [];

  const specs = [
    {
      pos: [3.2, 0.8, -3],
      rot: [0, -0.6, 0.05],
      lines: ['$ deploy production', '✓ build complete', '✓ tests passing', '✓ shipping...'],
      color: '#67e8f9',
    },
    {
      pos: [-4, 2.5, -10],
      rot: [0, 0.5, -0.05],
      lines: ['function think() {', '  const ideas = await', '    explore(unknown);', '  return ship(ideas);', '}'],
      color: '#a78bfa',
    },
    {
      pos: [3, 3.5, -19],
      rot: [-0.1, -0.4, 0],
      lines: ['// project: atlas', 'const copilot = new', '  Agent({ mode: "ops" });', 'copilot.observe(team);'],
      color: '#ec4899',
    },
    {
      pos: [-3.5, 2.8, -34],
      rot: [0.05, 0.5, 0.05],
      lines: ['model: gpt-4o', 'eval-set: 1,247 rows', 'pass@1: 92.4%', 'latency: 480ms'],
      color: '#67e8f9',
    },
    {
      pos: [-2, 5, -44],
      rot: [0, 0.4, -0.05],
      lines: ['neural.train({', '  layers: [16, 32, 8],', '  epochs: 1000,', '});'],
      color: '#a78bfa',
    },
  ];

  for (const s of specs) {
    const tex = makeTerminalTexture(s.lines, s.color);
    const w = 1.8, h = 1.1;
    const panel = new THREE.Group();

    const screen = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshBasicMaterial({
        map: tex,
        transparent: true,
        opacity: 0.92,
        side: THREE.DoubleSide,
        depthWrite: false,
      })
    );
    panel.add(screen);

    // additive glow behind
    const glow = new THREE.Mesh(
      new THREE.PlaneGeometry(w * 1.3, h * 1.3),
      new THREE.MeshBasicMaterial({
        color: s.color,
        transparent: true,
        opacity: 0.18,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
      })
    );
    glow.position.z = -0.02;
    panel.add(glow);

    // frame (line edges)
    const edges = new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.PlaneGeometry(w, h)),
      new THREE.LineBasicMaterial({ color: s.color, transparent: true, opacity: 0.7 })
    );
    panel.add(edges);

    panel.position.set(...s.pos);
    panel.rotation.set(...s.rot);
    panel.userData.basePos = panel.position.clone();
    panel.userData.baseRot = new THREE.Euler().copy(panel.rotation);
    panel.userData.phase = Math.random() * Math.PI * 2;
    panel.userData.parallax = 0.3 + Math.random() * 0.3;

    group.add(panel);
    panels.push(panel);
  }

  const update = (time, dt, ctx) => {
    for (const p of panels) {
      const u = p.userData;
      p.position.y = u.basePos.y + Math.sin(time * 0.5 + u.phase) * 0.12 + Math.sin(ctx.scroll * Math.PI * 3 + u.phase) * 0.4;
      p.position.x = u.basePos.x + ctx.scrollVel * u.parallax * 4;
      p.rotation.y = u.baseRot.y + Math.sin(time * 0.3 + u.phase) * 0.08 + ctx.scroll * Math.PI * 0.5;
    }
  };

  return { group, update, panels };
}

function makeTerminalTexture(lines, accent) {
  const w = 512, h = 320;
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d');

  // bg
  ctx.fillStyle = 'rgba(8, 14, 35, 0.92)';
  ctx.fillRect(0, 0, w, h);

  // top bar
  ctx.fillStyle = 'rgba(30, 40, 75, 0.95)';
  ctx.fillRect(0, 0, w, 36);

  // window dots
  ['#ff5f57', '#febc2e', '#28c840'].forEach((col, i) => {
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.arc(22 + i * 22, 18, 7, 0, Math.PI * 2);
    ctx.fill();
  });

  // title text
  ctx.font = '14px "JetBrains Mono", monospace';
  ctx.fillStyle = 'rgba(180, 195, 230, 0.7)';
  ctx.textAlign = 'center';
  ctx.fillText('~/portfolio', w / 2, 23);

  // accent stripe
  ctx.fillStyle = accent;
  ctx.fillRect(0, 35, w, 2);

  // body text
  ctx.font = '20px "JetBrains Mono", monospace';
  ctx.textAlign = 'left';
  lines.forEach((line, i) => {
    const y = 80 + i * 36;
    if (line.startsWith('$') || line.startsWith('//')) {
      ctx.fillStyle = accent;
    } else if (line.includes('✓')) {
      ctx.fillStyle = '#86efac';
    } else {
      ctx.fillStyle = '#e0e8ff';
    }
    ctx.fillText(line, 28, y);
  });

  // blinking cursor at last line
  ctx.fillStyle = accent;
  ctx.fillRect(28 + (lines[lines.length-1]?.length || 0) * 12.2, 80 + (lines.length - 1) * 36 - 18, 12, 22);

  // scanline subtle overlay
  for (let y = 0; y < h; y += 3) {
    ctx.fillStyle = 'rgba(255,255,255,0.015)';
    ctx.fillRect(0, y, w, 1);
  }

  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// ─────────────────────────────────────────────────────────────────────────────
// Floating laptop — simple low-poly device
export function buildLaptop(palette) {
  const g = new THREE.Group();

  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    metalness: 0.6,
    roughness: 0.4,
    flatShading: true,
  });
  const screenMat = new THREE.MeshBasicMaterial({
    color: palette.accent,
    transparent: true,
    opacity: 0.7,
  });

  // base
  const base = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.05, 0.9), bodyMat);
  g.add(base);

  // screen back
  const screenBack = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.9, 0.05), bodyMat);
  screenBack.position.set(0, 0.45, -0.42);
  screenBack.rotation.x = -0.15;
  g.add(screenBack);

  // screen front (glowing)
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 0.8), screenMat);
  screen.position.set(0, 0.45, -0.4);
  screen.rotation.x = -0.15;
  g.add(screen);

  // accent stripe across base
  const stripe = new THREE.Mesh(
    new THREE.PlaneGeometry(0.4, 0.02),
    new THREE.MeshBasicMaterial({ color: palette.accent })
  );
  stripe.position.set(0, 0.026, 0.3);
  stripe.rotation.x = -Math.PI / 2;
  g.add(stripe);

  g.position.set(-1.5, 0.4, -11);
  g.rotation.set(0.1, 0.7, 0.05);
  g.userData.basePos = g.position.clone();
  g.userData.baseRot = new THREE.Euler().copy(g.rotation);

  const update = (time, dt, ctx) => {
    g.position.y = g.userData.basePos.y + Math.sin(time * 0.7) * 0.15;
    g.rotation.y = g.userData.baseRot.y + Math.sin(time * 0.4) * 0.2;
    g.position.x = g.userData.basePos.x + ctx.scrollVel * 2;
  };

  return { group: g, update };
}

// ─────────────────────────────────────────────────────────────────────────────
// Wireframe accent orbs — large decorative wireframe icospheres
export function buildWireframeOrbs(palette) {
  const group = new THREE.Group();
  const orbs = [];

  const specs = [
    { pos: [-10, -3, -2],  r: 4, color: palette.glow1 },
    { pos: [12, 5, -32],   r: 5, color: palette.glow3 },
  ];

  for (const s of specs) {
    const geom = new THREE.IcosahedronGeometry(s.r, 1);
    const mat = new THREE.MeshBasicMaterial({
      color: s.color,
      wireframe: true,
      transparent: true,
      opacity: 0.18,
    });
    const orb = new THREE.Mesh(geom, mat);
    orb.position.set(...s.pos);
    group.add(orb);
    orbs.push(orb);
  }

  const update = (time, dt, ctx) => {
    orbs.forEach((o, i) => {
      o.rotation.x = time * 0.03 * (i ? -1 : 1) + ctx.scroll * Math.PI * 2;
      o.rotation.y = time * 0.05 + ctx.scroll * Math.PI * 3;
    });
  };

  return { group, update };
}

// ─────────────────────────────────────────────────────────────────────────────
// Data streams — particle flows along curves (binding the scene together)
export function buildDataStreams(palette) {
  const group = new THREE.Group();
  const streams = [];

  const curves = [
    new THREE.CatmullRomCurve3([
      new THREE.Vector3(2, 1, 2),   new THREE.Vector3(0, 2, -4),
      new THREE.Vector3(-2, 1, -10),new THREE.Vector3(0, 2, -16),
    ]),
    new THREE.CatmullRomCurve3([
      new THREE.Vector3(-2, 0, -16), new THREE.Vector3(0, 1.5, -22),
      new THREE.Vector3(2, 0.5, -28),new THREE.Vector3(-1, 1, -36),
    ]),
    new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 2, -36), new THREE.Vector3(0, 3, -42),
      new THREE.Vector3(0, 1.5, -48),new THREE.Vector3(0, 0.8, -54),
    ]),
  ];
  const colors = [palette.accent, palette.glow2, palette.accent];

  curves.forEach((curve, i) => {
    const N = 28;
    const geom = new THREE.BufferGeometry();
    const positions = new Float32Array(N * 3);
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      color: colors[i],
      size: 0.08,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });
    const pts = new THREE.Points(geom, mat);
    group.add(pts);
    streams.push({ pts, curve, N, offset: Math.random(), speed: 0.06 + i * 0.02 });
  });

  const update = (time, dt, ctx) => {
    for (const s of streams) {
      s.offset = (s.offset + s.speed * dt) % 1;
      const arr = s.pts.geometry.attributes.position.array;
      for (let i = 0; i < s.N; i++) {
        const t = (i / s.N + s.offset) % 1;
        const p = s.curve.getPoint(t);
        arr[i*3] = p.x;
        arr[i*3+1] = p.y;
        arr[i*3+2] = p.z;
      }
      s.pts.geometry.attributes.position.needsUpdate = true;
    }
  };

  return { group, update };
}

// ─────────────────────────────────────────────────────────────────────────────
// Floating geometric "logo" shapes — torus knot, dodecahedron, etc.
export function buildAccentShapes(palette) {
  const group = new THREE.Group();
  const shapes = [];

  const specs = [
    {
      geom: new THREE.TorusKnotGeometry(0.35, 0.1, 64, 8),
      pos: [-1.5, 3.5, -2],
      color: palette.accent,
    },
    {
      geom: new THREE.DodecahedronGeometry(0.4, 0),
      pos: [3, -1, -7],
      color: palette.glow2,
    },
    {
      geom: new THREE.TorusGeometry(0.4, 0.08, 12, 32),
      pos: [-2, -1.2, -16],
      color: palette.glow1,
    },
    {
      geom: new THREE.OctahedronGeometry(0.4, 0),
      pos: [2, 0.5, -25],
      color: palette.glow3,
    },
    {
      geom: new THREE.TetrahedronGeometry(0.45, 0),
      pos: [-1, 4, -40],
      color: palette.accent,
    },
  ];

  for (const s of specs) {
    const mat = new THREE.MeshStandardMaterial({
      color: s.color,
      emissive: s.color,
      emissiveIntensity: 0.35,
      metalness: 0.6,
      roughness: 0.3,
      flatShading: true,
    });
    const m = new THREE.Mesh(s.geom, mat);
    m.position.set(...s.pos);
    m.userData.basePos = m.position.clone();
    m.userData.spinX = (Math.random() - 0.5) * 0.8;
    m.userData.spinY = (Math.random() - 0.5) * 0.8;
    m.userData.phase = Math.random() * Math.PI * 2;
    group.add(m);
    shapes.push(m);
  }

  const update = (time, dt, ctx) => {
    for (const s of shapes) {
      s.rotation.x += s.userData.spinX * dt + ctx.scroll * 0.005;
      s.rotation.y += s.userData.spinY * dt + ctx.scroll * 0.005;
      s.position.y = s.userData.basePos.y + Math.sin(time * 0.6 + s.userData.phase) * 0.25 + Math.sin(ctx.scroll * Math.PI * 4 + s.userData.phase) * 0.5;
      s.position.x = s.userData.basePos.x + ctx.scrollVel * 1.5;
    }
  };

  return { group, update, shapes };
}

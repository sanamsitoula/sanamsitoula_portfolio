// scene.js — Three.js cosmic portfolio scene
// Cinematic camera follows a curve through deep-space waypoints as user scrolls.

import * as THREE from 'three';
import {
  buildAsteroids, buildComets, buildHoloPanels, buildLaptop,
  buildWireframeOrbs, buildDataStreams, buildAccentShapes
} from './scene-extras.js';

// ─────────────────────────────────────────────────────────────────────────────
// Palette (cosmic / nebula)

const PALETTES = {
  nebula: {
    bg:     0x05071a,
    fog:    0x0a0e2e,
    star:   0xe2e8f0,
    accent: 0x67e8f9,  // cyan
    glow1:  0x8b5cf6,  // violet
    glow2:  0xec4899,  // pink
    glow3:  0x3b82f6,  // blue
    skin:   0xf5d5b5,
    suit:   0x1e293b,
    book1:  0x67e8f9,
    book2:  0xec4899,
    book3:  0xa78bfa,
    book4:  0xf59e0b,
  },
  ember: {
    bg:     0x0a0410,
    fog:    0x1a0a20,
    star:   0xfde68a,
    accent: 0xf59e0b,
    glow1:  0xef4444,
    glow2:  0xf97316,
    glow3:  0xeab308,
    skin:   0xf5d5b5,
    suit:   0x2a1a1a,
    book1:  0xf59e0b,
    book2:  0xef4444,
    book3:  0xfde047,
    book4:  0xfb923c,
  },
  aurora: {
    bg:     0x020a1a,
    fog:    0x051a2a,
    star:   0xd1fae5,
    accent: 0x34d399,
    glow1:  0x10b981,
    glow2:  0x06b6d4,
    glow3:  0x6366f1,
    skin:   0xf5d5b5,
    suit:   0x064e3b,
    book1:  0x34d399,
    book2:  0x60a5fa,
    book3:  0xa78bfa,
    book4:  0xf472b6,
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Camera path — each entry is one section's waypoint

const WAYPOINTS = [
  { pos: [-1.5, 0.6, 8.5], look: [1.8, 0.4, 0]    }, // 0 hero  (camera looks toward avatar on the right)
  { pos: [4.5, 1.5, 2],     look: [-1, 0.5, -4]   }, // 1 about
  { pos: [-3.5, 2.2, -7],   look: [1, 1, -12]     }, // 2 skills
  { pos: [2.5, 3, -16],     look: [-1, 1.5, -22]  }, // 3 projects
  { pos: [-3, 1.2, -26],    look: [1, 0.8, -32]   }, // 4 experience
  { pos: [1.5, 4.5, -36],   look: [0, 2, -44]     }, // 5 AI
  { pos: [0, 1, -48],       look: [0, 0.8, -54]   }, // 6 contact
];

// ─────────────────────────────────────────────────────────────────────────────
// Public class

export class CosmicScene {
  constructor(canvas, opts = {}) {
    this.canvas = canvas;
    this.scroll = 0;        // 0..1 across full page
    this.targetScroll = 0;
    this.prevScroll = 0;
    this.scrollVel = 0;      // signed scroll delta this frame (smoothed)
    this.scrollVelAbs = 0;   // unsigned
    this.mouse = { x: 0, y: 0 };
    this.targetMouse = { x: 0, y: 0 };
    this.time = 0;
    this.extraUpdates = [];
    this.hoverable = [];     // meshes raycaster checks
    this.hovered = null;
    this.density = opts.density ?? 1;
    this.paletteName = opts.palette ?? 'nebula';
    this.palette = PALETTES[this.paletteName];

    this._initRenderer();
    this._initScene();
    this._buildCameraPath();
    this._buildStarfield();
    this._buildNebula();
    this._buildPlanets();
    this._buildAvatar();
    this._buildBooks();
    this._buildSkillsCluster();
    this._buildProjectCards();
    this._buildExperiencePath();
    this._buildAINetwork();
    this._buildContactBeacon();
    this._buildExtras();
    this._initListeners();
    this._initRaycaster();
    this._loop();
  }

  setPalette(name) {
    if (!PALETTES[name]) return;
    this.paletteName = name;
    const p = PALETTES[name];
    this.palette = p;
    this.scene.background = new THREE.Color(p.bg);
    this.scene.fog.color = new THREE.Color(p.fog);
    // recolor nebula sprites
    this.nebulaSprites?.forEach((s, i) => {
      const colors = [p.glow1, p.glow2, p.glow3, p.accent];
      s.material.color = new THREE.Color(colors[i % colors.length]);
    });
    // recolor books — spineMat is MeshBasicMaterial (no emissive)
    this.books?.forEach((b, i) => {
      const colors = [p.book1, p.book2, p.book3, p.book4];
      b.userData.spineMat.color = new THREE.Color(colors[i % colors.length]);
    });
    // accent things
    this.accentMats?.forEach(m => {
      m.color = new THREE.Color(p.accent);
      // only update emissive on materials that actually have it (Standard/Physical/Phong)
      if (m.isMeshStandardMaterial || m.isMeshPhongMaterial) {
        m.emissive = new THREE.Color(p.accent);
      }
    });
  }

  setDensity(d) {
    this.density = d;
    if (this.starsPoints) {
      this.starsPoints.forEach((p, i) => {
        const baseCount = this.starsBaseCount[i];
        const visible = Math.floor(baseCount * d);
        p.geometry.setDrawRange(0, visible);
      });
    }
  }

  setSpeed(s) { this.scrollSpeed = s; }

  // ────────────────────────────────────────────────────────────────────────
  // Hook in everything from scene-extras.js
  _buildExtras() {
    const p = this.palette;
    const extras = [
      buildWireframeOrbs(p),
      buildAsteroids(p, 70),
      buildAccentShapes(p),
      buildHoloPanels(p),
      buildLaptop(p),
      buildComets(p, 3),
      buildDataStreams(p),
    ];
    this.extras = {
      wireOrbs: extras[0], asteroids: extras[1], accents: extras[2],
      holos: extras[3], laptop: extras[4], comets: extras[5], streams: extras[6],
    };
    for (const e of extras) {
      this.scene.add(e.group);
      this.extraUpdates.push(e.update);
    }
  }

  _initRaycaster() {
    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2(-2, -2);
    // raycast targets — books
    if (this.books) this.hoverable.push(...this.books);

    this.canvas.addEventListener('pointermove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      this.pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    });

    // click ripple — spawn a transient pulse at the click depth
    this._ripples = [];
    this.canvas.addEventListener('pointerdown', (e) => {
      this._spawnRipple();
    });
  }

  _spawnRipple() {
    // Project pointer onto a plane in front of camera, spawn a ring there.
    const plane = new THREE.Plane(this.camera.getWorldDirection(new THREE.Vector3()), 0);
    const camPos = this.camera.position.clone();
    const camDir = this.camera.getWorldDirection(new THREE.Vector3());
    const target = camPos.clone().addScaledVector(camDir, 4);
    // offset by pointer
    const right = new THREE.Vector3().crossVectors(camDir, new THREE.Vector3(0, 1, 0)).normalize();
    const up = new THREE.Vector3().crossVectors(right, camDir).normalize();
    target.addScaledVector(right, this.pointer.x * 2.5);
    target.addScaledVector(up, this.pointer.y * 1.6);

    const ringMat = new THREE.MeshBasicMaterial({
      color: this.palette.accent,
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.05, 0.1, 32), ringMat);
    ring.position.copy(target);
    ring.lookAt(this.camera.position);
    this.scene.add(ring);
    this._ripples.push({ ring, life: 0, max: 0.9 });
  }

  _initRenderer() {
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: false,
      preserveDrawingBuffer: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight, false);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
  }

  _initScene() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(this.palette.bg);
    this.scene.fog = new THREE.Fog(this.palette.fog, 18, 70);

    this.camera = new THREE.PerspectiveCamera(
      55, window.innerWidth / window.innerHeight, 0.1, 200
    );
    this.camera.position.set(...WAYPOINTS[0].pos);

    // Soft ambient
    this.scene.add(new THREE.AmbientLight(0xb8c5ff, 0.45));

    // Key light (warm)
    const key = new THREE.DirectionalLight(0xfff0e6, 0.85);
    key.position.set(5, 8, 5);
    this.scene.add(key);

    // Rim light (cyan)
    const rim = new THREE.DirectionalLight(this.palette.accent, 0.6);
    rim.position.set(-4, 3, -2);
    this.scene.add(rim);

    this.accentMats = [];
  }

  _buildCameraPath() {
    const positions = WAYPOINTS.map(w => new THREE.Vector3(...w.pos));
    const targets   = WAYPOINTS.map(w => new THREE.Vector3(...w.look));
    this.posCurve  = new THREE.CatmullRomCurve3(positions, false, 'catmullrom', 0.5);
    this.lookCurve = new THREE.CatmullRomCurve3(targets,  false, 'catmullrom', 0.5);
  }

  // ─── Stars ──────────────────────────────────────────────────────────────
  _buildStarfield() {
    this.starsPoints = [];
    this.starsBaseCount = [];
    const layers = [
      { count: 2400, size: 0.04, range: 80, depthRange: [-60, 10],  twinkle: 0.5 },
      { count: 1400, size: 0.07, range: 60, depthRange: [-50, 5],   twinkle: 0.9 },
      { count: 600,  size: 0.14, range: 40, depthRange: [-40, 4],   twinkle: 1.4 },
    ];
    for (const layer of layers) {
      const geom = new THREE.BufferGeometry();
      const verts = new Float32Array(layer.count * 3);
      const colors = new Float32Array(layer.count * 3);
      const sizes = new Float32Array(layer.count);
      for (let i = 0; i < layer.count; i++) {
        verts[i*3]   = (Math.random() - 0.5) * layer.range;
        verts[i*3+1] = (Math.random() - 0.5) * layer.range * 0.7;
        verts[i*3+2] = layer.depthRange[0] + Math.random() * (layer.depthRange[1] - layer.depthRange[0]);
        // tint: mostly white, some accent
        const tint = Math.random();
        if (tint < 0.15) {
          // cyan
          colors[i*3]   = 0.5; colors[i*3+1] = 0.9; colors[i*3+2] = 1.0;
        } else if (tint < 0.25) {
          // pink
          colors[i*3]   = 1.0; colors[i*3+1] = 0.6; colors[i*3+2] = 0.85;
        } else if (tint < 0.32) {
          // gold
          colors[i*3]   = 1.0; colors[i*3+1] = 0.9; colors[i*3+2] = 0.6;
        } else {
          const w = 0.85 + Math.random() * 0.15;
          colors[i*3] = w; colors[i*3+1] = w; colors[i*3+2] = w;
        }
        sizes[i] = layer.size * (0.6 + Math.random() * 0.8);
      }
      geom.setAttribute('position', new THREE.BufferAttribute(verts, 3));
      geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      geom.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

      const mat = new THREE.PointsMaterial({
        size: layer.size,
        vertexColors: true,
        transparent: true,
        opacity: 0.95,
        depthWrite: false,
        sizeAttenuation: true,
        blending: THREE.AdditiveBlending,
      });
      const pts = new THREE.Points(geom, mat);
      pts.userData.twinkle = layer.twinkle;
      pts.userData.baseSize = layer.size;
      this.scene.add(pts);
      this.starsPoints.push(pts);
      this.starsBaseCount.push(layer.count);
    }
  }

  // ─── Nebula sprite clouds ───────────────────────────────────────────────
  _buildNebula() {
    const tex = this._makeNebulaTexture();
    const positions = [
      [-8, 2, -12],
      [10, -3, -22],
      [-12, 4, -32],
      [6, 5, -42],
      [-4, -2, -50],
      [3, 3, -8],
    ];
    const colors = [
      this.palette.glow1, this.palette.glow2, this.palette.glow3,
      this.palette.accent, this.palette.glow1, this.palette.glow2,
    ];
    this.nebulaSprites = [];
    positions.forEach((p, i) => {
      const mat = new THREE.SpriteMaterial({
        map: tex,
        color: colors[i],
        transparent: true,
        opacity: 0.42,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      const sp = new THREE.Sprite(mat);
      sp.position.set(...p);
      sp.scale.set(18 + Math.random() * 8, 18 + Math.random() * 8, 1);
      sp.userData.driftSpeed = 0.04 + Math.random() * 0.03;
      sp.userData.driftPhase = Math.random() * Math.PI * 2;
      sp.userData.basePos = sp.position.clone();
      this.scene.add(sp);
      this.nebulaSprites.push(sp);
    });
  }

  _makeNebulaTexture() {
    const size = 256;
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const ctx = c.getContext('2d');
    const g = ctx.createRadialGradient(size/2, size/2, 0, size/2, size/2, size/2);
    g.addColorStop(0,    'rgba(255,255,255,1)');
    g.addColorStop(0.15, 'rgba(255,255,255,0.65)');
    g.addColorStop(0.35, 'rgba(255,255,255,0.22)');
    g.addColorStop(0.6,  'rgba(255,255,255,0.06)');
    g.addColorStop(1,    'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    // add some noise
    const img = ctx.getImageData(0, 0, size, size);
    for (let i = 0; i < img.data.length; i += 4) {
      const n = (Math.random() - 0.5) * 30;
      img.data[i+3] = Math.max(0, Math.min(255, img.data[i+3] + n));
    }
    ctx.putImageData(img, 0, 0);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }

  // ─── Distant planets / orbs ─────────────────────────────────────────────
  _buildPlanets() {
    this.planets = [];
    const specs = [
      { pos: [-15, -2, -25], r: 3.5, color: this.palette.glow1, ring: false },
      { pos: [16, 6, -38],   r: 2.2, color: this.palette.glow3, ring: true  },
      { pos: [-12, 8, -50],  r: 1.8, color: this.palette.glow2, ring: false },
    ];
    specs.forEach(s => {
      const g = new THREE.Group();
      const planet = new THREE.Mesh(
        new THREE.IcosahedronGeometry(s.r, 1),
        new THREE.MeshStandardMaterial({
          color: s.color,
          emissive: s.color,
          emissiveIntensity: 0.25,
          flatShading: true,
          roughness: 0.85,
        })
      );
      g.add(planet);
      if (s.ring) {
        const ring = new THREE.Mesh(
          new THREE.RingGeometry(s.r * 1.4, s.r * 1.9, 64),
          new THREE.MeshBasicMaterial({
            color: this.palette.accent,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.4,
          })
        );
        ring.rotation.x = Math.PI / 2 - 0.3;
        ring.rotation.z = 0.2;
        g.add(ring);
      }
      g.position.set(...s.pos);
      g.userData.spin = (Math.random() - 0.5) * 0.06;
      this.scene.add(g);
      this.planets.push(g);
    });
  }

  // ─── Avatar (low-poly) ──────────────────────────────────────────────────
  _buildAvatar() {
    const g = new THREE.Group();
    const skin = new THREE.MeshStandardMaterial({
      color: this.palette.skin,
      roughness: 0.55,
      flatShading: true,
    });
    const suit = new THREE.MeshStandardMaterial({
      color: this.palette.suit,
      roughness: 0.4,
      metalness: 0.2,
      flatShading: true,
    });
    const accent = new THREE.MeshStandardMaterial({
      color: this.palette.accent,
      emissive: this.palette.accent,
      emissiveIntensity: 0.5,
      flatShading: true,
    });
    this.accentMats.push(accent);

    // Head — icosahedron
    const head = new THREE.Mesh(new THREE.IcosahedronGeometry(0.32, 0), skin);
    head.position.y = 0.95;
    g.add(head);

    // Hair cap (darker)
    const hairMat = new THREE.MeshStandardMaterial({
      color: 0x1a1410, roughness: 0.7, flatShading: true,
    });
    const hair = new THREE.Mesh(
      new THREE.SphereGeometry(0.34, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2.2),
      hairMat
    );
    hair.position.y = 1.02;
    g.add(hair);

    // Neck
    const neck = new THREE.Mesh(
      new THREE.CylinderGeometry(0.1, 0.12, 0.15, 6),
      skin
    );
    neck.position.y = 0.7;
    g.add(neck);

    // Torso — cone-ish
    const torsoGeom = new THREE.CylinderGeometry(0.28, 0.42, 0.95, 8);
    const torso = new THREE.Mesh(torsoGeom, suit);
    torso.position.y = 0.15;
    g.add(torso);

    // Chest accent stripe
    const chest = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.04, 0.02),
      accent
    );
    chest.position.set(0, 0.45, 0.35);
    g.add(chest);

    // Arms (slightly out, floating pose)
    const armGeom = new THREE.CylinderGeometry(0.07, 0.08, 0.7, 6);
    const armL = new THREE.Mesh(armGeom, suit);
    armL.position.set(-0.4, 0.2, 0);
    armL.rotation.z = 0.5;
    g.add(armL);
    const armR = armL.clone();
    armR.position.x = 0.4;
    armR.rotation.z = -0.5;
    g.add(armR);

    // Hands
    const handL = new THREE.Mesh(new THREE.IcosahedronGeometry(0.09, 0), skin);
    handL.position.set(-0.68, -0.05, 0);
    g.add(handL);
    const handR = handL.clone();
    handR.position.x = 0.68;
    g.add(handR);

    // Legs (crossed / floating)
    const legGeom = new THREE.CylinderGeometry(0.1, 0.11, 0.85, 6);
    const legL = new THREE.Mesh(legGeom, suit);
    legL.position.set(-0.15, -0.55, 0.05);
    legL.rotation.z = 0.2;
    legL.rotation.x = -0.3;
    g.add(legL);
    const legR = new THREE.Mesh(legGeom, suit);
    legR.position.set(0.15, -0.55, 0.05);
    legR.rotation.z = -0.2;
    legR.rotation.x = -0.3;
    g.add(legR);

    // Floor glow disc beneath
    const disc = new THREE.Mesh(
      new THREE.CircleGeometry(1.2, 32),
      new THREE.MeshBasicMaterial({
        color: this.palette.accent,
        transparent: true,
        opacity: 0.18,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      })
    );
    disc.rotation.x = -Math.PI / 2;
    disc.position.y = -1.05;
    g.add(disc);

    g.position.set(2.8, -0.3, 0);
    g.scale.setScalar(0.85);
    this.avatar = g;
    this.scene.add(g);
  }

  // ─── Floating books / documents ─────────────────────────────────────────
  _buildBooks() {
    this.books = [];
    const p = this.palette;
    const colors = [p.book1, p.book2, p.book3, p.book4];

    // a swarm of ~14 books spread along the camera path
    const specs = [
      // hero area
      { pos: [-2.2, 1.0, 2],    rot: [0.1, 0.4, 0.2],   size: [0.6, 0.08, 0.45] },
      { pos: [2.4, 1.5, 1.5],   rot: [-0.2, -0.3, 0.1], size: [0.5, 0.06, 0.4]  },
      { pos: [0, 2.4, -1],      rot: [0.3, 0.1, -0.1],  size: [0.55, 0.07, 0.42]},
      // about area
      { pos: [-1.5, 0.5, -4],   rot: [0.1, 0.6, 0],     size: [0.65, 0.08, 0.45] },
      { pos: [1.8, 1.8, -6],    rot: [-0.3, 0.2, 0.2],  size: [0.5, 0.07, 0.4]  },
      // skills area
      { pos: [-1, 0.4, -10],    rot: [0.4, -0.3, 0.1],  size: [0.55, 0.06, 0.42] },
      { pos: [2, 2.2, -13],     rot: [0.2, 0.4, -0.1],  size: [0.6, 0.08, 0.45] },
      // projects area
      { pos: [-2.5, 1, -18],    rot: [-0.1, 0.5, 0.2],  size: [0.65, 0.09, 0.5] },
      { pos: [2.3, 2.8, -20],   rot: [0.3, -0.2, 0],    size: [0.5, 0.07, 0.4] },
      // experience area
      { pos: [-1.8, 0.8, -28],  rot: [0.2, 0.3, 0.1],   size: [0.55, 0.08, 0.45] },
      { pos: [1.5, 1.6, -30],   rot: [-0.2, -0.4, 0.2], size: [0.6, 0.07, 0.42] },
      // AI area
      { pos: [-1, 3.5, -38],    rot: [0.1, 0.5, -0.1],  size: [0.5, 0.06, 0.38] },
      { pos: [2, 4.2, -42],     rot: [0.4, 0.2, 0],     size: [0.6, 0.08, 0.45] },
      // contact area
      { pos: [0, 1.5, -50],     rot: [0.2, 0.3, 0.1],   size: [0.55, 0.07, 0.4] },
    ];

    specs.forEach((s, i) => {
      const book = this._makeBook(s.size, colors[i % colors.length]);
      book.position.set(...s.pos);
      book.rotation.set(...s.rot);
      book.userData.basePos = book.position.clone();
      book.userData.baseRot = new THREE.Euler().copy(book.rotation);
      book.userData.floatSpeed = 0.4 + Math.random() * 0.4;
      book.userData.floatAmp = 0.15 + Math.random() * 0.15;
      book.userData.spinSpeed = (Math.random() - 0.5) * 0.4;
      book.userData.phase = Math.random() * Math.PI * 2;
      this.scene.add(book);
      this.books.push(book);
    });
  }

  _makeBook(size, color) {
    const g = new THREE.Group();
    const [w, h, d] = size;
    // cover
    const coverMat = new THREE.MeshStandardMaterial({
      color: color,
      roughness: 0.4,
      metalness: 0.1,
      emissive: color,
      emissiveIntensity: 0.18,
      flatShading: true,
    });
    const cover = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), coverMat);
    g.add(cover);
    // pages (slightly inset, off-white)
    const pages = new THREE.Mesh(
      new THREE.BoxGeometry(w * 0.96, h * 1.05, d * 0.92),
      new THREE.MeshStandardMaterial({
        color: 0xf5f1e8,
        roughness: 0.85,
        flatShading: true,
      })
    );
    g.add(pages);
    // spine highlight line
    const spineMat = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.95,
    });
    const spine = new THREE.Mesh(
      new THREE.PlaneGeometry(w * 0.55, h * 0.5),
      spineMat
    );
    spine.position.set(0, h / 2 + 0.001, 0);
    spine.rotation.x = -Math.PI / 2;
    g.add(spine);

    g.userData.spineMat = spineMat;
    return g;
  }

  // ─── Skills cluster — orbiting icosahedrons ─────────────────────────────
  _buildSkillsCluster() {
    const g = new THREE.Group();
    g.position.set(1, 1, -12);
    const center = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.5, 0),
      new THREE.MeshStandardMaterial({
        color: this.palette.accent,
        emissive: this.palette.accent,
        emissiveIntensity: 0.6,
        flatShading: true,
      })
    );
    g.add(center);

    const orbiters = [];
    const n = 7;
    for (let i = 0; i < n; i++) {
      const r = 1.4 + (i % 2) * 0.5;
      const angle = (i / n) * Math.PI * 2;
      const o = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.18 + Math.random() * 0.1, 0),
        new THREE.MeshStandardMaterial({
          color: [this.palette.glow1, this.palette.glow2, this.palette.glow3, this.palette.accent][i % 4],
          emissive: [this.palette.glow1, this.palette.glow2, this.palette.glow3, this.palette.accent][i % 4],
          emissiveIntensity: 0.4,
          flatShading: true,
        })
      );
      o.position.set(
        Math.cos(angle) * r,
        Math.sin(angle * 1.3) * 0.6,
        Math.sin(angle) * r
      );
      o.userData.baseAngle = angle;
      o.userData.radius = r;
      o.userData.yPhase = i;
      g.add(o);
      orbiters.push(o);
    }
    g.userData.orbiters = orbiters;
    g.userData.center = center;
    this.skillsGroup = g;
    this.scene.add(g);
  }

  // ─── Project cards — floating glass plates ──────────────────────────────
  _buildProjectCards() {
    this.projectCards = [];
    const positions = [
      { pos: [-2,  1.8, -19], rot: [0.05, 0.4,  0.02] },
      { pos: [0.5, 2.6, -21], rot: [-0.05, -0.1, -0.05] },
      { pos: [2.5, 1.4, -23], rot: [0.05, -0.5, 0.05] },
    ];
    positions.forEach((p, i) => {
      const card = new THREE.Group();
      const plate = new THREE.Mesh(
        new THREE.PlaneGeometry(1.6, 1.0),
        new THREE.MeshStandardMaterial({
          color: 0x0a1a3a,
          transparent: true,
          opacity: 0.55,
          roughness: 0.3,
          metalness: 0.2,
          emissive: 0x0a1a3a,
          emissiveIntensity: 0.2,
          side: THREE.DoubleSide,
        })
      );
      card.add(plate);
      // accent border
      const edgeGeom = new THREE.EdgesGeometry(new THREE.PlaneGeometry(1.6, 1.0));
      const edgeMat = new THREE.LineBasicMaterial({ color: this.palette.accent, transparent: true, opacity: 0.9 });
      this.accentMats.push(edgeMat);
      const edges = new THREE.LineSegments(edgeGeom, edgeMat);
      card.add(edges);
      // little circles representing UI
      for (let j = 0; j < 3; j++) {
        const dot = new THREE.Mesh(
          new THREE.CircleGeometry(0.04, 12),
          new THREE.MeshBasicMaterial({ color: [this.palette.glow2, this.palette.glow3, this.palette.accent][j] })
        );
        dot.position.set(-0.7 + j * 0.1, 0.42, 0.01);
        card.add(dot);
      }
      // header bar
      const bar = new THREE.Mesh(
        new THREE.PlaneGeometry(1.4, 0.06),
        new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5 })
      );
      bar.position.set(0.1, 0.25, 0.01);
      card.add(bar);
      const bar2 = bar.clone();
      bar2.material = bar.material.clone();
      bar2.scale.x = 0.6;
      bar2.position.y = 0.13;
      card.add(bar2);
      const bar3 = bar.clone();
      bar3.material = bar.material.clone();
      bar3.scale.x = 0.85;
      bar3.position.y = -0.05;
      card.add(bar3);
      const bar4 = bar.clone();
      bar4.material = bar.material.clone();
      bar4.scale.x = 0.4;
      bar4.position.y = -0.2;
      card.add(bar4);

      card.position.set(...p.pos);
      card.rotation.set(...p.rot);
      card.userData.basePos = card.position.clone();
      card.userData.phase = i * 0.7;
      this.scene.add(card);
      this.projectCards.push(card);
    });
  }

  // ─── Experience path — string of glowing nodes ─────────────────────────
  _buildExperiencePath() {
    this.expNodes = [];
    const baseZ = -28;
    const positions = [
      [-2.5, 0.5, baseZ + 0],
      [-1, 1.2, baseZ - 1.5],
      [0.5, 0.8, baseZ - 3],
      [2, 1.6, baseZ - 4.5],
      [-0.5, 1.0, baseZ - 6.2],
    ];
    positions.forEach((p, i) => {
      const node = new THREE.Mesh(
        new THREE.IcosahedronGeometry(0.18, 0),
        new THREE.MeshStandardMaterial({
          color: this.palette.accent,
          emissive: this.palette.accent,
          emissiveIntensity: 0.8,
          flatShading: true,
        })
      );
      node.position.set(...p);
      node.userData.phase = i * 0.6;
      this.scene.add(node);
      this.expNodes.push(node);

      // glow halo
      const halo = new THREE.Mesh(
        new THREE.RingGeometry(0.22, 0.32, 24),
        new THREE.MeshBasicMaterial({
          color: this.palette.accent,
          transparent: true,
          opacity: 0.4,
          side: THREE.DoubleSide,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        })
      );
      halo.position.copy(node.position);
      halo.lookAt(this.camera.position);
      node.userData.halo = halo;
      this.scene.add(halo);
    });

    // connecting line
    const curve = new THREE.CatmullRomCurve3(positions.map(p => new THREE.Vector3(...p)));
    const points = curve.getPoints(80);
    const lineGeom = new THREE.BufferGeometry().setFromPoints(points);
    const lineMat = new THREE.LineBasicMaterial({
      color: this.palette.accent,
      transparent: true,
      opacity: 0.5,
    });
    this.accentMats.push(lineMat);
    const line = new THREE.Line(lineGeom, lineMat);
    this.scene.add(line);
  }

  // ─── AI neural network ──────────────────────────────────────────────────
  _buildAINetwork() {
    const g = new THREE.Group();
    g.position.set(0, 2.5, -42);

    // 3 layers of nodes
    const layers = [
      { x: -1.6, count: 4 },
      { x: 0,    count: 5 },
      { x: 1.6,  count: 3 },
    ];
    const nodes = [];
    layers.forEach((layer, li) => {
      for (let i = 0; i < layer.count; i++) {
        const y = (i - (layer.count - 1) / 2) * 0.5;
        const node = new THREE.Mesh(
          new THREE.IcosahedronGeometry(0.12, 0),
          new THREE.MeshStandardMaterial({
            color: this.palette.glow1,
            emissive: this.palette.glow1,
            emissiveIntensity: 0.7,
            flatShading: true,
          })
        );
        node.position.set(layer.x, y, 0);
        node.userData.layer = li;
        node.userData.phase = li * 0.5 + i * 0.3;
        g.add(node);
        nodes.push(node);
      }
    });

    // connections between layers
    const linePositions = [];
    const lineColors = [];
    const accent = new THREE.Color(this.palette.accent);
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        if (nodes[j].userData.layer === nodes[i].userData.layer + 1) {
          linePositions.push(
            nodes[i].position.x, nodes[i].position.y, nodes[i].position.z,
            nodes[j].position.x, nodes[j].position.y, nodes[j].position.z
          );
          lineColors.push(accent.r, accent.g, accent.b, accent.r, accent.g, accent.b);
        }
      }
    }
    const lineGeom = new THREE.BufferGeometry();
    lineGeom.setAttribute('position', new THREE.Float32BufferAttribute(linePositions, 3));
    lineGeom.setAttribute('color', new THREE.Float32BufferAttribute(lineColors, 3));
    const lineMat = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.35,
    });
    const lines = new THREE.LineSegments(lineGeom, lineMat);
    g.add(lines);
    g.userData.nodes = nodes;

    this.aiNetwork = g;
    this.scene.add(g);
  }

  // ─── Contact beacon ─────────────────────────────────────────────────────
  _buildContactBeacon() {
    const g = new THREE.Group();
    g.position.set(0, 0.5, -54);

    // central glowing orb
    const orbMat = new THREE.MeshStandardMaterial({
      color: this.palette.accent,
      emissive: this.palette.accent,
      emissiveIntensity: 1.2,
      flatShading: true,
    });
    this.accentMats.push(orbMat);
    const orb = new THREE.Mesh(new THREE.IcosahedronGeometry(0.4, 1), orbMat);
    g.add(orb);

    // surrounding rings
    for (let i = 0; i < 3; i++) {
      const ringMat = new THREE.MeshBasicMaterial({
        color: this.palette.accent,
        transparent: true,
        opacity: 0.4 - i * 0.1,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      this.accentMats.push(ringMat);
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(0.6 + i * 0.3, 0.65 + i * 0.3, 64),
        ringMat
      );
      ring.userData.spin = (Math.random() - 0.5) * 0.4 + 0.1;
      g.add(ring);
    }

    this.contactBeacon = g;
    this.scene.add(g);
  }

  // ────────────────────────────────────────────────────────────────────────
  _initListeners() {
    window.addEventListener('resize', () => this._onResize());
    window.addEventListener('mousemove', (e) => {
      this.targetMouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      this.targetMouse.y = (e.clientY / window.innerHeight) * 2 - 1;
    });
    window.addEventListener('scroll', () => this._updateScroll(), { passive: true });
    this._updateScroll();
  }

  _onResize() {
    const w = window.innerWidth, h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h, false);
  }

  _updateScroll() {
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    this.targetScroll = maxScroll > 0 ? window.scrollY / maxScroll : 0;
  }

  _updateRaycast() {
    if (!this.hoverable.length) return;
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hits = this.raycaster.intersectObjects(this.hoverable, true);
    // unhover previous
    if (this.hovered && (!hits.length || hits[0].object.parent !== this.hovered)) {
      const mat = this.hovered.userData.spineMat;
      if (mat) {
        mat.opacity = 0.95;
      }
      this.hovered.userData.targetScale = 1;
      this.hovered = null;
      document.body.style.cursor = '';
    }
    if (hits.length) {
      const obj = hits[0].object.parent;
      if (obj !== this.hovered) {
        this.hovered = obj;
        document.body.style.cursor = 'pointer';
      }
      obj.userData.targetScale = 1.25;
    }
    // smooth scale on all books
    for (const b of this.books) {
      const target = b.userData.targetScale || 1;
      const cur = b.scale.x;
      const next = cur + (target - cur) * 0.15;
      b.scale.setScalar(next);
    }
  }

  // ────────────────────────────────────────────────────────────────────────
  _loop() {
    let last = performance.now();
    const tick = (now) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      this.time += dt;
      try {
        this._update(dt);
        this.renderer.render(this.scene, this.camera);
      } catch (err) {
        console.error('[scene tick]', err);
      }
      this._raf = requestAnimationFrame(tick);
    };
    this._raf = requestAnimationFrame(tick);
  }

  _update(dt) {
    // smooth scroll + mouse
    this.scroll += (this.targetScroll - this.scroll) * 0.08;
    this.mouse.x += (this.targetMouse.x - this.mouse.x) * 0.05;
    this.mouse.y += (this.targetMouse.y - this.mouse.y) * 0.05;

    // scroll velocity (signed, smoothed)
    const rawVel = (this.scroll - this.prevScroll) / Math.max(dt, 0.001);
    this.scrollVel += (rawVel - this.scrollVel) * 0.2;
    this.scrollVelAbs = Math.abs(this.scrollVel);
    this.prevScroll = this.scroll;

    const t = Math.max(0, Math.min(1, this.scroll));

    // Camera follows curve
    const camPos = this.posCurve.getPoint(t);
    const lookAt = this.lookCurve.getPoint(t);

    // mouse parallax
    camPos.x += this.mouse.x * 0.4;
    camPos.y += -this.mouse.y * 0.25;

    this.camera.position.copy(camPos);
    this.camera.lookAt(lookAt);

    // Avatar — gentle bob + look toward camera in first section + scroll-driven spin
    if (this.avatar) {
      this.avatar.position.y = -0.3 + Math.sin(this.time * 0.8) * 0.08;
      // strong scroll-driven rotation so the user immediately sees motion on scroll
      this.avatar.rotation.y = this.scroll * Math.PI * 6 + Math.sin(this.time * 0.3) * 0.15 + this.mouse.x * 0.15;
      const fadeOut = Math.max(0, 1 - this.scroll * 4);
      this.avatar.scale.setScalar(0.85 + fadeOut * 0.1);
    }

    // Books — float + spin + scroll-position drift
    if (this.books) {
      for (const b of this.books) {
        const u = b.userData;
        const scrollOffset = Math.sin(this.scroll * Math.PI * 3 + u.phase) * 0.5;
        b.position.y = u.basePos.y + Math.sin(this.time * u.floatSpeed + u.phase) * u.floatAmp + scrollOffset;
        b.position.x = u.basePos.x + Math.cos(this.time * u.floatSpeed * 0.7 + u.phase) * u.floatAmp * 0.5 + this.scrollVel * 2;
        b.rotation.x = u.baseRot.x + Math.sin(this.time * 0.4 + u.phase) * 0.15 + this.scroll * Math.PI;
        b.rotation.y = u.baseRot.y + this.time * u.spinSpeed * 0.3 + this.scroll * Math.PI * 2;
        b.rotation.z = u.baseRot.z + Math.cos(this.time * 0.3 + u.phase) * 0.1;
      }
    }

    // Nebula drift
    if (this.nebulaSprites) {
      for (const s of this.nebulaSprites) {
        const u = s.userData;
        s.position.x = u.basePos.x + Math.sin(this.time * u.driftSpeed + u.driftPhase) * 0.5;
        s.position.y = u.basePos.y + Math.cos(this.time * u.driftSpeed * 0.7 + u.driftPhase) * 0.3;
        s.material.rotation += dt * 0.02;
      }
    }

    // Planets spin
    if (this.planets) {
      for (const p of this.planets) {
        p.rotation.y += p.userData.spin * dt;
        p.rotation.x += p.userData.spin * 0.3 * dt;
      }
    }

    // Skills cluster — scroll-driven rotation
    if (this.skillsGroup) {
      this.skillsGroup.rotation.y = this.time * 0.15 + this.scroll * Math.PI * 4;
      this.skillsGroup.rotation.x = this.scroll * Math.PI * 2;
      const orbiters = this.skillsGroup.userData.orbiters;
      orbiters.forEach((o, i) => {
        const a = o.userData.baseAngle + this.time * 0.6 * (i % 2 ? 1 : -1);
        o.position.x = Math.cos(a) * o.userData.radius;
        o.position.z = Math.sin(a) * o.userData.radius;
        o.position.y = Math.sin(this.time + o.userData.yPhase) * 0.4;
        o.rotation.x = this.time * 0.5;
        o.rotation.y = this.time * 0.7;
      });
      this.skillsGroup.userData.center.rotation.x = this.time * 0.4;
      this.skillsGroup.userData.center.rotation.y = this.time * 0.6;
    }

    // Project cards bob + scroll drift
    if (this.projectCards) {
      for (const c of this.projectCards) {
        c.position.y = c.userData.basePos.y + Math.sin(this.time * 0.6 + c.userData.phase) * 0.18 + Math.sin(this.scroll * Math.PI * 4 + c.userData.phase) * 0.4;
        c.rotation.y += dt * 0.08;
        c.rotation.z = Math.sin(this.scroll * Math.PI * 2 + c.userData.phase) * 0.15;
      }
    }

    // Experience halos face camera + pulse
    if (this.expNodes) {
      for (const n of this.expNodes) {
        const pulse = 1 + Math.sin(this.time * 1.5 + n.userData.phase) * 0.2;
        n.scale.setScalar(pulse);
        if (n.userData.halo) {
          n.userData.halo.lookAt(this.camera.position);
          n.userData.halo.scale.setScalar(pulse * 1.1);
        }
      }
    }

    // AI network pulses + scroll spin
    if (this.aiNetwork) {
      this.aiNetwork.rotation.y = Math.sin(this.time * 0.2) * 0.3 + this.scroll * Math.PI * 3;
      this.aiNetwork.rotation.x = this.scroll * Math.PI * 1.5;
      this.aiNetwork.userData.nodes.forEach((n) => {
        const pulse = 1 + Math.sin(this.time * 2 + n.userData.phase) * 0.3;
        n.scale.setScalar(pulse);
        n.material.emissiveIntensity = 0.4 + Math.sin(this.time * 2 + n.userData.phase) * 0.4;
      });
    }

    // Contact beacon
    if (this.contactBeacon) {
      this.contactBeacon.rotation.y = this.time * 0.3;
      this.contactBeacon.children.forEach((c, i) => {
        if (i === 0) {
          c.rotation.x = this.time * 0.5;
          c.rotation.y = this.time * 0.6;
        } else if (c.userData.spin) {
          c.rotation.z += c.userData.spin * dt;
        }
      });
    }

    // Star twinkle (scale subtle)
    if (this.starsPoints) {
      this.starsPoints.forEach((p) => {
        p.material.opacity = 0.7 + Math.sin(this.time * p.userData.twinkle) * 0.25;
      });
    }

    // Extras (asteroids, comets, holos, etc.) get a ctx with scroll velocity + progress
    const ctx = {
      scrollVel: this.scrollVel,
      scrollVelAbs: this.scrollVelAbs,
      scroll: this.scroll,
    };
    for (const u of this.extraUpdates) u(this.time, dt, ctx);

    // Raycast for hover effects on books
    this._updateRaycast();

    // Update ripples
    if (this._ripples && this._ripples.length) {
      const alive = [];
      for (const r of this._ripples) {
        r.life += dt;
        const t = r.life / r.max;
        if (t >= 1) {
          this.scene.remove(r.ring);
          r.ring.geometry.dispose();
          r.ring.material.dispose();
        } else {
          const s = 1 + t * 22;
          r.ring.scale.setScalar(s);
          r.ring.material.opacity = 0.9 * (1 - t);
          alive.push(r);
        }
      }
      this._ripples = alive;
    }
  }
}

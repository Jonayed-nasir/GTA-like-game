import * as THREE from 'three';

export interface FacadeTexturePair {
  map: THREE.CanvasTexture;
  emissiveMap: THREE.CanvasTexture;
}

export class TextureFactory {
  private maxAnisotropy: number;
  private textures: THREE.Texture[] = [];

  constructor(maxAnisotropy: number) {
    this.maxAnisotropy = maxAnisotropy;
  }

  private configure(
    canvas: HTMLCanvasElement,
    isColor = true,
    repeatX = 1,
    repeatY = 1
  ): THREE.CanvasTexture {
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = isColor ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(repeatX, repeatY);
    tex.anisotropy = this.maxAnisotropy;
    tex.needsUpdate = true;
    this.textures.push(tex);
    return tex;
  }

  public createAsphaltTexture(): THREE.CanvasTexture {
    const c = document.createElement('canvas');
    c.width = 512;
    c.height = 512;
    const ctx = c.getContext('2d')!;

    ctx.fillStyle = '#2d3138';
    ctx.fillRect(0, 0, 512, 512);

    // Fine aggregate mineral grain
    for (let i = 0; i < 9500; i++) {
      const x = Math.random() * 512;
      const y = Math.random() * 512;
      const v = 34 + Math.floor(Math.random() * 34);
      ctx.fillStyle = `rgb(${v},${v + 2},${v + 5})`;
      ctx.fillRect(x, y, 2, 2);
    }

    // Tire wear tracks
    const grad = ctx.createLinearGradient(0, 0, 512, 0);
    grad.addColorStop(0, 'rgba(18,20,24,0)');
    grad.addColorStop(0.25, 'rgba(18,20,24,0.22)');
    grad.addColorStop(0.5, 'rgba(18,20,24,0.04)');
    grad.addColorStop(0.75, 'rgba(18,20,24,0.22)');
    grad.addColorStop(1, 'rgba(18,20,24,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 512);

    // Subtle patched tarmac cracks
    ctx.strokeStyle = 'rgba(20,22,26,0.45)';
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 6; i++) {
      ctx.beginPath();
      let px = Math.random() * 512;
      let py = Math.random() * 512;
      ctx.moveTo(px, py);
      for (let s = 0; s < 5; s++) {
        px += (Math.random() - 0.5) * 60;
        py += Math.random() * 45;
        ctx.lineTo(px, py);
      }
      ctx.stroke();
    }

    return this.configure(c, true, 1, 1);
  }

  public createFootpathTexture(): THREE.CanvasTexture {
    const c = document.createElement('canvas');
    c.width = 256;
    c.height = 256;
    const ctx = c.getContext('2d')!;

    ctx.fillStyle = '#9b9890';
    ctx.fillRect(0, 0, 256, 256);

    // Concrete Dhaka footpath paving blocks
    const step = 32;
    for (let y = 0; y < 256; y += step) {
      for (let x = 0; x < 256; x += step) {
        const shade = 142 + Math.floor(Math.random() * 20);
        const isAccent = (x / step + y / step) % 4 === 0;
        ctx.fillStyle = isAccent
          ? `rgb(${shade + 12}, ${shade - 8}, ${shade - 12})`
          : `rgb(${shade}, ${shade - 2}, ${shade - 6})`;
        ctx.fillRect(x + 1, y + 1, step - 2, step - 2);
      }
    }

    // Weathering grit
    for (let i = 0; i < 1200; i++) {
      ctx.fillStyle = 'rgba(40,38,34,0.12)';
      ctx.fillRect(Math.random() * 256, Math.random() * 256, 2, 2);
    }

    return this.configure(c, true, 8, 8);
  }

  public createDhakaCurbTexture(): THREE.CanvasTexture {
    const c = document.createElement('canvas');
    c.width = 256;
    c.height = 64;
    const ctx = c.getContext('2d')!;
    // Signature Dhaka yellow & charcoal curb painting
    ctx.fillStyle = '#e5b82e';
    ctx.fillRect(0, 0, 128, 64);
    ctx.fillStyle = '#24272c';
    ctx.fillRect(128, 0, 128, 64);

    // Road dust smudge near bottom
    const g = ctx.createLinearGradient(0, 0, 0, 64);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(35,30,25,0.45)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 256, 64);

    return this.configure(c, true, 6, 1);
  }

  public createGlassTowerFacade(tintHex: string): FacadeTexturePair {
    const albedo = document.createElement('canvas');
    albedo.width = 512;
    albedo.height = 512;
    const ctx = albedo.getContext('2d')!;

    const emissive = document.createElement('canvas');
    emissive.width = 512;
    emissive.height = 512;
    const ectx = emissive.getContext('2d')!;

    ctx.fillStyle = '#1f2833';
    ctx.fillRect(0, 0, 512, 512);
    ectx.fillStyle = '#000000';
    ectx.fillRect(0, 0, 512, 512);

    const cols = 8;
    const rows = 10;
    const cw = 512 / cols;
    const rh = 512 / rows;

    for (let r = 0; r < rows; r++) {
      // Floor slab spandrel
      ctx.fillStyle = '#2d3744';
      ctx.fillRect(0, r * rh, 512, 10);

      for (let col = 0; col < cols; col++) {
        const wx = col * cw + 4;
        const wy = r * rh + 12;
        const ww = cw - 8;
        const wh = rh - 16;

        // Reflective glass gradient
        const g = ctx.createLinearGradient(wx, wy, wx, wy + wh);
        g.addColorStop(0, tintHex);
        g.addColorStop(0.55, '#1d3247');
        g.addColorStop(1, '#12202e');
        ctx.fillStyle = g;
        ctx.fillRect(wx, wy, ww, wh);

        // Interior blinds hint
        if (Math.random() > 0.45) {
          ctx.fillStyle = 'rgba(215, 226, 238, 0.14)';
          ctx.fillRect(wx, wy, ww, wh * 0.4);
        }

        // Emissive office lights for night
        if (Math.random() > 0.36) {
          const warm = Math.random() > 0.35;
          ectx.fillStyle = warm ? '#ffd89a' : '#b7e2ff';
          ectx.fillRect(wx + 2, wy + 2, ww - 4, wh - 4);
        }
      }
    }

    // Aluminum mullions
    ctx.fillStyle = '#475569';
    for (let col = 0; col <= cols; col++) {
      ctx.fillRect(col * cw - 2, 0, 4, 512);
    }

    return {
      map: this.configure(albedo, true, 1, 1),
      emissiveMap: this.configure(emissive, true, 1, 1),
    };
  }

  public createDhakaBuildingFacade(
    baseColor: string,
    trimColor: string,
    cols = 6,
    rows = 7
  ): FacadeTexturePair {
    const albedo = document.createElement('canvas');
    albedo.width = 512;
    albedo.height = 512;
    const ctx = albedo.getContext('2d')!;

    const emissive = document.createElement('canvas');
    emissive.width = 512;
    emissive.height = 512;
    const ectx = emissive.getContext('2d')!;

    ctx.fillStyle = baseColor;
    ctx.fillRect(0, 0, 512, 512);
    ectx.fillStyle = '#000000';
    ectx.fillRect(0, 0, 512, 512);

    // Monsoon weathering streaks & plaster grain
    for (let i = 0; i < 2400; i++) {
      ctx.fillStyle = Math.random() > 0.5 ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.05)';
      ctx.fillRect(Math.random() * 512, Math.random() * 512, 3, 6);
    }

    const cw = 512 / cols;
    const rh = 512 / rows;

    for (let r = 0; r < rows; r++) {
      // Concrete floor band
      ctx.fillStyle = trimColor;
      ctx.fillRect(0, r * rh, 512, 8);

      // Subtle monsoon damp stain under ledge
      const damp = ctx.createLinearGradient(0, r * rh + 8, 0, r * rh + 24);
      damp.addColorStop(0, 'rgba(30,28,24,0.22)');
      damp.addColorStop(1, 'rgba(30,28,24,0)');
      ctx.fillStyle = damp;
      ctx.fillRect(0, r * rh + 8, 512, 16);

      for (let col = 0; col < cols; col++) {
        const wx = col * cw + 12;
        const wy = r * rh + 16;
        const ww = cw - 24;
        const wh = rh - 26;

        // Window recess & Dhaka iron grille bars
        ctx.fillStyle = '#1d2530';
        ctx.fillRect(wx, wy, ww, wh);
        ctx.strokeStyle = trimColor;
        ctx.lineWidth = 3;
        ctx.strokeRect(wx, wy, ww, wh);

        // Glass pane glare
        ctx.fillStyle = 'rgba(130, 165, 195, 0.25)';
        ctx.fillRect(wx + 3, wy + 3, ww * 0.45, wh - 6);

        // Horizontal grille lines
        ctx.strokeStyle = 'rgba(20, 24, 30, 0.55)';
        ctx.lineWidth = 1.5;
        for (let gy = wy + 8; gy < wy + wh - 4; gy += 9) {
          ctx.beginPath();
          ctx.moveTo(wx, gy);
          ctx.lineTo(wx + ww, gy);
          ctx.stroke();
        }

        // Occasional balcony railing or AC unit silhouette
        if ((r + col) % 3 === 0) {
          ctx.fillStyle = '#cfd4d9';
          ctx.fillRect(wx + ww - 18, wy + wh - 12, 16, 10);
          ctx.fillStyle = '#333b44';
          ctx.beginPath();
          ctx.arc(wx + ww - 11, wy + wh - 7, 3.5, 0, Math.PI * 2);
          ctx.fill();
        }

        // Warm apartment interior lights at night
        if (Math.random() > 0.45) {
          ectx.fillStyle = Math.random() > 0.25 ? '#ffca7a' : '#d6eeff';
          ectx.fillRect(wx + 3, wy + 3, ww - 6, wh - 6);
        }
      }
    }

    return {
      map: this.configure(albedo, true, 1, 1),
      emissiveMap: this.configure(emissive, true, 1, 1),
    };
  }

  /**
   * Colorful Dhaka street-art / rickshaw-art concrete flyover pier mural
   */
  public createFlyoverMuralTexture(variant = 0): THREE.CanvasTexture {
    const c = document.createElement('canvas');
    c.width = 512;
    c.height = 512;
    const ctx = c.getContext('2d')!;

    const palettes = [
      ['#f59e0b', '#e11d48', '#0284c7', '#10b981', '#fef3c7'],
      ['#7c3aed', '#ec4899', '#14b8a6', '#facc15', '#f8fafc'],
      ['#0ea5e9', '#f97316', '#ef4444', '#22c55e', '#fde68a'],
    ];
    const pal = palettes[variant % palettes.length];

    // Base weathered concrete
    ctx.fillStyle = '#9ca3af';
    ctx.fillRect(0, 0, 512, 512);

    // Bold horizontal mural bands inspired by Dhaka flyover pillars
    ctx.fillStyle = pal[0];
    ctx.fillRect(0, 60, 512, 390);

    // Geometric waves & rickshaw floral motifs
    ctx.fillStyle = pal[1];
    ctx.beginPath();
    ctx.moveTo(0, 140);
    for (let x = 0; x <= 512; x += 64) {
      ctx.quadraticCurveTo(x + 32, 95, x + 64, 140);
    }
    ctx.lineTo(512, 360);
    ctx.lineTo(0, 360);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = pal[2];
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.arc(64 + i * 128, 256, 46, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = pal[4];
      ctx.beginPath();
      ctx.arc(64 + i * 128, 256, 24, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = pal[3];
      ctx.beginPath();
      ctx.arc(64 + i * 128, 256, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = pal[2];
    }

    // Top & bottom concrete bands
    ctx.fillStyle = '#8b929e';
    ctx.fillRect(0, 0, 512, 58);
    ctx.fillRect(0, 448, 512, 64);

    // Urban concrete dust
    for (let i = 0; i < 1500; i++) {
      ctx.fillStyle = 'rgba(24,24,28,0.08)';
      ctx.fillRect(Math.random() * 512, Math.random() * 512, 3, 3);
    }

    return this.configure(c, true, 1, 1);
  }

  public createSignboardTexture(
    titleBn: string,
    subtitleEn: string,
    bgHex: string,
    accentHex: string
  ): THREE.CanvasTexture {
    const c = document.createElement('canvas');
    c.width = 512;
    c.height = 160;
    const ctx = c.getContext('2d')!;

    ctx.fillStyle = bgHex;
    ctx.fillRect(0, 0, 512, 160);

    ctx.strokeStyle = accentHex;
    ctx.lineWidth = 8;
    ctx.strokeRect(8, 8, 496, 144);

    ctx.fillStyle = '#ffffff';
    ctx.font = '700 44px "Noto Sans Bengali", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(titleBn, 256, 66);

    ctx.fillStyle = accentHex;
    ctx.font = '700 22px "Chakra Petch", sans-serif';
    ctx.fillText(subtitleEn.toUpperCase(), 256, 118);

    return this.configure(c, true, 1, 1);
  }

  public createContactShadowTexture(): THREE.CanvasTexture {
    const c = document.createElement('canvas');
    c.width = 128;
    c.height = 128;
    const ctx = c.getContext('2d')!;
    const grad = ctx.createRadialGradient(64, 64, 10, 64, 64, 60);
    grad.addColorStop(0, 'rgba(0, 0, 0, 0.58)');
    grad.addColorStop(0.6, 'rgba(0, 0, 0, 0.24)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 128);
    return this.configure(c, true, 1, 1);
  }

  public dispose(): void {
    this.textures.forEach((t) => t.dispose());
    this.textures = [];
  }
}

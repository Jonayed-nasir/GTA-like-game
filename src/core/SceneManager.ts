import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { GraphicsQuality } from '../types/game';

export function detectSoftwareWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param) || '');
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
}

export class SceneManager {
  public readonly scene: THREE.Scene;
  public readonly camera: THREE.PerspectiveCamera;
  public readonly renderer: THREE.WebGLRenderer;
  public readonly isSoftwareGl: boolean;
  public readonly isMobileTouch: boolean;
  public readonly maxAnisotropy: number;

  private container: HTMLElement;
  private envRenderTarget: THREE.WebGLRenderTarget | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private onContextLostCb: (() => void) | null = null;
  private onContextRestoredCb: (() => void) | null = null;
  private handleContextLost: (e: Event) => void;
  private handleContextRestored: () => void;
  private exteriorFog: THREE.FogExp2;

  // Adaptive 60 FPS Dynamic Resolution Governor
  private basePixelRatio = 1.0;
  private dynamicDprScale = 1.0;
  private frameTimeSumMs = 0;
  private frameSampleCount = 0;

  constructor(container: HTMLElement, initialQuality: GraphicsQuality) {
    this.container = container;
    this.isSoftwareGl = detectSoftwareWebGL();
    this.isMobileTouch =
      typeof window !== 'undefined' &&
      ('ontouchstart' in window || navigator.maxTouchPoints > 0 || window.innerWidth <= 960);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x9ab8d4);
    this.exteriorFog = new THREE.FogExp2(0xa7c0d6, 0.0042);
    this.scene.fog = this.exteriorFog;

    const width = Math.max(container.clientWidth, 1);
    const height = Math.max(container.clientHeight, 1);

    this.camera = new THREE.PerspectiveCamera(62, width / height, 0.15, 420);
    this.camera.position.set(0, 6, 14);

    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl && initialQuality !== 'LOW',
      powerPreference: 'high-performance',
      stencil: false,
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.setSize(width, height);
    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.container.appendChild(this.renderer.domElement);

    this.maxAnisotropy = Math.min(this.renderer.capabilities.getMaxAnisotropy(), 8);

    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    const roomEnv = new RoomEnvironment();
    this.envRenderTarget = pmremGenerator.fromScene(roomEnv, 0.04);
    this.scene.environment = this.envRenderTarget.texture;
    this.scene.environmentIntensity = 0.65;
    roomEnv.dispose();
    pmremGenerator.dispose();

    this.applyQuality(initialQuality);

    this.handleContextLost = (e: Event) => {
      e.preventDefault();
      this.onContextLostCb?.();
    };
    this.handleContextRestored = () => {
      this.onContextRestoredCb?.();
    };
    this.renderer.domElement.addEventListener('webglcontextlost', this.handleContextLost, false);
    this.renderer.domElement.addEventListener(
      'webglcontextrestored',
      this.handleContextRestored,
      false
    );

    this.resizeObserver = new ResizeObserver(() => this.handleResize());
    this.resizeObserver.observe(this.container);
    window.addEventListener('resize', this.handleResize);
    window.addEventListener('orientationchange', this.handleOrientationResize);
    window.visualViewport?.addEventListener('resize', this.handleResize);
  }

  private handleOrientationResize = (): void => {
    window.setTimeout(this.handleResize, 120);
  };

  public setInteriorMode(inInterior: boolean): void {
    if (inInterior) {
      this.scene.fog = null;
      this.scene.background = new THREE.Color(0x141820);
      this.scene.environmentIntensity = 0.55;
    } else {
      this.scene.fog = this.exteriorFog;
      this.scene.background = new THREE.Color(0x9ab8d4);
    }
  }

  public setContextHandlers(onLost: () => void, onRestored: () => void): void {
    this.onContextLostCb = onLost;
    this.onContextRestoredCb = onRestored;
  }

  public applyQuality(quality: GraphicsQuality): void {
    const dpr = window.devicePixelRatio || 1;
    if (this.isSoftwareGl) {
      this.basePixelRatio = 1;
      this.dynamicDprScale = 1;
      this.renderer.setPixelRatio(1);
      this.renderer.shadowMap.enabled = false;
      this.camera.far = 360;
      this.camera.updateProjectionMatrix();
      return;
    }

    const mobile = this.isMobileTouch;
    switch (quality) {
      case 'LOW':
        this.basePixelRatio = Math.min(dpr, mobile ? 0.88 : 1.0);
        this.renderer.shadowMap.enabled = false;
        this.camera.far = mobile ? 240 : 270;
        break;
      case 'MEDIUM':
        this.basePixelRatio = Math.min(dpr, mobile ? 1.08 : 1.35);
        // Contact shadows stay active; skip costly mobile shadow maps on MEDIUM for 60 FPS lock
        this.renderer.shadowMap.enabled = !mobile;
        this.camera.far = mobile ? 310 : 350;
        break;
      case 'HIGH':
        this.basePixelRatio = Math.min(dpr, mobile ? 1.25 : 1.75);
        this.renderer.shadowMap.enabled = true;
        this.camera.far = mobile ? 360 : 410;
        break;
      case 'ULTRA':
        this.basePixelRatio = Math.min(dpr, mobile ? 1.45 : 2.0);
        this.renderer.shadowMap.enabled = true;
        this.camera.far = 480;
        break;
    }
    this.dynamicDprScale = 1.0;
    this.renderer.setPixelRatio(this.basePixelRatio);
    this.camera.updateProjectionMatrix();
  }

  /**
   * Zero-lag 60 FPS Governor: samples rolling 28-frame frame times and smoothly
   * adjusts dynamic render scale (0.72..1.0) so mobile Android WebView never lags.
   */
  public updateAdaptivePerformance(frameMs: number): void {
    if (this.isSoftwareGl || frameMs > 120) return;
    this.frameTimeSumMs += frameMs;
    this.frameSampleCount += 1;
    if (this.frameSampleCount < 28) return;

    const avgMs = this.frameTimeSumMs / this.frameSampleCount;
    this.frameTimeSumMs = 0;
    this.frameSampleCount = 0;

    let nextScale = this.dynamicDprScale;
    if (avgMs > 21.5 && nextScale > 0.72) {
      nextScale = Math.max(0.72, nextScale - 0.08);
    } else if (avgMs < 14.5 && nextScale < 1.0) {
      nextScale = Math.min(1.0, nextScale + 0.05);
    }

    if (Math.abs(nextScale - this.dynamicDprScale) >= 0.03) {
      this.dynamicDprScale = nextScale;
      const targetRatio = Math.max(0.68, this.basePixelRatio * this.dynamicDprScale);
      this.renderer.setPixelRatio(targetRatio);
    }
  }

  public prewarmShaders(): void {
    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }
  }

  public handleResize = (): void => {
    const width = Math.max(this.container.clientWidth, 1);
    const height = Math.max(this.container.clientHeight, 1);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height, false);
  };

  public render(): void {
    this.renderer.render(this.scene, this.camera);
  }

  public afterDraw(cb: () => void, setTimerId: (id: number) => void): void {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    if (typeof gl.fenceSync === 'function') {
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          setTimerId(window.setTimeout(poll, 5));
        } else {
          if (sync) gl.deleteSync(sync);
          setTimerId(window.setTimeout(cb, 80));
        }
      };
      setTimerId(window.setTimeout(poll, 5));
    } else {
      setTimerId(window.setTimeout(cb, 80));
    }
  }

  public dispose(): void {
    window.removeEventListener('resize', this.handleResize);
    window.removeEventListener('orientationchange', this.handleOrientationResize);
    window.visualViewport?.removeEventListener('resize', this.handleResize);
    this.resizeObserver?.disconnect();
    this.renderer.domElement.removeEventListener('webglcontextlost', this.handleContextLost);
    this.renderer.domElement.removeEventListener('webglcontextrestored', this.handleContextRestored);

    const disposedTextures = new Set<THREE.Texture>();
    const disposeMaterial = (m: THREE.Material) => {
      const std = m as THREE.MeshStandardMaterial;
      if (std.map && !disposedTextures.has(std.map)) {
        std.map.dispose();
        disposedTextures.add(std.map);
      }
      if (std.emissiveMap && !disposedTextures.has(std.emissiveMap)) {
        std.emissiveMap.dispose();
        disposedTextures.add(std.emissiveMap);
      }
      m.dispose();
    };

    this.scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh || obj instanceof THREE.InstancedMesh) {
        obj.geometry?.dispose();
        if (Array.isArray(obj.material)) {
          obj.material.forEach(disposeMaterial);
        } else if (obj.material) {
          disposeMaterial(obj.material);
        }
      }
    });

    this.envRenderTarget?.dispose();
    this.renderer.dispose();
    if (this.renderer.domElement.parentElement === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}

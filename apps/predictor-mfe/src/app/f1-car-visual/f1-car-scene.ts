import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { createF1Car } from './f1-car-model';

export type CarView = 'perspective' | 'side' | 'top';
export interface CarSetup {
  teamColor: string;
  tyreColor: string;
  tyres: string;
  weather: string;
  downforce: string;
  isLoading: boolean;
  /** Seconds per wheel revolution, preserving the compound's original speed. */
  tyreSpeed: number;
}

/** Owns the GPU resources and interaction lifecycle; loaded only by the simulator. */
export class F1CarScene {
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(33, 1, 0.1, 80);
  private readonly renderer: THREE.WebGLRenderer;
  private controls!: OrbitControls;
  private car?: ReturnType<typeof createF1Car>;
  private environment?: THREE.WebGLRenderTarget;
  private floorMaterial?: THREE.MeshPhysicalMaterial;
  private resizeObserver?: ResizeObserver;
  private intersectionObserver?: IntersectionObserver;
  private motionQuery?: MediaQueryList;
  private setup?: CarSetup;
  private frame = 0;
  private lastTime = 0;
  private visible = true;
  private destroyed = false;
  private reducedMotion = false;
  private fitDistance = 10;
  private readonly focus = new THREE.Vector3(0, 0.5, 0);

  constructor(
    private readonly host: HTMLElement,
    private readonly onContextLost: () => void,
  ) {
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'low-power',
    });
    try {
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
      this.renderer.outputColorSpace = THREE.SRGBColorSpace;
      this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
      this.renderer.toneMappingExposure = 1.1;
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFShadowMap;
      this.renderer.domElement.style.cssText =
        'display:block;width:100%;height:100%;touch-action:none;';
      this.renderer.domElement.setAttribute('aria-hidden', 'true');
      this.host.appendChild(this.renderer.domElement);

      const pmrem = new THREE.PMREMGenerator(this.renderer);
      const room = new RoomEnvironment();
      try {
        this.environment = pmrem.fromScene(room, 0.04);
        this.scene.environment = this.environment.texture;
        this.scene.environmentIntensity = 0.95;
      } finally {
        room.dispose();
        pmrem.dispose();
      }

      this.addStudio();
      this.car = createF1Car();
      this.scene.add(this.car.group);
      this.controls = new OrbitControls(this.camera, this.renderer.domElement);
      this.controls.target.copy(this.focus);
      this.controls.enableDamping = true;
      this.controls.dampingFactor = 0.09;
      this.controls.enablePan = false;
      this.controls.rotateSpeed = 0.65;
      this.controls.zoomSpeed = 0.65;
      this.controls.minPolarAngle = 0.08;
      this.controls.maxPolarAngle = Math.PI / 2 - 0.035;
      this.controls.addEventListener('change', this.requestRender);
      this.motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      this.reducedMotion = this.motionQuery.matches;
      this.controls.enableDamping = !this.reducedMotion;
      this.motionQuery.addEventListener('change', this.onMotionChange);
      this.renderer.domElement.addEventListener(
        'webglcontextlost',
        this.handleContextLost,
      );
      document.addEventListener('visibilitychange', this.onVisibilityChange);
      this.resizeObserver = new ResizeObserver(this.resize);
      this.resizeObserver.observe(host);
      this.intersectionObserver = new IntersectionObserver(([entry]) => {
        this.visible = entry.isIntersecting;
        this.requestRender();
      });
      this.intersectionObserver.observe(host);
      this.resize();
      this.setView('perspective');
    } catch (error) {
      this.dispose();
      throw error;
    }
  }

  private addStudio(): void {
    this.scene.add(new THREE.HemisphereLight(0xdce8ff, 0x151825, 1));
    const key = new THREE.DirectionalLight(0xfff4e5, 3.5);
    key.position.set(-3.5, 7, 5);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.left = key.shadow.camera.bottom = -4;
    key.shadow.camera.right = key.shadow.camera.top = 4;
    key.shadow.normalBias = 0.025;
    key.shadow.bias = -0.0003;
    key.shadow.radius = 4;
    this.scene.add(key);
    const rim = new THREE.DirectionalLight(0xc7dbff, 2.5);
    rim.position.set(2, 3, -5);
    this.scene.add(rim);
    const fill = new THREE.DirectionalLight(0xffffff, 1);
    fill.position.set(-5, 1, -2);
    this.scene.add(fill);

    this.floorMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x05080e,
      roughness: 0.9,
      metalness: 0,
      envMapIntensity: 0.12,
      specularIntensity: 0.08,
    });
    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(3.85, 96),
      this.floorMaterial,
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.028;
    floor.receiveShadow = true;
    this.scene.add(floor);

    // Fine concentric markings give the car a grounded, studio turntable setting.
    for (const radius of [3.08, 3.7, 3.76]) {
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(radius, radius + 0.009, 128),
        new THREE.MeshBasicMaterial({
          color: 0x77869e,
          transparent: true,
          opacity: radius === 3.08 ? 0.2 : 0.32,
        }),
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = -0.022;
      this.scene.add(ring);
    }
    const ticks: number[] = [];
    for (let i = 0; i < 72; i++) {
      const angle = (i / 72) * Math.PI * 2;
      const start = i % 6 === 0 ? 3.5 : 3.59;
      ticks.push(
        Math.cos(angle) * start,
        -0.019,
        Math.sin(angle) * start,
        Math.cos(angle) * 3.65,
        -0.019,
        Math.sin(angle) * 3.65,
      );
    }
    const ticksGeometry = new THREE.BufferGeometry();
    ticksGeometry.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(ticks, 3),
    );
    this.scene.add(
      new THREE.LineSegments(
        ticksGeometry,
        new THREE.LineBasicMaterial({
          color: 0x69768d,
          transparent: true,
          opacity: 0.38,
        }),
      ),
    );
  }

  update(setup: CarSetup): void {
    this.setup = setup;
    this.car?.setTeamColor(setup.teamColor);
    this.car?.setTyreColor(setup.tyreColor);
    this.car?.setDownforce(setup.downforce);
    this.car?.setWetTyres(
      setup.tyres === 'WET' || setup.tyres === 'INTERMEDIATE',
    );
    if (this.floorMaterial) {
      this.floorMaterial.roughness =
        setup.weather === 'WET' ? 0.24 : setup.weather === 'DAMP' ? 0.45 : 0.9;
      this.floorMaterial.envMapIntensity = setup.weather === 'DRY' ? 0.12 : 0.4;
      this.floorMaterial.color.set(
        setup.weather === 'DRY' ? 0x05080e : 0x07121d,
      );
    }
    this.requestRender();
  }

  setView(view: CarView): void {
    // Clear drag inertia before setting a precise preset or resetting the camera.
    this.controls.enableDamping = false;
    this.controls.update();
    const direction =
      view === 'side'
        ? new THREE.Vector3(0, 0.12, 1)
        : view === 'top'
          ? new THREE.Vector3(0, 1, 0.001)
          : new THREE.Vector3(-0.6, 0.38, 1);
    this.controls.target.copy(this.focus);
    this.camera.position.copy(
      direction.normalize().multiplyScalar(this.fitDistance).add(this.focus),
    );
    this.controls.update();
    this.controls.enableDamping = !this.reducedMotion;
    this.requestRender();
  }

  rotate(horizontal: number, vertical: number): void {
    const spherical = new THREE.Spherical().setFromVector3(
      this.camera.position.clone().sub(this.controls.target),
    );
    spherical.theta += horizontal;
    spherical.phi = THREE.MathUtils.clamp(
      spherical.phi + vertical,
      this.controls.minPolarAngle,
      this.controls.maxPolarAngle,
    );
    this.camera.position.copy(
      new THREE.Vector3().setFromSpherical(spherical).add(this.controls.target),
    );
    this.controls.update();
    this.requestRender();
  }

  zoom(factor: number): void {
    const offset = this.camera.position.clone().sub(this.controls.target);
    offset.setLength(
      THREE.MathUtils.clamp(
        offset.length() * factor,
        this.controls.minDistance,
        this.controls.maxDistance,
      ),
    );
    this.camera.position.copy(offset.add(this.controls.target));
    this.controls.update();
    this.requestRender();
  }

  private readonly resize = (): void => {
    if (this.destroyed) return;
    const width = this.host.clientWidth;
    const height = this.host.clientHeight;
    if (!width || !height) return;
    const previousFit = this.fitDistance;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    // Fit the full car on narrow screens without changing the user's orbit angle.
    const verticalFov = THREE.MathUtils.degToRad(this.camera.fov);
    this.fitDistance = Math.max(
      7.2,
      3.25 / (Math.tan(verticalFov / 2) * this.camera.aspect),
    );
    this.controls.minDistance = this.fitDistance * 0.6;
    this.controls.maxDistance = this.fitDistance * 1.75;
    if (this.camera.position.lengthSq() > 0) {
      const offset = this.camera.position
        .clone()
        .sub(this.focus)
        .multiplyScalar(this.fitDistance / previousFit);
      this.camera.position.copy(offset.add(this.focus));
    }
    this.renderer.setSize(width, height, false);
    this.requestRender();
  };

  private readonly requestRender = (): void => {
    if (!this.destroyed && !this.frame && this.visible && !document.hidden) {
      this.frame = requestAnimationFrame(this.render);
    }
  };

  private readonly render = (time: number): void => {
    this.frame = 0;
    if (this.destroyed || !this.visible || document.hidden) return;
    const delta = Math.min((time - this.lastTime) / 1000, 0.05);
    this.lastTime = time;
    this.controls.update();
    if (this.setup?.isLoading && !this.reducedMotion) {
      this.car?.animate(delta, (Math.PI * 2) / this.setup.tyreSpeed);
      this.requestRender();
    }
    this.renderer.render(this.scene, this.camera);
  };

  private readonly onMotionChange = (event: MediaQueryListEvent): void => {
    this.reducedMotion = event.matches;
    this.controls.enableDamping = !this.reducedMotion;
    this.requestRender();
  };

  private readonly onVisibilityChange = (): void => {
    this.requestRender();
  };

  private readonly handleContextLost = (event: Event): void => {
    event.preventDefault();
    this.onContextLost();
  };

  dispose(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    cancelAnimationFrame(this.frame);
    this.resizeObserver?.disconnect();
    this.intersectionObserver?.disconnect();
    document.removeEventListener('visibilitychange', this.onVisibilityChange);
    this.motionQuery?.removeEventListener('change', this.onMotionChange);
    this.controls?.removeEventListener('change', this.requestRender);
    this.controls?.dispose();
    this.renderer.domElement.removeEventListener(
      'webglcontextlost',
      this.handleContextLost,
    );
    if (this.car) {
      this.scene.remove(this.car.group);
      this.car.dispose();
    }
    this.scene.traverse((object) => {
      if (
        object instanceof THREE.Mesh ||
        object instanceof THREE.LineSegments
      ) {
        object.geometry.dispose();
        const materials = Array.isArray(object.material)
          ? object.material
          : [object.material];
        materials.forEach((material) => material.dispose());
      }
      if (object instanceof THREE.DirectionalLight) object.shadow.dispose();
    });
    this.environment?.dispose();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    this.renderer.domElement.remove();
    this.scene.clear();
  }
}

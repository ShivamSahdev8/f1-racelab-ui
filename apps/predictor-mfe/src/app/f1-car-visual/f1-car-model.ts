import * as THREE from 'three';

export interface F1CarModel {
  group: THREE.Group;
  setTeamColor(color: string): void;
  setTyreColor(color: string): void;
  setDownforce(level: string): void;
  setWetTyres(wet: boolean): void;
  animate(deltaSeconds: number, wheelSpeed: number): void;
  dispose(): void;
}

interface BodySection {
  x: number;
  bottom: number;
  top: number;
  width: number;
  z?: number;
}

interface RodPart {
  from: [number, number, number];
  to: [number, number, number];
  radius: number;
}

/** A self-contained, asset-free car. X points rearward, Y upward, Z across the axles. */
export function createF1Car(): F1CarModel {
  const group = new THREE.Group();
  group.name = 'formula-one-car';
  const wheels: THREE.Group[] = [];
  const wetGrooves: THREE.Group[] = [];
  const paint = new THREE.MeshPhysicalMaterial({
    color: '#b3bdcb',
    metalness: 0.58,
    roughness: 0.25,
    clearcoat: 1,
    clearcoatRoughness: 0.18,
  });
  const carbon = new THREE.MeshStandardMaterial({
    color: '#141a23',
    metalness: 0.38,
    roughness: 0.45,
  });
  const carbonEdge = new THREE.MeshStandardMaterial({
    color: '#333b49',
    metalness: 0.6,
    roughness: 0.34,
  });
  const rubber = new THREE.MeshStandardMaterial({
    color: '#15171b',
    metalness: 0.02,
    roughness: 0.86,
  });
  const sidewall = new THREE.MeshStandardMaterial({
    color: '#0d1014',
    roughness: 0.69,
  });
  const grooveMaterial = new THREE.MeshStandardMaterial({
    color: '#030405',
    roughness: 1,
  });
  const compound = new THREE.MeshStandardMaterial({
    color: '#e10600',
    roughness: 0.59,
    metalness: 0.08,
  });
  const alloy = new THREE.MeshStandardMaterial({
    color: '#a4acb8',
    metalness: 0.9,
    roughness: 0.23,
  });
  const darkAlloy = new THREE.MeshStandardMaterial({
    color: '#555c69',
    metalness: 0.82,
    roughness: 0.36,
  });
  const red = new THREE.MeshPhysicalMaterial({
    color: '#ee1734',
    metalness: 0.35,
    roughness: 0.26,
    clearcoat: 1,
  });
  const white = new THREE.MeshStandardMaterial({
    color: '#e6eaf0',
    metalness: 0.27,
    roughness: 0.34,
  });
  const interior = new THREE.MeshStandardMaterial({
    color: '#030507',
    roughness: 0.92,
  });
  const visor = new THREE.MeshPhysicalMaterial({
    color: '#133d61',
    metalness: 0.9,
    roughness: 0.13,
    clearcoat: 1,
  });
  const rearLightMaterial = new THREE.MeshStandardMaterial({
    color: '#ff183e',
    emissive: '#ff0825',
    emissiveIntensity: 0.6,
    roughness: 0.3,
  });

  function mesh(
    geometry: THREE.BufferGeometry,
    material: THREE.Material,
    name: string,
    parent: THREE.Object3D = group,
  ): THREE.Mesh {
    const result = new THREE.Mesh(geometry, material);
    result.name = name;
    result.castShadow = true;
    result.receiveShadow = true;
    parent.add(result);
    return result;
  }

  function box(
    name: string,
    size: [number, number, number],
    position: [number, number, number],
    material: THREE.Material,
    parent: THREE.Object3D = group,
  ): THREE.Mesh {
    const result = mesh(new THREE.BoxGeometry(...size), material, name, parent);
    result.position.set(...position);
    return result;
  }

  function tube(
    name: string,
    points: [number, number, number][],
    radius: number,
    material: THREE.Material,
    parent: THREE.Object3D = group,
    closed = false,
  ): THREE.Mesh {
    const curve = new THREE.CatmullRomCurve3(
      points.map((point) => new THREE.Vector3(...point)),
      closed,
      'centripetal',
    );
    return mesh(
      new THREE.TubeGeometry(
        curve,
        Math.max(8, points.length * 8),
        radius,
        8,
        closed,
      ),
      material,
      name,
      parent,
    );
  }

  function rod(
    name: string,
    from: [number, number, number],
    to: [number, number, number],
    radius: number,
    material: THREE.Material,
    parent: THREE.Object3D = group,
  ): THREE.Mesh {
    const start = new THREE.Vector3(...from);
    const end = new THREE.Vector3(...to);
    const direction = end.clone().sub(start);
    const result = mesh(
      new THREE.CylinderGeometry(radius, radius, direction.length(), 10),
      material,
      name,
      parent,
    );
    result.position.copy(start.add(end).multiplyScalar(0.5));
    result.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      direction.normalize(),
    );
    return result;
  }

  function instancedRods(
    name: string,
    parts: RodPart[],
    material: THREE.Material,
    parent: THREE.Object3D,
  ): void {
    const result = new THREE.InstancedMesh(
      new THREE.CylinderGeometry(1, 1, 1, 8),
      material,
      parts.length,
    );
    result.name = name;
    result.castShadow = true;
    result.receiveShadow = true;
    const matrix = new THREE.Matrix4();
    const quaternion = new THREE.Quaternion();
    const up = new THREE.Vector3(0, 1, 0);
    parts.forEach((part, index) => {
      const start = new THREE.Vector3(...part.from);
      const end = new THREE.Vector3(...part.to);
      const direction = end.clone().sub(start);
      const length = direction.length();
      quaternion.setFromUnitVectors(up, direction.normalize());
      matrix.compose(
        start.add(end).multiplyScalar(0.5),
        quaternion,
        new THREE.Vector3(part.radius, length, part.radius),
      );
      result.setMatrixAt(index, matrix);
    });
    result.instanceMatrix.needsUpdate = true;
    parent.add(result);
  }

  function ellipse(
    name: string,
    position: [number, number, number],
    scale: [number, number, number],
    material: THREE.Material,
    parent: THREE.Object3D = group,
  ): THREE.Mesh {
    const result = mesh(
      new THREE.SphereGeometry(1, 32, 20),
      material,
      name,
      parent,
    );
    result.position.set(...position);
    result.scale.set(...scale);
    return result;
  }

  // Smooth lofts preserve a continuous silhouette instead of stacking primitive blocks.
  function loft(
    name: string,
    sections: BodySection[],
    material: THREE.Material,
    squareness = 0.8,
  ): THREE.Mesh {
    const crossSegments = 32;
    const subdivisions = 6;
    const positions: number[] = [];
    const indices: number[] = [];
    const interpolated: BodySection[] = [];
    const cubic = (a: number, b: number, c: number, d: number, t: number) =>
      0.5 *
      (2 * b +
        (-a + c) * t +
        (2 * a - 5 * b + 4 * c - d) * t * t +
        (-a + 3 * b - 3 * c + d) * t * t * t);

    for (let section = 0; section < sections.length - 1; section++) {
      const a = sections[Math.max(0, section - 1)];
      const b = sections[section];
      const c = sections[section + 1];
      const d = sections[Math.min(sections.length - 1, section + 2)];
      for (let step = 0; step < subdivisions; step++) {
        const t = step / subdivisions;
        interpolated.push({
          x: b.x + (c.x - b.x) * t,
          bottom: cubic(a.bottom, b.bottom, c.bottom, d.bottom, t),
          top: cubic(a.top, b.top, c.top, d.top, t),
          width: Math.max(0.003, cubic(a.width, b.width, c.width, d.width, t)),
          z: cubic(a.z ?? 0, b.z ?? 0, c.z ?? 0, d.z ?? 0, t),
        });
      }
    }
    interpolated.push(sections[sections.length - 1]);
    for (const section of interpolated) {
      for (let segment = 0; segment < crossSegments; segment++) {
        const angle = (segment / crossSegments) * Math.PI * 2;
        const sine = Math.sin(angle);
        const cosine = Math.cos(angle);
        positions.push(
          section.x,
          (section.bottom + section.top) / 2 +
            (Math.sign(sine) *
              Math.pow(Math.abs(sine), squareness) *
              (section.top - section.bottom)) /
              2,
          (section.z ?? 0) +
            Math.sign(cosine) *
              Math.pow(Math.abs(cosine), squareness) *
              section.width,
        );
      }
    }
    for (let section = 0; section < interpolated.length - 1; section++) {
      for (let segment = 0; segment < crossSegments; segment++) {
        const a = section * crossSegments + segment;
        const b = section * crossSegments + ((segment + 1) % crossSegments);
        const c = a + crossSegments;
        const d = b + crossSegments;
        indices.push(a, c, b, b, c, d);
      }
    }
    for (const [section, reverse] of [
      [0, false],
      [interpolated.length - 1, true],
    ] as const) {
      const center = positions.length / 3;
      const ring = interpolated[section];
      positions.push(ring.x, (ring.top + ring.bottom) / 2, ring.z ?? 0);
      for (let segment = 0; segment < crossSegments; segment++) {
        const a = section * crossSegments + segment;
        const b = section * crossSegments + ((segment + 1) % crossSegments);
        indices.push(...(reverse ? [center, b, a] : [center, a, b]));
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(positions, 3),
    );
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    return mesh(geometry, material, name);
  }

  function sidePlate(
    name: string,
    outline: [number, number][],
    z: number,
    material: THREE.Material,
    depth = 0.027,
  ): THREE.Mesh {
    const shape = new THREE.Shape(
      outline.map(([x, y]) => new THREE.Vector2(x, y)),
    );
    const geometry = new THREE.ExtrudeGeometry(shape, {
      depth,
      bevelEnabled: true,
      bevelSegments: 3,
      steps: 1,
      bevelSize: 0.011,
      bevelThickness: 0.008,
    });
    const result = mesh(geometry, material, name);
    result.position.z = z - depth / 2;
    return result;
  }

  function wing(
    name: string,
    span: number,
    chord: number,
    material: THREE.Material,
    parent: THREE.Object3D,
    upturn = 0,
    sweep = 0,
  ): THREE.Mesh {
    const positions: number[] = [];
    const indices: number[] = [];
    const spanSteps = 32;
    const profileSteps = 24;
    for (let s = 0; s <= spanSteps; s++) {
      const across = (s / spanSteps) * 2 - 1;
      const tip = Math.pow(Math.abs(across), 3);
      for (let p = 0; p < profileSteps; p++) {
        const angle = (p / profileSteps) * Math.PI * 2;
        positions.push(
          (Math.cos(angle) * chord) / 2 + tip * sweep,
          Math.sin(angle) * chord * 0.065 * (1 - Math.cos(angle) * 0.55) +
            tip * upturn,
          (across * span) / 2,
        );
      }
    }
    for (let s = 0; s < spanSteps; s++) {
      for (let p = 0; p < profileSteps; p++) {
        const a = s * profileSteps + p;
        const b = s * profileSteps + ((p + 1) % profileSteps);
        const c = a + profileSteps;
        const d = b + profileSteps;
        indices.push(a, b, c, b, d, c);
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(positions, 3),
    );
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    return mesh(geometry, material, name, parent);
  }

  // The floor and diffuser frame the undercut sidepods and are visible from below.
  const floorShape = new THREE.Shape(
    [
      [-1.38, -0.32],
      [-0.97, -0.48],
      [-0.68, -0.73],
      [0.76, -0.78],
      [1.43, -0.66],
      [2.13, -0.44],
      [2.21, -0.37],
      [2.21, 0.37],
      [2.13, 0.44],
      [1.43, 0.66],
      [0.76, 0.78],
      [-0.68, 0.73],
      [-0.97, 0.48],
      [-1.38, 0.32],
    ].map(([x, z]) => new THREE.Vector2(x, z)),
  );
  const floor = mesh(
    new THREE.ExtrudeGeometry(floorShape, {
      depth: 0.035,
      bevelEnabled: true,
      bevelSegments: 2,
      bevelSize: 0.014,
      bevelThickness: 0.009,
    }),
    carbon,
    'carbon-ground-effect-floor',
  );
  floor.rotation.x = Math.PI / 2;
  floor.position.y = 0.15;
  for (const side of [-1, 1]) {
    tube(
      `floor-edge-${side}`,
      [
        [-0.67, 0.165, side * 0.727],
        [0.13, 0.16, side * 0.774],
        [0.77, 0.16, side * 0.772],
        [1.41, 0.165, side * 0.652],
      ],
      0.012,
      carbonEdge,
    );
    for (let i = 0; i < 3; i++) {
      sidePlate(
        `floor-inlet-fence-${side}-${i}`,
        [
          [-0.78, 0.145],
          [-0.6, 0.36],
          [-0.29, 0.26],
          [-0.12, 0.145],
        ],
        side * (0.34 + i * 0.125),
        carbon,
        0.012,
      );
    }
  }
  for (let fin = -2; fin <= 2; fin++) {
    sidePlate(
      `rear-diffuser-strake-${fin}`,
      [
        [1.5, 0.13],
        [2.2, 0.12],
        [2.2, 0.32],
        [1.7, 0.2],
      ],
      fin * 0.17,
      carbon,
      0.011,
    );
  }

  loft(
    'sculpted-monocoque',
    [
      { x: -1.55, bottom: 0.23, top: 0.5, width: 0.16 },
      { x: -1.0, bottom: 0.21, top: 0.61, width: 0.26 },
      { x: -0.58, bottom: 0.2, top: 0.66, width: 0.3 },
      { x: 0.25, bottom: 0.19, top: 0.67, width: 0.31 },
      { x: 0.81, bottom: 0.2, top: 0.62, width: 0.3 },
      { x: 1.42, bottom: 0.24, top: 0.5, width: 0.2 },
      { x: 1.95, bottom: 0.27, top: 0.4, width: 0.095 },
    ],
    paint,
  );
  loft(
    'tapered-front-nose',
    [
      { x: -2.73, bottom: 0.265, top: 0.33, width: 0.074 },
      { x: -2.58, bottom: 0.245, top: 0.39, width: 0.095 },
      { x: -2.05, bottom: 0.29, top: 0.47, width: 0.115 },
      { x: -1.62, bottom: 0.34, top: 0.54, width: 0.16 },
      { x: -1.2, bottom: 0.39, top: 0.63, width: 0.245 },
      { x: -0.83, bottom: 0.47, top: 0.7, width: 0.28 },
      { x: -0.58, bottom: 0.56, top: 0.72, width: 0.255 },
    ],
    paint,
    0.76,
  );
  tube(
    'nose-racing-stripe',
    [
      [-2.63, 0.377, 0],
      [-2.08, 0.481, 0],
      [-1.62, 0.551, 0],
      [-1.12, 0.66, 0],
    ],
    0.013,
    red,
  );

  for (const side of [-1, 1]) {
    loft(
      `sculpted-sidepod-${side}`,
      [
        { x: -0.33, bottom: 0.44, top: 0.62, width: 0.1, z: side * 0.43 },
        { x: -0.14, bottom: 0.37, top: 0.71, width: 0.195, z: side * 0.48 },
        { x: 0.2, bottom: 0.32, top: 0.68, width: 0.215, z: side * 0.48 },
        { x: 0.67, bottom: 0.3, top: 0.58, width: 0.205, z: side * 0.44 },
        { x: 1.1, bottom: 0.285, top: 0.47, width: 0.16, z: side * 0.355 },
        { x: 1.49, bottom: 0.28, top: 0.4, width: 0.08, z: side * 0.265 },
      ],
      paint,
      0.65,
    );
    ellipse(
      `radiator-intake-${side}`,
      [-0.277, 0.56, side * 0.447],
      [0.018, 0.071, 0.123],
      interior,
    );
    tube(
      `sidepod-shoulder-accent-${side}`,
      [
        [-0.13, 0.653, side * 0.629],
        [0.21, 0.618, side * 0.668],
        [0.66, 0.524, side * 0.62],
        [1.1, 0.434, side * 0.491],
        [1.42, 0.38, side * 0.349],
      ],
      0.012,
      red,
    );
    for (let vent = 0; vent < 7; vent++) {
      const x = 0.34 + vent * 0.078;
      const louver = box(
        `cooling-louver-${side}-${vent}`,
        [0.021, 0.012, 0.13],
        [x, 0.657 - vent * 0.018, side * (0.426 - vent * 0.012)],
        carbon,
      );
      louver.rotation.z = -0.22;
      louver.rotation.y = side * -0.22;
    }
    rod(
      `mirror-stalk-${side}`,
      [-0.48, 0.66, side * 0.25],
      [-0.3, 0.8, side * 0.45],
      0.013,
      carbon,
    );
    ellipse(
      `mirror-shell-${side}`,
      [-0.285, 0.81, side * 0.475],
      [0.091, 0.04, 0.055],
      paint,
    );
    ellipse(
      `mirror-glass-${side}`,
      [-0.211, 0.812, side * 0.475],
      [0.005, 0.026, 0.039],
      alloy,
    );
  }

  // A recessed cockpit, sculpted shoulders, visible driver and full halo.
  ellipse('cockpit-opening', [-0.12, 0.664, 0], [0.53, 0.026, 0.248], interior);
  for (const side of [-1, 1]) {
    loft(
      `cockpit-shoulder-${side}`,
      [
        { x: -0.64, bottom: 0.58, top: 0.71, width: 0.04, z: side * 0.243 },
        { x: -0.36, bottom: 0.54, top: 0.725, width: 0.048, z: side * 0.27 },
        { x: 0.05, bottom: 0.53, top: 0.74, width: 0.06, z: side * 0.27 },
        { x: 0.42, bottom: 0.56, top: 0.81, width: 0.08, z: side * 0.232 },
        { x: 0.65, bottom: 0.6, top: 0.82, width: 0.08, z: side * 0.17 },
      ],
      paint,
    );
  }
  tube(
    'cockpit-soft-rim',
    [
      [-0.62, 0.707, 0],
      [-0.49, 0.715, -0.218],
      [-0.1, 0.733, -0.222],
      [0.3, 0.757, -0.185],
      [0.38, 0.776, 0],
      [0.3, 0.757, 0.185],
      [-0.1, 0.733, 0.222],
      [-0.49, 0.715, 0.218],
    ],
    0.022,
    carbon,
    group,
    true,
  );
  ellipse('driver-seat', [0.04, 0.698, 0], [0.25, 0.081, 0.178], carbon);
  ellipse('driver-helmet', [0.06, 0.825, 0], [0.142, 0.155, 0.136], white);
  const helmetVisor = mesh(
    new THREE.SphereGeometry(
      0.145,
      32,
      16,
      -0.77,
      1.54,
      Math.PI * 0.39,
      Math.PI * 0.23,
    ),
    visor,
    'driver-visor',
  );
  helmetVisor.position.set(0.06, 0.825, 0);
  helmetVisor.scale.set(1, 1.072, 0.958);
  tube(
    'helmet-center-stripe',
    [
      [-0.05, 0.925, 0],
      [0.015, 0.976, 0],
      [0.09, 0.976, 0],
      [0.17, 0.923, 0],
    ],
    0.009,
    red,
  );
  tube(
    'halo-protection-ring',
    [
      [0.46, 0.826, -0.255],
      [0.31, 0.983, -0.282],
      [-0.24, 1.015, -0.27],
      [-0.57, 1.016, -0.163],
      [-0.65, 1.018, 0],
      [-0.57, 1.016, 0.163],
      [-0.24, 1.015, 0.27],
      [0.31, 0.983, 0.282],
      [0.46, 0.826, 0.255],
    ],
    0.028,
    carbon,
  );
  tube(
    'halo-center-pillar',
    [
      [-0.74, 0.69, 0],
      [-0.68, 0.88, 0],
      [-0.65, 1.019, 0],
    ],
    0.025,
    carbon,
  );
  const steeringWheel = mesh(
    new THREE.TorusGeometry(0.086, 0.015, 8, 24),
    carbon,
    'steering-wheel',
  );
  steeringWheel.position.set(-0.36, 0.742, 0);
  steeringWheel.rotation.y = Math.PI / 2;
  box(
    'steering-wheel-display',
    [0.022, 0.05, 0.092],
    [-0.348, 0.752, 0],
    darkAlloy,
  );

  loft(
    'engine-cover-and-airbox',
    [
      { x: 0.38, bottom: 0.65, top: 1.035, width: 0.133 },
      { x: 0.58, bottom: 0.54, top: 1.105, width: 0.175 },
      { x: 0.87, bottom: 0.42, top: 0.986, width: 0.188 },
      { x: 1.26, bottom: 0.35, top: 0.79, width: 0.151 },
      { x: 1.63, bottom: 0.29, top: 0.57, width: 0.107 },
      { x: 1.9, bottom: 0.3, top: 0.44, width: 0.072 },
    ],
    paint,
    0.9,
  );
  ellipse('airbox-intake', [0.371, 0.938, 0], [0.012, 0.082, 0.093], interior);
  sidePlate(
    'engine-shark-fin',
    [
      [0.6, 1.085],
      [0.86, 1.025],
      [1.55, 0.8],
      [1.85, 0.59],
      [1.57, 0.53],
      [1.12, 0.75],
    ],
    0,
    paint,
    0.012,
  );
  tube(
    'engine-spine-accent',
    [
      [0.61, 1.113, 0],
      [0.91, 1.024, 0],
      [1.49, 0.824, 0],
      [1.79, 0.641, 0],
    ],
    0.009,
    red,
  );

  // Three aero elements and raised endplates form the front wing.
  const frontWing = new THREE.Group();
  frontWing.name = 'front-wing';
  group.add(frontWing);
  const mainFrontPlane = wing(
    'front-wing-mainplane',
    2.07,
    0.31,
    carbon,
    frontWing,
    0.075,
    0.09,
  );
  mainFrontPlane.position.set(-2.67, 0.155, 0);
  const frontFlap = wing(
    'front-wing-middle-flap',
    1.99,
    0.205,
    paint,
    frontWing,
    0.082,
    0.085,
  );
  frontFlap.position.set(-2.463, 0.217, 0);
  frontFlap.rotation.z = 0.1;
  const frontUpperFlap = wing(
    'front-wing-upper-flap',
    1.91,
    0.19,
    carbon,
    frontWing,
    0.074,
    0.074,
  );
  frontUpperFlap.position.set(-2.294, 0.271, 0);
  frontUpperFlap.rotation.z = 0.19;
  for (const side of [-1, 1]) {
    sidePlate(
      `front-wing-endplate-${side}`,
      [
        [-2.84, 0.15],
        [-2.76, 0.35],
        [-2.6, 0.4],
        [-2.18, 0.34],
        [-2.2, 0.13],
      ],
      side * 1.019,
      paint,
      0.029,
    );
    tube(
      `front-wing-tip-accent-${side}`,
      [
        [-2.77, 0.354, side * 1.027],
        [-2.6, 0.41, side * 1.027],
        [-2.19, 0.349, side * 1.027],
      ],
      0.013,
      red,
    );
    for (let support = 0; support < 2; support++) {
      sidePlate(
        `front-flap-separator-${side}-${support}`,
        [
          [-2.61, 0.165],
          [-2.22, 0.25],
          [-2.21, 0.305],
          [-2.6, 0.21],
        ],
        side * (0.38 + support * 0.37),
        carbon,
        0.008,
      );
    }
  }

  // The upper rear flap rotates around its real spanwise hinge.
  const rearWing = new THREE.Group();
  rearWing.name = 'rear-wing';
  group.add(rearWing);
  const rearMainplane = wing(
    'rear-wing-mainplane',
    1.59,
    0.49,
    carbon,
    rearWing,
    0.065,
    -0.015,
  );
  rearMainplane.position.set(2.13, 1.044, 0);
  rearMainplane.rotation.z = 0.065;
  const rearFlapPivot = new THREE.Group();
  rearFlapPivot.name = 'rear-wing-adjustable-flap';
  rearFlapPivot.position.set(2.24, 1.193, 0);
  rearFlapPivot.rotation.z = THREE.MathUtils.degToRad(25);
  rearWing.add(rearFlapPivot);
  wing('rear-wing-upper-flap', 1.57, 0.35, paint, rearFlapPivot, 0.025);
  const flapTrailingEdge = box(
    'rear-wing-red-trailing-edge',
    [0.016, 0.012, 1.55],
    [0.164, 0.001, 0],
    red,
    rearFlapPivot,
  );
  flapTrailingEdge.castShadow = false;
  const beamWing = wing(
    'rear-beam-wing',
    1.45,
    0.21,
    carbon,
    rearWing,
    0.026,
    0.01,
  );
  beamWing.position.set(2.03, 0.5, 0);
  beamWing.rotation.z = 0.2;
  for (const side of [-1, 1]) {
    sidePlate(
      `rear-wing-endplate-${side}`,
      [
        [1.905, 1.088],
        [1.945, 1.285],
        [2.08, 1.34],
        [2.47, 1.335],
        [2.48, 0.83],
        [2.25, 0.72],
        [2.06, 0.85],
      ],
      side * 0.806,
      paint,
      0.025,
    );
    tube(
      `rear-wing-endplate-accent-${side}`,
      [
        [1.949, 1.288, side * 0.824],
        [2.08, 1.352, side * 0.824],
        [2.458, 1.348, side * 0.824],
      ],
      0.012,
      red,
    );
    tube(
      `rear-wing-swan-neck-${side}`,
      [
        [1.8, 0.4, side * 0.22],
        [1.97, 0.72, side * 0.22],
        [2.18, 0.91, side * 0.22],
        [2.19, 1.036, side * 0.22],
      ],
      0.025,
      carbon,
    );
  }
  rod(
    'rear-wing-drs-actuator',
    [2.02, 1.04, 0],
    [2.24, 1.218, 0],
    0.015,
    alloy,
  );
  const exhaust = mesh(
    new THREE.CylinderGeometry(0.047, 0.058, 0.31, 24, 1, true),
    darkAlloy,
    'titanium-exhaust',
  );
  exhaust.rotation.z = -Math.PI / 2;
  exhaust.position.set(2.04, 0.465, 0);
  ellipse(
    'exhaust-interior',
    [2.195, 0.465, 0],
    [0.003, 0.041, 0.041],
    interior,
  );
  box(
    'rear-rain-light',
    [0.046, 0.095, 0.095],
    [2.245, 0.28, 0],
    rearLightMaterial,
  );

  function createWheel(front: boolean, side: number): void {
    const wheel = new THREE.Group();
    wheel.name = `${front ? 'front' : 'rear'}-${side < 0 ? 'left' : 'right'}-wheel`;
    wheel.position.set(
      front ? -1.7 : 1.64,
      0.378,
      side * (front ? 0.855 : 0.84),
    );
    group.add(wheel);
    wheels.push(wheel);
    const width = front ? 0.335 : 0.39;
    const half = width / 2;
    const profile = [
      [0.207, -half],
      [0.266, -half],
      [0.316, -half + 0.005],
      [0.351, -half + 0.018],
      [0.371, -half + 0.045],
      [0.378, -half + 0.077],
      [0.378, half - 0.077],
      [0.371, half - 0.045],
      [0.351, half - 0.018],
      [0.316, half - 0.005],
      [0.266, half],
      [0.207, half],
      [0.207, -half],
    ].map(([radius, axial]) => new THREE.Vector2(radius, axial));
    const tyre = mesh(
      new THREE.LatheGeometry(profile, 64),
      rubber,
      'rounded-slick-tyre',
      wheel,
    );
    tyre.rotation.x = Math.PI / 2;
    const hub = mesh(
      new THREE.CylinderGeometry(0.202, 0.202, width - 0.02, 40),
      carbon,
      'wheel-barrel',
      wheel,
    );
    hub.rotation.x = Math.PI / 2;
    for (const face of [-1, 1]) {
      const sidewallFace = mesh(
        new THREE.RingGeometry(0.208, 0.319, 64),
        sidewall,
        'tyre-sidewall',
        wheel,
      );
      sidewallFace.position.z = face * (half + 0.001);
      if (face < 0) sidewallFace.rotation.y = Math.PI;
      const ring = mesh(
        new THREE.TorusGeometry(0.298, 0.007, 6, 64),
        compound,
        'tyre-compound-ring',
        wheel,
      );
      ring.position.z = face * (half + 0.004);
      const shoulderRing = mesh(
        new THREE.TorusGeometry(0.326, 0.0023, 5, 64),
        carbonEdge,
        'tyre-sidewall-moulding',
        wheel,
      );
      shoulderRing.position.z = face * (half - 0.001);
      const rim = mesh(
        new THREE.TorusGeometry(0.199, 0.01, 8, 48),
        alloy,
        'forged-rim-lip',
        wheel,
      );
      rim.position.z = face * (half + 0.006);
      const brakeRotor = mesh(
        new THREE.CylinderGeometry(0.168, 0.168, 0.012, 40),
        darkAlloy,
        'ventilated-brake-rotor',
        wheel,
      );
      brakeRotor.rotation.x = Math.PI / 2;
      brakeRotor.position.z = face * (half - 0.053);
      const rotorRing = mesh(
        new THREE.TorusGeometry(0.137, 0.015, 6, 40),
        alloy,
        'brake-rotor-track',
        wheel,
      );
      rotorRing.position.z = face * (half - 0.044);
      const spokeParts: RodPart[] = [];
      for (let spoke = 0; spoke < 10; spoke++) {
        const angle = (spoke / 10) * Math.PI * 2;
        const inner: [number, number, number] = [
          Math.cos(angle) * 0.06,
          Math.sin(angle) * 0.06,
          face * (half + 0.014),
        ];
        const outer: [number, number, number] = [
          Math.cos(angle + 0.075) * 0.19,
          Math.sin(angle + 0.075) * 0.19,
          face * (half + 0.003),
        ];
        spokeParts.push({ from: inner, to: outer, radius: 0.01 });
        spokeParts.push({
          from: [
            Math.cos(angle) * 0.13,
            Math.sin(angle) * 0.13,
            face * (half + 0.008),
          ],
          to: [
            Math.cos(angle - 0.07) * 0.19,
            Math.sin(angle - 0.07) * 0.19,
            face * (half + 0.003),
          ],
          radius: 0.006,
        });
      }
      instancedRods('forged-split-wheel-spokes', spokeParts, alloy, wheel);
      const centerLock = mesh(
        new THREE.CylinderGeometry(0.053, 0.053, 0.031, 6),
        side < 0 ? red : alloy,
        'center-lock-nut',
        wheel,
      );
      centerLock.rotation.x = Math.PI / 2;
      centerLock.position.z = face * (half + 0.016);
      for (let mark = 0; mark < 2; mark++) {
        const marker = box(
          'tyre-sidewall-mark',
          [0.051, 0.008, 0.002],
          [0, mark === 0 ? 0.273 : -0.273, face * (half + 0.004)],
          compound,
          wheel,
        );
        marker.rotation.z = mark * Math.PI;
      }
    }
    const grooves = new THREE.Group();
    grooves.name = 'wet-tyre-grooves';
    grooves.visible = false;
    wheel.add(grooves);
    wetGrooves.push(grooves);
    for (let groove = -2; groove <= 2; groove++) {
      const channel = mesh(
        new THREE.TorusGeometry(0.378, 0.0035, 5, 64),
        grooveMaterial,
        'circumferential-tread-channel',
        grooves,
      );
      channel.position.z = groove * width * 0.125;
    }
    const treadParts: RodPart[] = [];
    for (let tread = 0; tread < 32; tread++) {
      const angle = (tread / 32) * Math.PI * 2;
      for (const sideOfTread of [-1, 1]) {
        const a = angle + sideOfTread * 0.028;
        const b = angle - sideOfTread * 0.055;
        treadParts.push({
          from: [
            Math.cos(a) * 0.378,
            Math.sin(a) * 0.378,
            sideOfTread * width * 0.045,
          ],
          to: [
            Math.cos(b) * 0.374,
            Math.sin(b) * 0.374,
            sideOfTread * width * 0.31,
          ],
          radius: 0.0035,
        });
      }
    }
    instancedRods('diagonal-wet-tread', treadParts, grooveMaterial, grooves);
  }

  for (const front of [true, false]) {
    for (const side of [-1, 1]) {
      createWheel(front, side);
      const axleX = front ? -1.7 : 1.64;
      const hubZ = side * 0.72;
      const bodyZ = side * (front ? 0.15 : 0.16);
      for (const height of [0.29, 0.455]) {
        rod(
          `${front ? 'front' : 'rear'}-forward-wishbone-${side}-${height}`,
          [axleX - 0.37, height, bodyZ],
          [axleX, 0.378, hubZ],
          0.018,
          carbon,
        );
        rod(
          `${front ? 'front' : 'rear'}-rear-wishbone-${side}-${height}`,
          [axleX + (front ? 0.55 : 0.38), height, bodyZ],
          [axleX, 0.378, hubZ],
          0.018,
          carbon,
        );
      }
      rod(
        `${front ? 'front' : 'rear'}-pushrod-${side}`,
        [axleX + (front ? 0.29 : -0.23), front ? 0.57 : 0.56, side * 0.2],
        [axleX + 0.015, 0.32, hubZ],
        0.013,
        alloy,
      );
      rod(
        `${front ? 'front' : 'rear'}-steering-link-${side}`,
        [axleX + 0.11, 0.38, bodyZ],
        [axleX + 0.09, 0.39, hubZ],
        0.012,
        carbon,
      );
      if (front) {
        const wheelDeflector = sidePlate(
          `front-wheel-deflector-${side}`,
          [
            [-1.3, 0.2],
            [-1.23, 0.57],
            [-1.16, 0.57],
            [-1.19, 0.18],
          ],
          side * 0.7,
          carbon,
          0.015,
        );
        wheelDeflector.rotation.y = side * 0.03;
      }
    }
  }

  let flapTarget = THREE.MathUtils.degToRad(25);
  let wet = false;
  let elapsed = 0;
  let disposed = false;

  return {
    group,
    setTeamColor(color: string): void {
      paint.color.set(color);
    },
    setTyreColor(color: string): void {
      compound.color.set(color);
    },
    setDownforce(level: string): void {
      const angle =
        level.toUpperCase() === 'HIGH'
          ? 25
          : level.toUpperCase() === 'MEDIUM'
            ? 15
            : 5;
      flapTarget = THREE.MathUtils.degToRad(angle);
      // Setup changes must be visible even while the demand-rendered car is idle.
      rearFlapPivot.rotation.z = flapTarget;
    },
    setWetTyres(isWet: boolean): void {
      wet = isWet;
      wetGrooves.forEach((grooves) => {
        grooves.visible = isWet;
      });
      rubber.roughness = isWet ? 0.54 : 0.86;
    },
    animate(deltaSeconds: number, wheelSpeed: number): void {
      const delta = Math.min(Math.max(deltaSeconds, 0), 0.1);
      elapsed += delta;
      wheels.forEach((wheel) => {
        wheel.rotation.z -= wheelSpeed * delta;
      });
      rearFlapPivot.rotation.z = THREE.MathUtils.damp(
        rearFlapPivot.rotation.z,
        flapTarget,
        9,
        delta,
      );
      rearLightMaterial.emissiveIntensity = wet
        ? Math.sin(elapsed * 9) > 0
          ? 2.2
          : 0.2
        : 0.5;
    },
    dispose(): void {
      if (disposed) return;
      disposed = true;
      const geometries = new Set<THREE.BufferGeometry>();
      const materials = new Set<THREE.Material>();
      group.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          if (object instanceof THREE.InstancedMesh) object.dispose();
          geometries.add(object.geometry);
          (Array.isArray(object.material)
            ? object.material
            : [object.material]
          ).forEach((material) => materials.add(material));
        }
      });
      geometries.forEach((geometry) => geometry.dispose());
      materials.forEach((material) => material.dispose());
      group.clear();
    },
  };
}

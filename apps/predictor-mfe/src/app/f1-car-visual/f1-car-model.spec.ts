import * as THREE from 'three';
import { createF1Car, F1CarModel } from './f1-car-model';

describe('Formula 1 car model', () => {
  let car: F1CarModel;

  beforeEach(() => {
    car = createF1Car();
  });

  afterEach(() => {
    car.dispose();
  });

  function wheels(): THREE.Object3D[] {
    return car.group.children.filter((child) =>
      /^(front|rear)-(left|right)-wheel$/.test(child.name),
    );
  }

  function material(name: string): THREE.MeshStandardMaterial {
    const object = car.group.getObjectByName(name) as THREE.Mesh<
      THREE.BufferGeometry,
      THREE.MeshStandardMaterial
    >;
    return object.material;
  }

  it.each<[string, number]>([
    ['LOW', 5],
    ['MEDIUM', 15],
    ['HIGH', 25],
  ])(
    'applies %s downforce to the stationary rear flap immediately',
    (level, angle) => {
      car.setDownforce(level);

      // The scene sleeps while idle: applying setup cannot depend on animate().
      expect(
        car.group.getObjectByName('rear-wing-adjustable-flap')?.rotation.z,
      ).toBeCloseTo(THREE.MathUtils.degToRad(angle));
    },
  );

  it('changes livery and compound independently and restores slick tyres', () => {
    car.setTeamColor('#00d7b6');
    car.setTyreColor('#0088ff');
    car.setWetTyres(true);

    expect(material('sculpted-monocoque').color.getHexString()).toBe('00d7b6');
    expect(material('tyre-compound-ring').color.getHexString()).toBe('0088ff');
    expect(wheels()).toHaveLength(4);
    wheels().forEach((wheel) => {
      expect(wheel.getObjectByName('wet-tyre-grooves')?.visible).toBe(true);
    });

    car.setTyreColor('#e10600');
    car.setWetTyres(false);

    wheels().forEach((wheel) => {
      expect(wheel.getObjectByName('wet-tyre-grooves')?.visible).toBe(false);
    });
    expect(material('sculpted-monocoque').color.getHexString()).toBe('00d7b6');
    expect(material('tyre-compound-ring').color.getHexString()).toBe('e10600');
  });

  it('has finite geometry and four broad wheels sitting on the ground', () => {
    car.group.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(car.group);
    const size = bounds.getSize(new THREE.Vector3());

    expect(size.x).toBeGreaterThan(5);
    expect(size.x).toBeLessThan(6);
    expect(size.z).toBeGreaterThan(2);
    expect(size.z).toBeLessThan(2.3);
    car.group.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        const positions = object.geometry.getAttribute('position');
        expect(Array.from(positions.array).every(Number.isFinite)).toBe(true);
      }
    });
    wheels().forEach((wheel) => {
      const tyre = wheel.getObjectByName('rounded-slick-tyre')!;
      const tyreBounds = new THREE.Box3().setFromObject(tyre);
      const tyreSize = tyreBounds.getSize(new THREE.Vector3());
      expect(tyreBounds.min.y).toBeCloseTo(0, 3);
      expect(tyreSize.z).toBeGreaterThan(0.3);
    });
  });

  it('spins every wheel during simulation without moving the chassis', () => {
    const initialPosition = car.group.position.clone();
    car.animate(0.05, 4);

    wheels().forEach((wheel) => expect(wheel.rotation.z).toBeCloseTo(-0.2));
    expect(car.group.position.equals(initialPosition)).toBe(true);
  });

  it('releases shared geometry, materials and GPU instances exactly once', () => {
    const resources = new Set<
      THREE.BufferGeometry | THREE.Material | THREE.InstancedMesh
    >();
    car.group.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        resources.add(object.geometry);
        const materials = Array.isArray(object.material)
          ? object.material
          : [object.material];
        materials.forEach((entry) => resources.add(entry));
        if (object instanceof THREE.InstancedMesh) resources.add(object);
      }
    });
    const disposeCalls = Array.from(resources, (resource) =>
      jest.spyOn(resource, 'dispose'),
    );

    car.dispose();
    car.dispose();

    disposeCalls.forEach((dispose) => expect(dispose).toHaveBeenCalledTimes(1));
    expect(car.group.children).toHaveLength(0);
  });
});

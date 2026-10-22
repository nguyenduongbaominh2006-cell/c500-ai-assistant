
/* C500 3D avatar preview — procedural Asian student character.
   Uses Three.js. Illustrative model, not an official uniform model. */
(function () {
  'use strict';

  function mount(containerId, options) {
    const host = document.getElementById(containerId);
    if (!host || !window.THREE) return null;

    host.replaceChildren();
    const T = window.THREE;
    const scene = new T.Scene();
    scene.background = new T.Color('#08121d');

    const camera = new T.PerspectiveCamera(32, 1, 0.1, 100);
    camera.position.set(0, 1.25, 6.5);

    const renderer = new T.WebGLRenderer({
      antialias: true,
      alpha: false
    });
    renderer.setPixelRatio(
      Math.min(window.devicePixelRatio || 1, 2)
    );
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = T.PCFSoftShadowMap;
    host.appendChild(renderer.domElement);

    scene.add(new T.HemisphereLight(0xe3f3ff, 0x293343, 1.8));

    const keyLight = new T.DirectionalLight(0xffe7c2, 2.2);
    keyLight.position.set(3, 5, 5);
    keyLight.castShadow = true;
    scene.add(keyLight);

    const rimLight = new T.DirectionalLight(0x58bda0, 1.4);
    rimLight.position.set(-4, 3, -2);
    scene.add(rimLight);

    const root = new T.Group();
    scene.add(root);

    const mat = (color, roughness = 0.82, metalness = 0) =>
      new T.MeshStandardMaterial({
        color,
        roughness,
        metalness
      });

    const materials = {
      skin: mat(0xd5a27d, 0.88),
      hair: mat(0x17191c, 0.93),
      white: mat(0xe8edf0),
      academy: mat(0x174b3d, 0.78),
      casual: mat(0x43899b, 0.8),
      pants: mat(0x17242c),
      casualPants: mat(0x303a43),
      shoe: mat(0x11151a),
      gold: mat(0xd5b15c, 0.38, 0.45),
      pocket: mat(0x10382f),
      eye: mat(0x17110d, 0.4),
      mouth: mat(0x75493f, 0.9)
    };

    function addMesh(geometry, material, position, scale, target = root) {
      const object = new T.Mesh(geometry, material);
      object.position.set(...position);

      if (scale) object.scale.set(...scale);

      object.castShadow = true;
      object.receiveShadow = true;
      target.add(object);
      return object;
    }

    function sphere(material, position, scale, target = root) {
      return addMesh(
        new T.SphereGeometry(1, 24, 18),
        material,
        position,
        scale,
        target
      );
    }

    function limb(material, a, b, radius, target = root) {
      const va = new T.Vector3(...a);
      const vb = new T.Vector3(...b);
      const direction = new T.Vector3().subVectors(vb, va);

      const object = addMesh(
        new T.CylinderGeometry(
          radius,
          radius,
          direction.length(),
          16
        ),
        material,
        va.clone().add(vb).multiplyScalar(0.5).toArray(),
        null,
        target
      );

      object.quaternion.setFromUnitVectors(
        new T.Vector3(0, 1, 0),
        direction.normalize()
      );

      sphere(material, a, [radius, radius, radius], target);
      sphere(material, b, [radius, radius, radius], target);
      return object;
    }

    const bodyGroup = new T.Group();
    root.add(bodyGroup);

    // Legs and shoes
    limb(
      materials.pants,
      [-0.19, -0.78, 0],
      [-0.2, -0.02, 0],
      0.105,
      bodyGroup
    );
    limb(
      materials.pants,
      [0.19, -0.78, 0],
      [0.2, -0.02, 0],
      0.105,
      bodyGroup
    );

    sphere(
      materials.shoe,
      [-0.2, -0.85, 0.08],
      [0.14, 0.075, 0.22],
      bodyGroup
    );
    sphere(
      materials.shoe,
      [0.2, -0.85, 0.08],
      [0.14, 0.075, 0.22],
      bodyGroup
    );

    // Neck and torso
    sphere(
      materials.skin,
      [0, 0.79, 0],
      [0.105, 0.16, 0.1],
      bodyGroup
    );

    const torso = sphere(
      materials.academy,
      [0, 0.34, 0],
      [0.38, 0.48, 0.22],
      bodyGroup
    );

    sphere(
      materials.academy,
      [-0.39, 0.59, 0],
      [0.16, 0.16, 0.19],
      bodyGroup
    );
    sphere(
      materials.academy,
      [0.39, 0.59, 0],
      [0.16, 0.16, 0.19],
      bodyGroup
    );

    limb(
      materials.academy,
      [-0.42, 0.58, 0],
      [-0.5, 0.08, 0.02],
      0.095,
      bodyGroup
    );
    limb(
      materials.academy,
      [0.42, 0.58, 0],
      [0.5, 0.08, 0.02],
      0.095,
      bodyGroup
    );

    sphere(
      materials.skin,
      [-0.5, 0.015, 0.02],
      [0.09, 0.1, 0.09],
      bodyGroup
    );
    sphere(
      materials.skin,
      [0.5, 0.015, 0.02],
      [0.09, 0.1, 0.09],
      bodyGroup
    );

    // Head, ears, dark hair and facial details
    sphere(
      materials.skin,
      [0, 1.12, 0],
      [0.29, 0.36, 0.245],
      bodyGroup
    );

    sphere(
      materials.skin,
      [-0.29, 1.12, 0],
      [0.055, 0.09, 0.05],
      bodyGroup
    );
    sphere(
      materials.skin,
      [0.29, 1.12, 0],
      [0.055, 0.09, 0.05],
      bodyGroup
    );

    sphere(
      materials.hair,
      [0, 1.37, -0.01],
      [0.295, 0.17, 0.255],
      bodyGroup
    );
    sphere(
      materials.hair,
      [-0.16, 1.3, 0.14],
      [0.14, 0.13, 0.12],
      bodyGroup
    );
    sphere(
      materials.hair,
      [0, 1.29, 0.19],
      [0.16, 0.1, 0.09],
      bodyGroup
    );
    sphere(
      materials.hair,
      [0.15, 1.3, 0.14],
      [0.13, 0.12, 0.11],
      bodyGroup
    );

    sphere(
      materials.white,
      [-0.105, 1.16, 0.211],
      [0.062, 0.028, 0.025],
      bodyGroup
    );
    sphere(
      materials.white,
      [0.105, 1.16, 0.211],
      [0.062, 0.028, 0.025],
      bodyGroup
    );

    sphere(
      materials.eye,
      [-0.104, 1.16, 0.234],
      [0.024, 0.026, 0.012],
      bodyGroup
    );
    sphere(
      materials.eye,
      [0.105, 1.16, 0.234],
      [0.024, 0.026, 0.012],
      bodyGroup
    );

    sphere(
      materials.skin,
      [0, 1.085, 0.245],
      [0.025, 0.035, 0.03],
      bodyGroup
    );
    sphere(
      materials.mouth,
      [0, 1.005, 0.228],
      [0.055, 0.012, 0.012],
      bodyGroup
    );

    // Uniform details are hidden when casual clothing is selected
    const details = new T.Group();
    bodyGroup.add(details);

    sphere(
      materials.white,
      [-0.095, 0.68, 0.16],
      [0.105, 0.09, 0.055],
      details
    );
    sphere(
      materials.white,
      [0.095, 0.68, 0.16],
      [0.105, 0.09, 0.055],
      details
    );
    sphere(
      materials.gold,
      [0, 0.51, 0.205],
      [0.035, 0.16, 0.022],
      details
    );
    sphere(
      materials.pocket,
      [-0.22, 0.39, 0.195],
      [0.075, 0.09, 0.025],
      details
    );
    sphere(
      materials.pocket,
      [0.22, 0.39, 0.195],
      [0.075, 0.09, 0.025],
      details
    );
    sphere(
      materials.gold,
      [-0.34, 0.68, 0.1],
      [0.11, 0.025, 0.045],
      details
    );
    sphere(
      materials.gold,
      [0.34, 0.68, 0.1],
      [0.11, 0.025, 0.045],
      details
    );
    sphere(
      materials.gold,
      [0.12, 0.56, 0.2],
      [0.045, 0.055, 0.025],
      details
    );

    // Floor
    const floor = new T.Mesh(
      new T.CircleGeometry(1.05, 48),
      new T.MeshBasicMaterial({
        color: 0x0c1b25,
        transparent: true,
        opacity: 0.85
      })
    );

    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.95;
    scene.add(floor);

    let outfit =
      options && options.outfit === 'casual'
        ? 'casual'
        : 'academy';

    function setOutfit(type) {
      outfit = type === 'casual' ? 'casual' : 'academy';
      const academy = outfit === 'academy';

      bodyGroup.traverse(object => {
        if (!object.isMesh) return;

        if (
          object.material === materials.academy ||
          object.material === materials.casual
        ) {
          object.material = academy
            ? materials.academy
            : materials.casual;
        }
      });

      torso.material = academy
        ? materials.academy
        : materials.casual;

      details.visible = academy;
      materials.pants.color.set(
        academy ? 0x17242c : 0x303a43
      );
    }

    function resize() {
      const width = Math.max(1, host.clientWidth);
      const height = Math.max(1, host.clientHeight);

      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    }

    const observer = new ResizeObserver(resize);
    observer.observe(host);
    resize();

    // Drag to rotate the character
    let dragging = false;
    let lastX = 0;

    renderer.domElement.style.touchAction = 'pan-y';

    renderer.domElement.addEventListener('pointerdown', event => {
      dragging = true;
      lastX = event.clientX;
      renderer.domElement.setPointerCapture(event.pointerId);
    });

    renderer.domElement.addEventListener('pointermove', event => {
      if (!dragging) return;

      root.rotation.y += (event.clientX - lastX) * 0.012;
      lastX = event.clientX;
    });

    renderer.domElement.addEventListener(
      'pointerup',
      () => { dragging = false; }
    );
    renderer.domElement.addEventListener(
      'pointercancel',
      () => { dragging = false; }
    );

    let rafId = 0;

    function animate() {
      rafId = requestAnimationFrame(animate);
      root.position.y = Math.sin(performance.now() * 0.0016) * 0.018;
      renderer.render(scene, camera);
    }

    setOutfit(outfit);
    animate();

    return {
      setOutfit,

      dispose() {
        cancelAnimationFrame(rafId);
        observer.disconnect();
        renderer.dispose();
        host.replaceChildren();
      }
    };
  }

  window.C500Avatar = { mount };
})();

import * as THREE from 'three';

export class CameraController {
  constructor(camera, domElement) {
    this._camera = camera;
    this._dom = domElement;
    this._keys = new Set();
    this._yaw = 0;
    this._pitch = -0.15;

    camera.rotation.order = 'YXZ';

    domElement.addEventListener('click', () => domElement.requestPointerLock());

    document.addEventListener('mousemove', (e) => {
      if (document.pointerLockElement !== domElement) return;
      this._yaw -= e.movementX * 0.002;
      this._pitch = Math.max(-1.4, Math.min(1.4, this._pitch - e.movementY * 0.002));
    });

    window.addEventListener('keydown', (e) => this._keys.add(e.code));
    window.addEventListener('keyup', (e) => this._keys.delete(e.code));
  }

  update(dt) {
    const speed = 50 * dt;
    const cam = this._camera;
    const yaw = this._yaw;
    const forward = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw));
    const right   = new THREE.Vector3(-forward.z, 0, forward.x);

    if (this._keys.has('KeyW')) cam.position.addScaledVector(forward, speed);
    if (this._keys.has('KeyS')) cam.position.addScaledVector(forward, -speed);
    if (this._keys.has('KeyA')) cam.position.addScaledVector(right, -speed);
    if (this._keys.has('KeyD')) cam.position.addScaledVector(right, speed);
    if (this._keys.has('Space'))     cam.position.y += speed;
    if (this._keys.has('ShiftLeft')) cam.position.y -= speed;

    cam.rotation.y = this._yaw;
    cam.rotation.x = this._pitch;
  }

  get yaw() { return this._yaw; }
  get pitch() { return this._pitch; }
}

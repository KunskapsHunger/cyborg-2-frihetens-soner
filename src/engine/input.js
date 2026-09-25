// Keyboard + mouse input with pointer lock. Tracks held keys, per-frame
// "pressed" edges and accumulated mouse deltas.

export class Input {
  constructor(element) {
    this.element = element;
    this.down = new Set();
    this.pressed = new Set();
    this.mouseDX = 0;
    this.mouseDY = 0;
    this.mouseDown = [false, false, false];
    this.mousePressed = [false, false, false];
    this.wheel = 0;
    this.locked = false;
    this.sensitivity = 1;
    this.mouseX = 0;
    this.mouseY = 0;
    this.onLockChange = null;

    window.addEventListener('keydown', (e) => {
      if (e.code === 'Tab' || e.code === 'Space' || e.code.startsWith('Arrow')) e.preventDefault();
      if (e.ctrlKey && e.code !== 'ControlLeft') e.preventDefault();
      if (!this.down.has(e.code)) this.pressed.add(e.code);
      this.down.add(e.code);
    });
    window.addEventListener('keyup', (e) => this.down.delete(e.code));
    window.addEventListener('blur', () => this.down.clear());
    window.addEventListener('mousemove', (e) => {
      this.mouseX = e.clientX;
      this.mouseY = e.clientY;
      if (!this.locked) return;
      this.mouseDX += e.movementX;
      this.mouseDY += e.movementY;
    });
    window.addEventListener('mousedown', (e) => {
      if (!this.mouseDown[e.button]) this.mousePressed[e.button] = true;
      this.mouseDown[e.button] = true;
    });
    window.addEventListener('mouseup', (e) => { this.mouseDown[e.button] = false; });
    window.addEventListener('wheel', (e) => { this.wheel += Math.sign(e.deltaY); }, { passive: true });
    window.addEventListener('contextmenu', (e) => e.preventDefault());
    document.addEventListener('pointerlockchange', () => {
      this.locked = document.pointerLockElement === this.element;
      this.onLockChange?.(this.locked);
    });
  }

  requestLock() {
    if (this.locked) return;
    try {
      const p = this.element.requestPointerLock?.();
      p?.catch?.(() => {});
    } catch {
      // Pointer lock can be refused (e.g. automated browsers); keyboard still works.
    }
  }

  exitLock() {
    if (document.pointerLockElement) document.exitPointerLock();
  }

  isDown(code) { return this.down.has(code); }
  wasPressed(code) { return this.pressed.has(code); }
  anyPressed(...codes) { return codes.some((c) => this.pressed.has(c)); }

  consumeMouse() {
    const d = { x: this.mouseDX * this.sensitivity, y: this.mouseDY * this.sensitivity };
    this.mouseDX = 0;
    this.mouseDY = 0;
    return d;
  }

  endFrame() {
    this.pressed.clear();
    this.mousePressed = [false, false, false];
    this.wheel = 0;
  }
}

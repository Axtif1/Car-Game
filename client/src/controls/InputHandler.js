/**
 * Player Input Controller
 * Captures Keyboard (WASD / Arrows / Space / Shift / R / V) and Gamepad analog sticks/triggers.
 */
export class InputHandler {
  constructor() {
    this.keys = new Map();
    this.sequenceNumber = 0;
    this.lookBehindPressed = false;
    this.respawnRequested = false;

    window.addEventListener('keydown', (e) => {
      this.keys.set(e.code, true);
      if (e.code === 'KeyV') this.lookBehindPressed = true;
      if (e.code === 'KeyR') this.respawnRequested = true;
    });

    window.addEventListener('keyup', (e) => {
      this.keys.set(e.code, false);
      if (e.code === 'KeyV') this.lookBehindPressed = false;
    });
  }

  getSnapshot() {
    this.sequenceNumber++;

    let throttle = 0;
    let steer = 0;
    let brake = false;
    let handbrake = false;
    let nitro = false;

    // Keyboard input mapping
    if (this.keys.get('KeyW') || this.keys.get('ArrowUp')) throttle += 1;
    if (this.keys.get('KeyS') || this.keys.get('ArrowDown')) throttle -= 1;
    if (this.keys.get('KeyA') || this.keys.get('ArrowLeft')) steer += 1; // Left steering (+yaw in our space)
    if (this.keys.get('KeyD') || this.keys.get('ArrowRight')) steer -= 1; // Right steering (-yaw)
    if (this.keys.get('Space')) handbrake = true;
    if (this.keys.get('ShiftLeft') || this.keys.get('ShiftRight')) nitro = true;

    // Gamepad controller polling (easy plug-and-play support)
    const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
    const gp = gamepads[0];
    if (gp) {
      if (Math.abs(gp.axes[0]) > 0.1) steer = -gp.axes[0];
      if (gp.buttons[7] && gp.buttons[7].value > 0.05) throttle = gp.buttons[7].value; // RT acceleration
      if (gp.buttons[6] && gp.buttons[6].value > 0.05) { // LT brake / reverse
        if (throttle === 0) throttle = -gp.buttons[6].value;
        else brake = true;
      }
      if (gp.buttons[0] && gp.buttons[0].pressed) handbrake = true; // A button
      if (gp.buttons[1] && gp.buttons[1].pressed) nitro = true; // B button
    }

    const respawn = this.respawnRequested;
    this.respawnRequested = false;

    return {
      throttle: Number(throttle.toFixed(2)),
      steer: Number(steer.toFixed(2)),
      brake,
      handbrake,
      nitro,
      respawn,
      lookBehind: this.lookBehindPressed,
      sequenceNumber: this.sequenceNumber
    };
  }
}

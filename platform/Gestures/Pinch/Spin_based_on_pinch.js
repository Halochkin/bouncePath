//
/*
* You have a situation: two different elements listen for long-press and spin for the same inner target.
* Now, both long-press and spin shouldn't run at the same time, they should be preventDefault-sensitive to each other.
* This means that as soon as one of the gesture mixins switch from maybeObservationMode and to activeTriggeredMode,
* then it should alert the other gesture mixins for touch events that it has activated. It does so, by calling preventDefault()
* on the initial touchstart event that started the maybeObservationMode.
*
* preventDefault on touchstart when it kicks in. When a touch spin mixin decides that this is a spin, it needs to call
 touchstartEvent.preventDefault(). This communicates to the other mixins, such as touch-long-press, that also might
 observe this touch sequence, that they do should be blocked. Both such mixins also needs to check for defaultPrevented
 on the touchStartEvent during the initial observation, so that they don't start a second gesture for the same event.
  */

/*
* mousedown=> :spin-maybe + longEnough + cancel listener for mouseup + mousedown + blur/focusout + selectstart ?
* longEnough => grabs by calling preventDefault on the mousedown, :spin-maybe => :spin-start
*               also checks preventDefault on mousedown to cancel.
*
*
* :spinMaybe=> cancel/start
*
* rule 1. use preventDefault on the initial trigger event such as mousedown some time *after* the fact, so to communicate with other gesture mixins.
* rule 2. use :gesture-maybe pseudo attribute to mark the element as having a gesture that is in the maybe state.
* rule 3. trigger secondary event listeners using the maybe-state pseudo attribute.
* */

class SpinEvent extends MouseEvent {
  constructor(type, dict, spinWidth, spinHeight, spinDiagonal, duration, xFactor, yFactor, diagonalFactor, rotation) {
    super(type, dict);
    this.spinWidth = spinWidth;
    this.spinHeight = spinHeight;
    this.spinDiagonal = spinDiagonal;
    this.duration = duration;
    this.xFactor = xFactor;
    this.yFactor = yFactor;
    this.diagonalFactor = diagonalFactor;
    this.rotation = rotation;
  }

  static tryToMakeSpin(pinchstart, pinchend) {
    const spinWidth = pinchstart.detail.width - pinchend.width;
    const spinHeight = pinchstart.detail.height - pinchend.height;
    const spinDiagonal = Math.sqrt(spinWidth * spinWidth + spinHeight * spinHeight);
    const durationMs = pinchend.touchevent.timeStamp - pinchstart.timeStamp;
    const xFactor = Math.abs(pinchstart.detail.width / pinchend.width);
    const yFactor = Math.abs(pinchstart.detail.height / pinchend.height);
    const diagonalFactor = Math.abs(pinchstart.detail.diagonal / pinchend.diagonal);
    const rotation = Math.abs(pinchstart.detail.angle - pinchend.angle);
    if (spinDiagonal < 100) return null;
    return new SpinEvent("spin", pinchend, spinWidth, spinHeight, spinDiagonal, durationMs, xFactor, yFactor,
      diagonalFactor, rotation);
  }
}

let pinchstart, target;

export function resetSpin() {
  target.removeAttribute(':spin-maybe', pseudo);
  pinchstart = target = undefined;
}

function trySpin(pinchend) {
  if (!pinchstart.defaultPrevented && !pinchend.defaultPrevented) {
    const spin = SpinEvent.tryToMakeSpin(pinchstart, pinchend);
    spin && target.dispatchEvent(spin);
  }
  resetSpin();
}

const pseudo = Math.random() + 1;  //this should probably be exportable.

export class SpinMaybe extends HTMLElement {
  firstConnectedCallback() {
    this.addEventListener('pinch-start', function (e) {
      if (target)
        return;
      pinchstart = e;
      target = this;
      this.setAttributeNode(document.createAttribute(':spin-maybe'), pseudo);
    }, {
      preventable: EventListenerOptions.PREVENTABLE_SOFT,
      trustedOnly: true
    });
  }
}

export class spinMaybeReaction extends HTMLElement {

  static get observedAttributes() {
    return [":spin-maybe"];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (newValue !== null) {
      window.addEventListener('pinch-end', trySpin, true);
      window.addEventListener('pinch-cancel', resetSpin, true);    //drag-cancel doesn't exist..
    } else {
      window.removeEventListener('pinch-end', trySpin, true);
      window.removeEventListener('pinch-cancel', resetSpin, true); //drag-cancel doesn't exist..
    }
  }
}
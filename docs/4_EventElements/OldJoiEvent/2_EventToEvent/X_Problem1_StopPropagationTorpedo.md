# Problem: StopPropagationTorpedo

## Native events' propagation sequence

The platform makes two important strategic choices about event propagation:
 
 * All native events triggered by the browser *propagate completely and in isolation, one by one*.
   The browser will never trigger an event listener for a native, trailing event before *all* 
   the event listeners for a native, preceding event has been executed.
   This is true for all phases of event propagation (capture, target, and bubble).
   And it is true natively composed events such as `submit` and `doubleclick`.
   
 * Stopping the *propagation* of a native event *will not* affect the propagation and execution of
   any other trailing native event. (Trailing, composed events can be stopped from the triggering
   event, via `preventDefault()`. We will return to that later.)

Combined, these two platform practices have an important consequence for custom events:
**the propagation of a triggering event *should not affect/stop* the propagation of a composed event**. 
This affects *both* native atomic and composed events. 
And this principle of isolated propagation should also follow our custom, composed events.

> If you in JS trigger another event by calling a method such as `.click()` or `.dispatchEvent(...)`,
  then these events will propagate immediately, *before* any other ongoing propagation
  is completed. Triggered from JS, *events can propagate recursively, nested inside each other*.

Thus. We need to see how and when stopping the propagation of a trigger event can torpedo and sink
the dispatch and propagation of a composed event. We call such situations for StopPropagationTorpedo problems.
Below is a simplified demonstration of such scenarios.

## Demo: StopPropagationTorpedo

```html
<h1>hello <a href="#oOo__ps">world</a></h1>
<p>
To test this out, you can comment out all the three torpedo listeners. 
Only then will you get the composed h1-click event.
</p>

<script>
document.querySelector("h1").addEventListener("click", function(e){
  e.stopImmediatePropagation();
  alert("StopPropagationTorpedo 1");
});
</script>

<script>
document.querySelector("h1").addEventListener("click", function(e){
  e.target.dispatchEvent(new CustomEvent("h1-click", {composed: true, bubbles: true}));
});

window.addEventListener("h1-click", function(e){alert("h1-click");}, true);
</script>

<script>
document.querySelector("a").addEventListener("click", function(e){
  e.stopPropagation();
  alert("StopPropagationTorpedo 2");
});
</script>

<script>
window.addEventListener("click", function(e){
  e.stopPropagation();
  alert("StopPropagationTorpedo 3");
}, true);
</script>
```
As this demo illustrate, a custom, composed event can be exposed to manipulations of the
triggering event's propagation: if an event listener happens to call `stopPropagation()` *before*
the triggering function has been called, then the composed event will not trigger (as it should).

Our first obstacle when making custom, composed events is to isolate it from the trigger event's
propagation, and to do so, we will use the EarlyBird pattern.
Later, we will return to how custom, composed events *can be* controlled in coordination with the
triggering event's `.preventDefault()` method.

## Old drafts

```javascript
window.addEventListener("trigger-event", function(e){eventTriggerFunction(e)}, true);
//window.addEventListener("trigger-event", e => eventTriggerFunction(e), true); //works, but not everywhere
//window.addEventListener("trigger-event", eventTriggerFunction, true); cannot be used with the CallShotgun pattern.
```

The above example adds an event listener to the window object for a certain trigger event.
The first trick here is the third argument, `true`.
This `true` specifies that the event listener will be executed during the little-known "capture phase"
(when events propagate *down* the DOM), as opposed to the "normal, bubble phase" 
(when events propagate *up* the DOM).
This means that the `eventTriggerFunction` will be executed during the first stage of 
the trigger event's propagation.

## Demo: `click-echo`

Below is a demo that echoes the demo in StopPropagationTorpedo. 
In this demo however, the `click-echo` event is added at the very beginning of the propagation chain.
This makes it precede and escape the StopPropagationTorpedos.

```html
<h1>hello <a href="#oOo__ps">world</a></h1>
<p>
To test this out, you can comment out all the three torpedo listeners. 
Only then will you get the composed h1-click event.
</p>

<script>
document.querySelector("h1").addEventListener("click", function(e){
  e.stopImmediatePropagation();
  alert("StopPropagationTorpedo 1");
});
</script>

<script>
function clickEcho(e){
  e.target.dispatchEvent(new CustomEvent("click-echo", {composed: true, bubbles: true}));
}
document.querySelector("h1").addEventListener("click", clickEcho);

window.addEventListener("h1-click", function(e){alert("h1-click");}, true);
</script>

<script>
document.querySelector("a").addEventListener("click", function(e){
  e.stopPropagation();
  alert("StopPropagationTorpedo 2");
});
</script>

<script>
window.addEventListener("click", function(e){
  e.stopPropagation();
  alert("StopPropagationTorpedo 3");
}, true);
</script>
```


## References

 * tores

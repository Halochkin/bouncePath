# HowTo: `stopPropagation()` for bounced events?

When `stopPropagation()` and `stopImmediatePropagation()` is called on an event in  `bounced` mode, *only* the propagation inside the current `Document` is affected. This makes `stopPropagation()` manageable again (although not necessarily recommended as a strategy in a more complex document context such as the main document/`window` context).

> `.stopPropagation()` only apply to event listeners within the same `Document`: `stopPropagation()` never applies to event listeners in neither HostShadowDoms nor SlottedShadowDoms.


## References

*

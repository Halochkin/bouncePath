/*
 :in-view (runs all the time, on off on off on off) When the element comes into view, the pseudoAttribute is added.
 When the element leaves the view, then the pseudoAttribute is removed.
 */

const enterViewObserver = new IntersectionObserver(entries => {
  for (let entry of entries) {
    const target = entry.target;
    if (entry.isIntersecting)
      target.hasAttribute(":in-view") ? target.removeAttribute(":in-view") :
        target.setAttributeNode(document.createAttribute(":in-view")),
        target.enterViewCallback();
  }
});

export class inViewCallback extends HTMLElement {
  firstConnectedCallback() {
    enterViewObserver.observe(this);
  }
}
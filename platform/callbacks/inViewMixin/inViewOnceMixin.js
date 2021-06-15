/*
:in-view-once (runs only once, once the pseudoAttribute has been added, then the observer and/or event listener is removed).
When the element comes into view, the element adds the pseudoAttribute. Then, the mixin does nothing else, and so when the
element leaves the view, the pseudoAttribute remains.
*/


const enterViewOnceObserver = new IntersectionObserver(entries => {
  for (let entry of entries)
    if (entry.isIntersecting && !entry.target.hasAttribute(":in-view-once")) {
      entry.target.setAttributeNode(document.createAttribute(":in-view-once")), entry.target.enterViewOnceCallback()
    }

});

export class inViewOnceCallback extends HTMLElement {
  firstConnectedCallback() {
    enterViewOnceObserver.observe(this);
  }


}
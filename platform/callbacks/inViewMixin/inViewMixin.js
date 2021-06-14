/*
 :in-view (runs all the time, on off on off on off) When the element comes into view, the pseudoAttribute is added.
 When the element leaves the view, then the pseudoAttribute is removed.
 */


let hit;
const enterViewObserver = new IntersectionObserver(entries => {
  for (let entry of entries) {
    if (entry.isIntersecting || !entry.isIntersecting && hit) {
      hit = !hit;
      entry.target.enterViewCallback();
    }
  }
});

export class inViewCallback extends HTMLElement {
  connectedCallback() {
    enterViewObserver.observe(this);
  }


  enterViewCallback() {
    this.hasAttribute(":in-view") ? this.removeAttribute(":in-view") :
      this.setAttributeNode(document.createAttribute(":in-view"));
  }

}
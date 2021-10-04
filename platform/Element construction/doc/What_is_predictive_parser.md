# WhatIs: Predictive parser

When the browser starts to receive HTML page data over the network, it immediately launches its parser to convert the HTML
into a document object model (DOM).

The first step of this parsing process is to break down HTML into tokens that represent start tags (`<div>`), end tags (`</div>`), and their contents.
From this it builds the DOM.
When the parser encounters an external resource, such as a CSS or JavaScript file, it tries, to retrieve it. 
The parser will continue to work as the CSS file is loaded, but it will block rendering until the file is loaded and parsed.

When the browser already knows the tag, it will call the `constructor()`, and maybe `attributeChangedCallback()` and
 `connectedCallback()` for those elements immediately.

 ```html
<script>customElements.define("element-a",AElement)</script>
<element-a></element-a>
```
 
It is worth noting that the parser will not activate element life cycle callbacks if the user only creates an element in the JS world,
but does not add it to the DOM.

It is worth noting that when an element is added to the DOM with `.appendChild()`, the `.isConnected`, `.parentNode`, `.attributes` properties
are not defined in the element constructor, whereas when the element is added to the DOM using html it is.

```html
<a-element></a-element> <!--1-->

<script>
class A extends HTMLElement {
    constructor() {
      super();
      console.log('constructor A');
      console.log("isConnected : ", this.isConnected);
      console.log("parentNode : ", this.parentNode);
      console.log("attributes : ", this.attributes);
    }

    connectedCallback() {
      console.log("connectedCallback A");
      console.log("- - - - - - - - - - - - - - - - - ");
    }

    static get observedAttributes() {
      return ["a", "b"]
    }

    attributeChangedCallback(name, oldValue, newValue) {
      console.log("attributeChangedCallback A");
    }
  }

customElements.define("a-element", ElementA);
</script>
```

Lifecycle callbacks will only be invoked after the element has been added to the DOM.

```javascript
  window.addEventListener("click", e => {
    const element = document.createElement("a-element");
    element.setAttributeNode(document.createAttribute("a"));
    document.body.appendChild(element); //2
  });
// 1
// constructor A
// isConnected :  true
// parentNode :  body
// childNodes :  NodeList(3) [text, div, text]
// attributes :  NamedNodeMap {0: a, a: a, length: 1}
// attributeChangedCallback A
// connectedCallback A
// - - - - - - - - - - - - - - - - - 
// 2
// constructor A
// isConnected :  false
// parentNode :  null
// childNodes :  NodeList []
// attributes :  NamedNodeMap {length: 0}
// attributeChangedCallback A
// connectedCallback A
// - - - - - - - - - - - - - - - - - 

```

## Reference
 * [How Browsers Work: Behind the scenes of modern web browsers](https://www.html5rocks.com/en/tutorials/internals/howbrowserswork/)
 
 
 
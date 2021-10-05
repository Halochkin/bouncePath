# WhatIs: Predictive parser

When the browser starts to receive HTML page data over the network, it immediately launches its parser to convert the HTML
into a document object model (DOM).

The first step of this parsing process is to break down HTML into tokens that represent start tags (`<div>`), end tags (`</div>`),
and their contents.From this it builds the DOM.
When the parser encounters an external resource, such as a CSS or JavaScript file, it tries, to retrieve it. 
The parser will continue to work as the CSS file is loaded, but it will block rendering until the file is loaded and parsed.

When the browser already knows the tag, it will call the `constructor()`, and maybe `attributeChangedCallback()` and
 `connectedCallback()` for those elements immediately.

 ```html
<script>customElements.define("element-a", AElement)</script>
<element-a></element-a>
```
 As an example, consider a simple demo that console.log() properties `.isConnected`, `.parentNode`, `.childNodes` and `.attributes` in the constructor() phase.
 
````javascript
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
  customElements.define("a-element", A);
````
 
It is worth noting that the parser will not activate element life cycle callbacks if the user only creates an element in the JS world,
but does not add it to the DOM.
There are several ways to create an element:

### `.createElement()`

The easiest way to create an HTML element with JS is with `.createElement()` It creates an element with the tag that is given in the argument,
or `HTMLUnknownElement` if the tag name is not recognized.

It is worth noting that when an element created with .createElement() is added to the DOM (with `.appendChild()`), the properties 
`.isConnected`, `.parentNode`, `.childNodes` and `.attributes` are not defined in the element constructor, whereas when the element is added to 
the DOM with HTML they are defined.

```html
<div id="parent">
    <a-element>     <!--1-->
        <div></div>
    </a-element>
</div>

<script>
  window.addEventListener("click", e => {
    const element = document.createElement("a-element");//2
    element.setAttributeNode(document.createAttribute("a"));
    document.body.appendChild(element); 
  });
// 1
// constructor A
// isConnected :  true
// parentNode :  <div id=​"parent">​…​</div>​
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
</script>
``` 

### `.innerHTML()`

The second advanced method is to insert html markup using the `.innerHTML` property. This method replicates the logic of
native HTML markup processing by the browser. It defines `.parentNode`, `.childNodes` and `.attributes` properties, but 
its special feature is that the `.isConnected` property is defined before the element is inserted in the DOM, and the 
`connectedCallback()` is called twice. The first time is when the setter calls the .innerHTML property with 
the value that places a defined tag. And the second time, when `.appendChild()` is called.

```html
<div id="parent"></div> 

<script>
  window.addEventListener("click", e => {
    let element = document.querySelector("#parent");
    element.innerHTML = `<a-element a>
                           <div></div>
                         </a-element>`
    document.body.appendChild(element);
  });

// constructor A
// isConnected :  true
// parentNode :  <div id=​"parent">​…​</div>​
// childNodes :  NodeList(3) [text, div, text]
// attributes :  NamedNodeMap {0: a, a: a, length: 1}
// attributeChangedCallback A
// connectedCallback A
// connectedCallback
//  - - - - - - - - - - - - - - - - - 
// connectedCallback A
//  - - - - - - - - - - - - - - - - - 
```

### `.cloneNode`

Another way to create an element is to call `.cloneNode(true)`.
Like `.createElement()`, the properties `.isConnected`, `.parentNode` are not defined in the element constructor. But it defines `.childNodes` and `.attributes`.
```html
<div id="parent">
    <a-element a>  <!--1-->
        <div></div>
    </a-element>
</div>

<script>
 
  window.addEventListener("click", e => {
    let element =  document.querySelector("a-element").cloneNode(true);
    document.body.appendChild(element); // 2
  });
// 1
// constructor A
// isConnected :  true
// parentNode :  <div id=​"parent">​…​</div>​
// childNodes :  NodeList(3) [text, div, text]
// attributes :  NamedNodeMap {0: a, a: a, length: 1}
// attributeChangedCallback A
// connectedCallback A
// - - - - - - - - - - - - - - - - - 
//2
// constructor A
// isConnected :  false
// parentNode :  null
// childNodes :  NodeList(3) [text, div, text]
// attributes :  NamedNodeMap {0: a, a: a, length: 1}
// attributeChangedCallback A
// connectedCallback A
//- - - - - - - - - - - - - - - - - 
</script>
```
The peculiarity of `.cloneNode(true)` is that if you try to clone a parent element that contains `<a-element>` as a child,
all lifecycle callbacks will be called (except `connectedCallback()` until the element is added to the DOM). And the 
`constructor()` will define `.parentNode`, `.childNodes` and `.attributes` properties, but except for `.isConnected`.

```javascript
  window.addEventListener("click", e => {
    let element =  document.querySelector("#parent").cloneNode(true); 
     document.body.appendChild(element);
  });
// constructor A
// isConnected :  false
// parentNode :  <div id=​"parent">​…​</div>​
// childNodes :  NodeList(3) [text, div, text]
// attributes :  NamedNodeMap {0: a, a: a, length: 1}
// attributeChangedCallback A
// connectedCallback A
//- - - - - - - - - - - - - - - - - 
```

### new() Element

When creating a new element with `new()` none of the `.isConnected`, `.parentNode`, `.childNodes` and `.attributes` properties will be defined

```html
<div id="parent"></div>
<script>
  window.addEventListener("click", e => {
    let element = new A();
    element.setAttributeNode(document.createAttribute("a"))
    document.querySelector("#parent").appendChild(element);
  });
</script>

// constructor A
// isConnected :  false
// parentNode :  null
// childNodes :  NodeList(0) []
// attributes :  NamedNodeMap {length: 0}
// attributeChangedCallback A
// connectedCallback A
//- - - - - - - - - - - - - - - - - 
```

## Reference
 * [How Browsers Work: Behind the scenes of modern web browsers](https://www.html5rocks.com/en/tutorials/internals/howbrowserswork/)
 
 
 
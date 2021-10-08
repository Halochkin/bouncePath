

When the browser starts to receive HTML page data over the network, it immediately launches its parser to convert the HTML
into a document object model (DOM).

The first step of this parsing process is to break down HTML into tokens that represent start tags (`<div>`), end tags (`</div>`),
and their contents.From this it builds the DOM.
When the parser encounters an external resource, such as a CSS or JavaScript file, it tries, to retrieve it. 
The parser will continue to work as the CSS file is loaded, but it will block rendering until the file is loaded and parsed.

When the browser already knows the tag, it will call the `constructor()`, and maybe `attributeChangedCallback()` and
 `connectedCallback()` for those elements immediately.


### element properties ?

When an element is created, different properties of the element defined at the `constructor()` stage. 
Their values may be different, depending on the method of creation. The most commonly used properties are:

 * `parentNode` - The parentNode property returns the parent element of the specified node. Each node has a parentNode property that points to its parent element in the document tree.
 * `attributes` - collection of all attribute nodes registered to the specified node.
 * `childNodes` - list of child nodes of the given element include elements, text and comments.
 * `isConnected` - a boolean indicating whether the node is connected (directly or indirectly) to the DOM. Node.isConnected is an indicator that `connectedCallback()` will be called soon. 
 * `document.readyState === 'loading` ( we call it `isLoading`) - shows us the current state of loading. Tracking whether the item was created while the page is loading, or after it was loaded.


 * `currentScript` - 
 
 * `!!window.event`
 * `lastElementInDocument === el`
 * `lastElementInDocument === currentScript` (we call it `currentScriptIsLastElement`) The script that defines the web component when it is updated is the last one in the document. This means that there is no other script that overrides this component.
 
 * `syncUpgrade` - component is an ancestor of script. When you upgrade, the user adds a script that defines a component inside the component. This property ensures that the component is not defined by any other script. 

 * `withinCount` - otherNode is a descendant of node. 
 * `new_target` - pseudo-property lets to detect whether a function or constructor was called using the `new` operator.


### predictive parser

When the browser starts to receive HTML page data over the network, it immediately launches its parser to convert the HTML
into a document object model (DOM). Let's consider several examples of predictive parsing.

#### predictive empty
Let's see what properties are defined during the constructor phase when you create an element normally using html.
```html
<script src="./WebComp.js"></script>
<web-comp></web-comp>
```
As a result, browser define next properties in element object
* `isLoading`
* `newTarget`
* `predictive`

#### predictive
Let's add an attribute and a test node as a child.
```html
<script src="./WebComp.js"></script>
<web-comp a="a" b="b">hello sunshine</web-comp>
```
Result is the same.

* `isLoading`
* `newTarget`
* `predictive`
This means that with this method, the attributes are not defined at the constructor stage, but later. This means that this approach is not suitable for creating elements that use their attribute values in the constructor step. 

Consider other approaches. 

### upgrade process

**The upgrade process** is the process that triggers callbacks to the custom element lifecycle after it has been defined with `customElements.define()`. 

When the browser creates HTMLUnknownElement for a tag `web-comp`, and then *after* that, a script calls `customElements.define('element-a', ...)`,
 the browser will do a very special procedure called "upgrade". The "upgrade" procedure will call the `constructor()`, 
 the `attributeChangedCallback()` and *always* the `connectedCallback()` on the `HTMLUnknownElement`.

This is weird. First, the browser does something in JS land that *never, ever* happens elsewhere: it calls a  `constructor()`
 on an already created object. It would look something like this if you could see the code: 
 
 ```javascript
 ElementA.constructor.call(htmlUnknownElementObjectInstance);  
```
 Calling a constructor on an already instantiated object is 100% forbidden in normal JS script; it is only the browser that
does this internally when "upgrading" custom elements. Second, the browser *only* upgrades elements that are connected to the main document.
That is why during the upgrade process you will *always* get a `connectedCallback()` too. So, if you have an `HTMLUnknownElement()` for `<element-a>`
in JS memory only (you have created it using document.createElement(`element-a`) and not yet connected it), then the "upgrade process"
will be called on that element at the moment you append it (directly or indirectly) to the main DOM.

#### upgrade empty

First we add a web component to the DOM, and only then we define it.
```html
<web-comp></web-comp>
<script src="./WebComp.js"></script>
```
We get the following properties

* `hasParentNode`  - body
* `isConnected`  
* `isLoading`
* `isCurrentScript`
* `currentScriptIsLastElement`
* `newTarget`

#### upgrade

Let's repeat the previous example, but with the use of attributes and children's elements.

```html
<web-comp a="a" b="b">hello <b>beautiful</b> sunshine</web-comp>
<script src="./WebComp.js"></script>
```
Now the result will be next
* `hasParentNode`  - body
* `hasAttributes`  - [a, b]
* `hasChildNodes`  - [`<b>`]
* `isConnected`
* `isLoading`
* `isCurrentScript`
* `currentScriptIsLastElement`
* `newTarget`

#### upgrade Within

If you insert a script that defines a component as a child of that component it will allow to define it. 

```html
<web-comp a="a" b="b"> hello
  <script src="./WebComp.js"></script> sunshine
</web-comp>
```
And defines next properties

* `hasParentNode`  - body
* `hasAttributes`  - [a, b]
* `hasChildNodes`  - [`<b>`]
* `isConnected`  
* `isLoading`
* `isCurrentScript`
* `currentScriptIsLastElement`
* `syncUpgrade`
* `newTarget`


#### upgrade async 
In some cases, an element may be created, then defined, and only then added to the DOM.
```html
 <div></div>
 <script>window.test = document.createElement('web-comp');</script>
 <script src="./WebComp.js"></script>
 <script>setTimeout(() => document.body.prepend(window.test))</script>
```
As a result, the following properties will be defined

* `hasParentNode`  - body
* `isConnected`  
* `newTarget`

## innerHTML

> The Element `innerHTML` interface property sets or gets the HTML markup of the child elements.

#### innerHTML empty disconnected

Creating empty element and assigning it a web component as a child using `.innerHTML`. Disconnected means that the element not added to the DOM, only created.

```javascript
const div = document.createElement('div');
div.innerHTML = '<web-comp></web-comp>';
```
As a result the following properties will be defined
* `hasParentNode`  - #div
* `isLoading`
* `isCurrentScript`
* `newTarget`

#### insertAdjacentHTML empty disconnected

A similar method is `insertAdjacentHTML()`.

```javascript
const div = document.createElement('div');
div.insertAdjacentHTML('afterbegin', '<web-comp></web-comp>');
```
It produces a similar result.
* `hasParentNode`  - #div
* `isLoading`
* `isCurrentScript`
* `newTarget`

#### innerHTML attributesChildren disconnected

Create an element with attributes and a text node inside. 
```javascript
const div = document.createElement('div');
div.innerHTML = '<web-comp a="a" b="b">hello sunshine</web-comp>';
```

The result will be as follows.

* `hasParentNode`  - #div
* `hasAttributes`  - [a, b]
* `hasChildNode`  - #text
* `isLoading`
* `isCurrentScript`
* `newTarget`

#### innerHTML attributesChildren disconnected nested inside

Creating an element with attributes and a similar web component as a child. 

```javascript
const div = document.createElement('div');
div.innerHTML = `
<web-comp a="a" b="b">hello
  <web-comp a="a" b="b">sunshine</web-comp>
</web-comp>`;
```

The result of the _parent_ element is as follows

* `hasParentNode`  - #div
* `hasAttributes`  - [a, b]
* `hasChildNode`  - #text
* `isLoading`
* `isCurrentScript`
* `newTarget`

The result of the _children_ element is

* `hasParentNode`  - #div
* `hasAttributes`  - [a, b]
* `hasChildNode`  - #text
* `isLoading`
* `isCurrentScript`
* `newTarget`
* `withinCount` - is a child of another `<web-comp`.


#### innerHTML empty

Adding a `<web-comp>` component to an element in the DOM.

```html
<script src="./WebComp.js"></script>
<div></div>
<script>
document.querySelector('div').innerHTML = '<web-comp></web-comp>';
</script>
```

Result

* `hasParentNode`  - #div
* `isConnected`   
* `isLoading`
* `isCurrentScript`
* `newTarget`

#### innerHTML async


```html
<script src="./WebComp.js"></script>
<div></div>
<script>setTimeout(function () {
   document.querySelector('div').innerHTML = '<web-comp></web-comp>'
  }, 10);
</script>
```

* `hasParentNode`  - #div
* `isConnected`   
* `newTarget`

## cloneNode

Another way to create an element is to call `.cloneNode(true)`. Every time a component is copied, its constructor will be called. Therefore, we consider the properties of the original and copied components.

#### cloneNode above disconnected
Let's look at an example where we create an element then define its `.innerHTML` like the example above and then copy it.
```javascript
const div = document.createElement('div');
div.innerHTML = `<web-comp a="a" b="b">hello</web-comp>`;
div.cloneNode(true);
```

The original component will have the following properties 
* `hasParentNode`  - #div
* `hasAttributes`  - [a, b]
* `hasChildNode`  - #text
* `isLoading`
* `isCurrentScript`
* `newTarget`

The cloned component 
* `hasParentNode`  - #div
* `hasAttributes`  - [a, b]
* `hasChildNode`  - #text
* `isLoading`
* `isCurrentScript`
* `newTarget`
* `withinCount` 

#### cloneNode above empty async
If you combine the process of upgrading and cloning the node afterwards
```html
 <div>
    <web-comp></web-comp>
 </div>
 <script src="./WebComp.js"></script>

 <script>setTimeout(function () {
    document.querySelector('div').cloneNode(true);
  })</script>
```

The original component will have the following properties 
* `hasParentNode`  - #div
* `hasAttributes`  - [a, b]
* `hasChildNode`  - #text
* `isLoading`
* `isCurrentScript`
* `newTarget`

The cloned component 
* `hasParentNode`  - #div
* `hasAttributes`  - [a, b]
* `hasChildNode`  - #text
* `isLoading`
* `isCurrentScript`
* `newTarget`
* `withinCount` 

#### cloneNode empty disconnected

Copying a created component
```html
  <script src="./WebComp.js"></script>
  <script>
    const empty = document.createElement('web-comp');
    empty.cloneNode(true);
  </script>
```
define the following properties

The original component will have the following properties  
* `isLoading`
* `isCurrentScript`
* `newTarget`

The cloned component 
* `isLoading`
* `isCurrentScript`
* `newTarget`
* `withinCount` 

#### cloneNode empty
Copying a component from the DOM 

```html
<web-comp></web-comp>
<script src="./WebComp.js"></script>
<script>document.querySelector('web-comp').cloneNode(true);</script>
```

will give the following properties

The original component will have the following properties 
* `hasParentNode`  - #div
* `hasAttributes`  - [a, b]
* `hasChildNode`  - #text
* `isLoading`
* `isCurrentScript`
* `newTarget`

The cloned component 
* `isLoading`
* `isCurrentScript`
* `newTarget`
* `withinCount` 


## createElement 
The `.createElement()` creates an element with the tag that is given in the argument, or `HTMLUnknownElement` if the tag name is not recognized.

#### createElement empty disconnected

Creating an empty new component
```html
<script src="./WebComp.js"></script>
<script>document.createElement('web-comp');</script>
```
The browser will define the following properties

* `isLoading`
* `isCurrentScript`
* `newTarget`

#### createElement disconnected async

Asynchronous creation of an empty new component

```html
<script src="./WebComp.js"></script>
<script>setTimeout(function () {
   document.createElement('web-comp')
  }, 10)</script>
```

The browser will define the following properties

* `newTarget`

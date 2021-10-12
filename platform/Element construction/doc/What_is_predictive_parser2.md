# Web component construction

When the browser starts to receive HTML page data over the network, it immediately launches its parser to convert the HTML
into a document object model (DOM).
The first step of this parsing process is to break down HTML into tokens that represent start tags (`<div>`), end tags (`</div>`),
and their contents.From this it builds the DOM.
When the parser encounters an external resource, such as a CSS or JavaScript file, it tries, to retrieve it. 
The parser will continue to work as the CSS file is loaded, but it will block rendering until the file is loaded and parsed.

When the browser already knows the tag, it will call the `constructor()`, and maybe `attributeChangedCallback()` and
 `connectedCallback()` for those elements immediately.

### Some important (commonly used) Element properties on constructor phase

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



## `Predictive parser`

When the browser starts to receive HTML page data over the network, it immediately launches its parser to convert the HTML
into a document object model (DOM). Let's consider several examples of predictive parsing.

> In order to consider two elements (light and shadow) at the same time, the test `<web-comp>` contains a shadow tree and 
>`<inner-component>` inside. The shadow component copies all attributes of the light component using attributeChangedCallback();.

#### Predictive empty

When previously defined a component and then added to the DOM.

```html
<script src="./WebComp.js"></script>
<web-comp></web-comp>
```

The original component will have the following properties 

* `isLoading`
* `newTarget`
* `predictive`

The shadow component:

* `isLoading`
* `isCurrentScript`
* `newTarget`
* `withinCount` 

#### Predictive with attributes

   Let's add an attribute and a test node as a child.
   ```html
    <script src="./WebComp.js"></script>
    <web-comp a="a" b="b">hello sunshine</web-comp>
   ```
   
   The original component will have the same properties, even if attributes have been added
   
   * `isLoading`
   * `newTarget`
   * `predictive`
   
   The shadow component:
   
   * `hasAttributes`
   * `isLoading`
   * `isCurrentScript`
   * `newTarget`
   * `withinCount` 


This demos shows that with this approach, the attributes are not defined at the constructor stage, but later. This means that this approach is not suitable for creating elements that use their attribute values in the constructor step. 

### `Upgrade process`

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

#### Upgrade empty

First add a web component to the DOM, and only then we define it.
```html
<web-comp></web-comp>
<script src="./WebComp.js"></script>
```

It produces the following properties for light DOM component
 
* `hasParentNode`  - #body
* `isConnected`  
* `isLoading`
* `isCurrentScript`
* `currentScriptIsLastElement`
* `newTarget`

The shadow component:

* `isLoading`
* `isCurrentScript`
* `currentScriptIsLastElement`
* `newTarget`
* `withinCount` 

#### Upgrade with attributes and children 

Let's repeat the previous example, but with the use of attributes and children's elements.

```html
<web-comp a="a" b="b">hello <b>beautiful</b> sunshine</web-comp>
<script src="./WebComp.js"></script>
```

It produces the following properties for light DOM component

* `hasParentNode`  - #body
* `hasAttributes`  - [a, b]
* `hasChildNodes`  - [`<b>`]
* `isConnected`
* `isLoading`
* `isCurrentScript`
* `currentScriptIsLastElement`
* `newTarget`

The shadow component:

* `hasAttributes`  - [a, b]
* `isLoading`
* `isCurrentScript`
* `currentScriptIsLastElement`
* `newTarget`
* `withinCount` 

#### Upgrade within

If you insert a `<script>` that defines a component as a child of that component it will allow to define it. 

```html
<web-comp a="a" b="b"> hello
  <script src="./WebComp.js"></script> sunshine
</web-comp>
```

Browser defines next properties for light DOM component

* `hasParentNode`  - #body
* `hasAttributes`  - [a, b]
* `hasChildNodes`  - [`<b>`]
* `isConnected`  
* `isLoading`
* `isCurrentScript`
* `currentScriptIsLastElement`
* `syncUpgrade`
* `newTarget`

The shadow component:

* `hasAttributes`  - [a, b]
* `isLoading`
* `isCurrentScript`
* `currentScriptIsLastElement`
* `newTarget`
* `withinCount` 

#### Upgrade async 

In some cases, an element can be just created as an object, then defined, and only then added to the DOM.
```html
 <div></div>
 <script>window.test = document.createElement('web-comp');</script>
 <script src="./WebComp.js"></script>
 <script>setTimeout(() => document.body.prepend(window.test))</script>
```

It produces the following properties for light DOM component:

* `hasParentNode`  - #body
* `isConnected`  
* `newTarget`

The shadow component:

* `newTarget`
* `withinCount` 

In this approach, all attributes are already defined at the designer stage. This is because when the browser sees an 
unidentified element, it still defines its properties, but its prototype is HTMLUnknownElement. When the element is defined,
it changes to the class associated with it and calls its constructor. That is, the browser doesn't waste time assigning 
attributes, but already knows them.
So when you need to use attributes in the design phase, that's a pretty good way to go.

## `innerHTML()`

> The Element `innerHTML` interface property sets or gets the HTML markup of the child elements.

#### innerHTML empty not connected

Creating empty element and assigning it a web component as a child using `.innerHTML`.

```javascript
const div = document.createElement('div');
div.innerHTML = '<web-comp></web-comp>';
```

It produces the following properties for light DOM component:

* `hasParentNode`  - #div
* `isLoading`
* `isCurrentScript`
* `newTarget`

The shadow component:

* `isLoading`
* `isCurrentScript`
* `newTarget`
* `withinCount` 


#### insertAdjacentHTML empty not connected

A similar method is `insertAdjacentHTML()`.

```javascript
const div = document.createElement('div');
div.insertAdjacentHTML('afterbegin', '<web-comp></web-comp>');
```

It produces the following properties for light DOM component:

* `hasParentNode`  - #div
* `isLoading`
* `isCurrentScript`
* `newTarget`

The shadow component:

* `isLoading`
* `isCurrentScript`
* `newTarget`
* `withinCount` 

The same result. The browser handles them the same way.

#### innerHTML attributesChildren not connected

Create an element with attributes and a text node inside. 
```javascript
const div = document.createElement('div');
div.innerHTML = '<web-comp a="a" b="b">hello sunshine</web-comp>';
```

It produces the following properties for light DOM component:

* `hasParentNode`  - #div
* `hasAttributes`  - [a, b]
* `hasChildNode`  - #text
* `isLoading`
* `isCurrentScript`
* `newTarget`

The shadow component:

* `hasAttributes`  - [a, b]
* `isLoading`
* `isCurrentScript`
* `newTarget`
* `withinCount` 

#### innerHTML attributesChildren not connected nested inside

Creating an element with attributes and a similar web component as a child. 

```javascript
const div = document.createElement('div');
div.innerHTML = `
<web-comp a="a" b="b">hello
  <web-comp a="a" b="b">sunshine</web-comp>
</web-comp>`;
```

The result of the _parent_ lightDOM element is as follows

* `hasParentNode`  - #div
* `hasAttributes`  - [a, b]
* `hasChildNode`  - #text
* `isLoading`
* `isCurrentScript`
* `newTarget`

The shadow component:

* `hasAttributes`  - [a, b]
* `isLoading`
* `isCurrentScript`
* `newTarget`
* `withinCount` 

The result of the _children_ element is

* `hasParentNode`  - #div
* `hasAttributes`  - [a, b]
* `hasChildNode`  - #text
* `isLoading`
* `isCurrentScript`
* `newTarget`
* `withinCount` - is a child of another `<web-comp>`.

The shadow component:

* `hasAttributes`  - [a, b]
* `isLoading`
* `isCurrentScript`
* `newTarget`
* `withinCount` 

#### innerHTML empty

The `<web-comp>` component is added to the element in the DOM as a child.

```html
<script src="./WebComp.js"></script>
<div></div>
<script>
document.querySelector('div').innerHTML = '<web-comp></web-comp>';
</script>
```

LightDOM component result:

* `hasParentNode`  - #div
* `isConnected`   
* `isLoading`
* `isCurrentScript`
* `newTarget`

The shadow component:

* `isLoading`
* `isCurrentScript`
* `newTarget`
* `withinCount` 

#### innerHTML async

```html
<script src="./WebComp.js"></script>
<div></div>
<script>setTimeout(function () {
   document.querySelector('div').innerHTML = '<web-comp></web-comp>'
  }, 10);
</script>
```

It produces the following properties for light DOM component:

* `hasParentNode`  - #body
* `isConnected`  
* `newTarget`

The shadow component:

* `newTarget`
* `withinCount` 

When you use `.innerHTML`, the browser handles the element similarly to the upgrade process. The browser determines attributes even though the component was defined before it was added to the DOM, it does not repeat the predictive parser.


## `cloneNode()`

Another way to create an element is to call `.cloneNode(true)`. Every time a component is copied, its constructor will be called. Therefore, we consider the properties of the original and copied components.

#### cloneNode above, not connected.
Let's look at an example where we create an element then define its `.innerHTML` like the example above and then copy it.
```javascript
const div = document.createElement('div');
div.innerHTML = `<web-comp a="a" b="b">hello</web-comp>`;
div.cloneNode(true);
```

The _original_ component will have the following properties 
* `hasParentNode`  - #div
* `hasAttributes`  - [a, b]
* `hasChildNode`  - #text
* `isLoading`
* `isCurrentScript`
* `newTarget`

The shadow component:

* `hasAttributes`  - [a, b]
* `isLoading`
* `isCurrentScript`
* `newTarget`
* `withinCount` 

The _cloned_ component 
* `hasParentNode`  - #div
* `hasAttributes`  - [a, b]
* `hasChildNode`  - #text
* `isLoading`
* `isCurrentScript`
* `newTarget`
* `withinCount`  - is a child of another `<web-comp>`.

The shadow component:

* `hasAttributes`  - [a, b]
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

The _original_ component will have the following properties 

* `hasParentNode`  - #div
* `isConnected`
* `isLoading`
* `isCurrentScript`
* `currentScriptIsLastElement`
* `newTarget`

The shadow component:

* `isLoading`
* `isCurrentScript`
* `currentScriptIsLastElement`
* `newTarget`
* `withinCount` 

The _cloned_ component 

* `hasParentNode`  - #div
* `newTarget`
* `withinCount`

The shadow component:

* `newTarget`
* `withinCount`  

#### cloneNode empty not connected

Copying a created component
```html
  <script src="./WebComp.js"></script>
  <script>
    const empty = document.createElement('web-comp');
    empty.cloneNode(true);
  </script>
```
Browser define the following properties

The _original_ lightDOM component will have the following properties:

* `isLoading`
* `isCurrentScript`
* `newTarget`

The shadow component:

* `isLoading`
* `isCurrentScript`
* `newTarget`
* `withinCount`

The cloned lightDOM component:

* `isLoading`
* `isCurrentScript`
* `newTarget`

The shadow component:

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

The _original_ lightDOM component will have the following properties 
* `hasParentNode`  - #div
* `hasAttributes`  - [a, b]
* `hasChildNode`  - #text
* `isLoading`
* `isCurrentScript`
* `newTarget`

The shadow component:

* `isLoading`
* `isCurrentScript`
* `currentScriptIsLastElement`
* `newTarget`
* `withinCount` 

The _cloned_ lightDOM component:

* `isLoading`
* `isCurrentScript`
* `newTarget`
* `withinCount` 

The shadow component:

* `isLoading`
* `isCurrentScript`
* `newTarget`
* `withinCount`  


 The .cloneNode method also handles the element similar to the upgrade process. The browser does not ignore attributes and other properties.

## createElement 

The `.createElement()` creates an element with the tag that is given in the argument, or `HTMLUnknownElement` if the tag name is not recognized.

#### createElement empty disconnected

Creating an empty new component
```html
<script src="./WebComp.js"></script>
<script>document.createElement('web-comp');</script>
```
The browser will define the following properties for lightDOM component:

* `isLoading`
* `isCurrentScript`
* `newTarget`

The shadow component:

* `isLoading`
* `isCurrentScript`
* `newTarget`
* `withinCount`


#### createElement disconnected async

Asynchronous creation of an empty new component

```html
<script src="./WebComp.js"></script>
<script>setTimeout(function () {
   document.createElement('web-comp')
  }, 10)</script>
```

The browser will define the following properties for lightDOM component:

* `newTarget`

The shadow component:

* `newTarget`
* `withinCount`

## `new` keyword

> The new operator lets developers create an instance of a user-defined object type or of one of the built-in object types that has a constructor function.

#### `new()` empty, not connected

Creating an element as an instance of a class

```js
  new WebComp();
```

The browser will define the following properties for lightDOM component:

* `isLoading`
* `isCurrentScript`
* `newTarget`

The shadow component:

* `isLoading`
* `isCurrentScript`
* `newTarget`
* `withinCount`

#### `new()` eventListener, not connected

Creating a component as a result of an event

```html
 <script>window.addEventListener('bob-bob', e => new WebComp())</script>
 <script>window.dispatchEvent(new Event('bob-bob'))</script>
```

The browser will define the following properties for lightDOM component:

* `isLoading`
* `isCurrentScript`
* `newTarget`
* `withinCount`

The shadow component:

* `isLoading`
* `isCurrentScript`
* `isEventListener`
* `newTarget`
* `withinCount`
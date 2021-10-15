# What is `beforescriptexecute` event


The `beforescriptexecute` (and `afterscriptexecute`) events allows web pages and extension developers to monitor the insertion
of `<script>` tags in a web page and prevent the script from executing.

> The `beforescriptexecute` event is fired when a script is about to be executed. Cancelling the event prevents the script from executing.

It only fires on script blocks when they are first evaluated. It will not fire if you call a function in a block after load.
It may seem obvious, but it only fires on blocks that come after the event hookup. This means it will not fire on the 
script block the `addEventListener` is part of.

It is a proprietary event specific to Gecko, [so it only supports in Mozilla Firefox browser](https://caniuse.com/mdn-api_element_beforescriptexecute_event).


## Polyfill

This beforescriptexecute polyfill has two differences with the FF original event (I think)
1. It dispatches a beforescriptexecute event at the *end of parsing*. This will happen whether or not any async or
   `<script defer>` scripts is added or not.
2. It will not dispatch any beforescriptexecute events *after* the document has finished loading and
   switched to interactive.
   
During "loading"/interpretation of the main document:

 ```js
 new MutationObserver(callback).observe(document.documentElement, {childList: true, subtree: true});
```

will aggregate all changes and only *break* off and
trigger the callback **before** either
1. a `<script>` begins (not defer, as they only run once "loading" has completed) or
2. the predictive parser calls a custom element constructor
   (which is essentially the same as if the predictive parser would invoke a script).
The `beforescriptexecute` event has *one* property: `.lastParsed`.
The lastParsed is the current position of the parser at the time of `beforescriptexecute` dispatch.
This position is known or guesstimated as:
1. If a sync `<script>` is about to run, then
   the document.currentScript represent the last parsed element.
2. If the predictive parser calls an already defined custom element, then
   the innermost element found from the <html> element in the document
   can be assumed to be the element currently being parsed.   
   

### Problems

#### Problem 1:

a) Imagine the main document containing two *sibling* custom element tags
    with **NO** whitespace in between:
   ```html
   <a-a></a-a><b-b></b-b>
   ```
    
  When the `constructor()` of `<b-b>` is called, then lastParsed will find the "<a-a>" element.

b) Imagine the main document containing two *nested* custom element tags:
   ```html
   <a-a><b-b></b-b></a-a>
   ```
   Again, when the constructor() og `<b-b>` is called, then again lastParsed will find the `<a-a>` element.

 The problem is:
   1. Yes, you and I can *plainly read* in the HTML text that
       these two situations are different.
   2. Yes, in the sibling scenario the browser's parser **has read** the
       endTag `</a-a>` and there **knows** the difference between the two scenarios.
   3. No, the browers' parsers **DO NOT** write the knowledge that it **has read**
       the endTag `</a-a>` in the sibling scenario to any property in the DOM nor JS land.
   4. Therefore, from JS, there is no way for you and I and JS scripts to
       distinguish **no space custom element siblings** from **no space custom element
       parent-child** scenarios. So, if you are to guess, then you should guess that
       "<b-b>" is a child, not a sibling.

#### Problem 2:
   The first 'readystatechange' event happens before the mutationObserver is triggered when parsing ends:
   ie. at the end of the document we get sequence:
   1. `readystatechange`(loading => interactive)
   2. mutationObserver trigger
   3. `readystatechange`(interactive => completed)

This problem is solved by adding a one-time, EarlyBird event listener for readystatechange event that dispatch a `beforescriptexecute` event.

### Code
```js
function deepestElement(root) {                                              
  while (root.lastChild) root = root.lastChild;
  return root;
}

function lastParsed() {                                                       
  return !document.currentScript || document.currentScript.hasAttribute('async') ?
    deepestElement(document.documentElement) :                                //[5]
    document.currentScript;
}

document.readyState === "loading" && (function () {
  function dispatchBeforeScriptExecute() {                                    //[3]
    const ev = new Event('beforescriptexecute');                      
    ev.lastParsed = lastParsed();                                             //[4]
    return window.dispatchEvent(ev);                                          //[6]        
  }

  const mo = new MutationObserver(dispatchBeforeScriptExecute);               
  mo.observe(document.documentElement, {childList: true, subtree: true});     //[2]

  window.addEventListener('readystatechange', function () {                   //[7]
    dispatchBeforeScriptExecute();                                            //[2]
    mo.disconnect();                                                          //[8]
  }, {capture: true, once: true});
})();                                                                         //[1]
```

1. A self-invoking function that can only be called at the "loading" stage of the document loading.
2. Mutation observer, calling `dispatchBeforeScriptExecute()`. The observer is triggered by adding or removing children and descendants of the target element.
3. The `dispatchBeforeScriptExecute()` function creates a new `beforescriptexecute` event. And defines its `lastParsed` property.
4. If there is no `.currentScript` document property or if there is an `async` flag on the `<script>` element, the `.lastParsed` property is defined using `deepestElement()`.
5. The `deepestElement()` function identifies the most recent element in the chain of DOM element nesting available at this point.
6. Dispatch `beforescriptexecute` event with last parsed element as `.lastParsed` property value.
7. Each time the readyState document attribute changes, a `dispatchBeforeScriptExecute` with the above algorithm is triggered once.
8. But after that the mutation observer is disconnected.

### Demo

The Main idea of the demonstration is to demonstrate that the `beforescriptexecute` event is triggered before each script
is executed. At each trigger the value of the last parsed node is added to the `res` variable. 

```html
<script>
  var res = "";
  window.addEventListener('beforescriptexecute', ({lastParsed}) =>
    res += lastParsed.textContent[0]
  );
  
  document.addEventListener('readystatechange', function () {
    console.log(res, res === '1234567');
    console.log(document.readyState, document.readyState === 'interactive');
  }, {once: true});

  customElements.define('web-comp', class WebComp extends HTMLElement {
    constructor() {
      super();
      res += parseInt(res[res.length - 1]) + 1;
    }
  });
</script>

<script src="src/beforescriptexecute.js"></script>
<body>

<!--0--><div>wrong</div>               //[1]
<h3>Test of beforescriptexecute</h3>   
<!--1--><web-comp a>                   //[2]
    <!--3--><web-comp b></web-comp>    //[3,4]
</web-comp>

<script>5; res+=6;</script>            //[5,6]
</body>
<!--7-->
```

1. The first result of MO is an array of nodes, with the following values.
   * `#text`: "" - text node before body
   * `#body`
   * `#text`: "" - text node  before comment
   * `#comment`: <!--1-->
   * `#text`: "" - text node before div
   * `#div`:  
   * `#text` : "" - text node before h3
   * `#h3` 
   * `#text` : "Test of beforescriptexecute" - text inside h3
   * `#text` : "" - text node after `h3`
   * `#comment` : - <!--1-->
So lastParsed element is `#comment` and first value is `1`.
2. Second result of MO callback is `web-comp a`. When its constructor is triggered, a new value will be added to the `res` variable, _+1 to the last value_. Therefore `2` will be added.

3. Before starting to process the internal `web-comp b` which is in `web-comp a` the MO will be triggered with the values:
   * `#text`: "" - text node  before comment
   * `#comment`: <!--3--> 
   Last parsed element is comment and value is 3.

4. The `<web-comp b>` has the same logic as `<web-comp a>` . Value is `4`.
5. Next MO result is
  * `#text`: "" - text node of web-comp b
  * `#text`: "" - text node of web-comp a
  * `#script`
  * `#text`: "5; res+=6;" - text node inside script.

When adding new values to a `res` variable, only the first number is used. Therefore the result is `5`.

6.The browser then interprets res+=6 as part of the script, and adds `6` to `res`. 

7.The `readystatechange` event is fired when the readyState attribute of a document has changed. It fires MO callback function and get `#comment <!--7-->` as the last value.

#### Result:

1234567 `true`
interactive `true`

### Reference

[MDN: beforescriptexecute event ] (https://developer.mozilla.org/en-US/docs/Web/API/Element/beforescriptexecute_event)




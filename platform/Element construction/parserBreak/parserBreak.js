/**
 Ok, the parser-break event. Signals a major break during the loading of the main document. Is given its own macro-task, ie. a full event.
 The event precedes:
 every sync <script> tag, both inline and src,
 most *defined* web components, EXCEPT defined web components that directly follow (with NO-whitespace) after either a) a sync <script> or b) another defined web component's start/end-tag that has a .connectedCallback.
 in rare, edge cases <script async>. This is not to be expected, and can occur any time.
 Why parser-break event? Custom elements that assign nodes imperatively should not run this functionality until all the childNodes in the template is ready. When elements load, this state cannot be assessed at connectedCallback time because only the host node is present and the childNodes are always unknown.
 Thus, during loading, the browser should only check the state of custom elements at parser-break, this is most efficient and the only necessary times. If all the childNodes have been added at this time, which is identified by the lastParsed element is not a DOM descendant of the custom element, the childReady can be called for the constructionFrame the custom element is a root of.
 */
function deepestElement(root) {
  while (root.lastChild) root = root.lastChild;
  return root;
}

function lastParsed() {

  return !document.currentScript || document.currentScript.hasAttribute('async') ?
    deepestElement(document.documentElement) :
    document.currentScript;
}

document.readyState === "loading" && (function () {
  function dispatchBeforeScriptExecute(arg) {
    const ev = new Event('parser-break');
    console.log(arguments[0])
    const lastParsedElement = lastParsed();

    if(lastParsedElement.connectedCallback) return;
      ev.lastParsed = lastParsedElement;

    return window.dispatchEvent(ev);
  }

  const mo = new MutationObserver(dispatchBeforeScriptExecute);
  mo.observe(document.documentElement, {childList: true, subtree: true});
  window.addEventListener('readystatechange', function () {
    dispatchBeforeScriptExecute();
     mo.disconnect();
  }, {capture: true, once: true});
})();

//todo need to test how it behaves in Safari and Firefox,
// In 2021 Chrome, this behavior will only trigger before the next script or when the predictive parser calls a custom element constructor.
// that it only triggers before custom events or <script> functions.
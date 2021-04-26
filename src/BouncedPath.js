export function* PathIterator(path, phase) {
  if (phase === 1) {
    for (let i = path.length - 1; i > 0; i--)
      yield path[i];
  } else if (phase === 2) {
    yield path[0];
  } else if (phase === 3) {
    for (let i = 1; i < path.length; i++)
      yield path[i];
  }
}

export function* ContextIterator(context, parent) {
  context.parent = parent;
  yield context;
  for (let child of context.contexts.filter(c => c)) {
    for (let descendant of ContextIterator(child, context))
      yield descendant;
  }
}

export function composedPath(target, endDocumentOrWindowOrComposedTrueFalse) {
  const res = [];
  while (target) {
    res.push(target);
    target = target === endDocumentOrWindowOrComposedTrueFalse ? null :
      target === document ? window :
        target.assignedSlot || target.parentNode || (endDocumentOrWindowOrComposedTrueFalse ? target.host : null);
  }
  return res;
}

export function getPropagationRoot(target, event) {
  if (target === window) return window;
  const root = target.getRootNode(event);
  return root === document ? window : root;
}

//rule 1: The Bounce sequence always ends with a DocumentFragment, document, or window.
export function bounceSequence(target, endDocumentWindowTrueOrFalse, targetContext) {
  const path = [], contexts = targetContext ? [targetContext] : [];
  for (let t = target; t; t = t.parentNode)
    path.push(t);
  for (let i = 0; i < path.length - 2; i++) {  //-1 => document, -2 => topMost element
    const slot = path[i].assignedSlot;
    if (slot)
      contexts[i + 1] = bounceSequence(slot, path[i + 1].shadowRoot, undefined);
  }
  let root = path[path.length - 1];
  if (root === endDocumentWindowTrueOrFalse)                       //check for document as root.
    return {path, contexts, target, root};
  if (root === document) {
    path.push(root = window);
    return {path, contexts, target, root};
  }
  if (!endDocumentWindowTrueOrFalse || !(root instanceof DocumentFragment) || !root.host)
    return {path, contexts, target, root};
  return bounceSequence(root.host, endDocumentWindowTrueOrFalse, {path, contexts, target, root});
}

export function toString(context, depth = '', i = 0) {
  let {path, contexts} = context;
  path = depth + i + ':' + path.map(et => et.nodeName || 'window').join(',');
  contexts = contexts.map((c, i) => c ? toString(c, depth + '..', i) : null).filter(a => a);
  return [path, ...contexts.flat()];
}

export function contextForElement(context, el) {
  if (context.path.includes(el))
    return context;
  for (let child of context.contexts.filter(c => c)) {
    const res = contextForElement(child, el);
    if (res) return res;
  }
}

export function* SubsequentSiblingContexts(context) {
  if (!context.parent) return;
  const siblings = context.parent.contexts;
  for (let i = siblings.indexOf(context) + 1; i < siblings.length; i++)
    yield siblings[i];
}
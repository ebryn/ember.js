require('ember-metal/core');
require('ember-metal/platform');
require('ember-metal/utils');

/**
@module ember-metal
*/

var o_create = Ember.create,
    metaFor = Ember.meta,
    metaPath = Ember.metaPath,
    guidFor = Ember.guidFor,
    a_slice = [].slice;

/*
  The event system uses a series of nested hashes to store listeners on an
  object. When a listener is registered, or when an event arrives, these
  hashes are consulted to determine which target and action pair to invoke.

  The hashes are stored in the object's meta hash, and look like this:

      // Object's meta hash
      {
        listeners: {       // variable name: `listenerSet`
          "foo:changed": { // variable name: `actions`
            targets: [],   // an array of target objects, null means `this`
            methods: []    // an array of arrays. indexes correspond with targets
          }
        }
      }

*/

function actionsFor(obj, eventName, target, writable) {
  // FIXME: target arg is unused
  var meta = metaFor(obj, writable);

  // create or clone listeners obj
  meta.listeners = meta.listeners || {__ember_source__: obj};
  if (meta.listeners.__ember_source__ !== obj) {
    meta.listeners = o_create(meta.listeners);
    meta.listeners.__ember_source__ = obj;
  }

  // create or clone actions
  var actions = meta.listeners[eventName] = meta.listeners[eventName] || {__ember_source__: obj};
  if (actions && actions.__ember_source__ !== obj) {
    meta.listeners = o_create(meta.listeners);
    meta.listeners.__ember_source__ = obj;

    var methodsCopy = [];
    for (var i = 0, l = actions.methods.length; i < l; i++) {
      methodsCopy.push(actions.methods[i].slice());
    }

    actions = meta.listeners[eventName] = {
      targets: actions.targets.slice(),
      methods: methodsCopy
    };
  } else {
    actions.targets = actions.targets || [];
    actions.methods = actions.methods || [];
  }
  return actions;
}

// Gets the set of all targets, keyed on the guid of each action's
// target property.
function targetSetFor(obj, eventName) {
  var listenerSet = metaFor(obj, false).listeners;
  if (!listenerSet) { return false; }

  return listenerSet[eventName] || false;
}

// TODO: This knowledge should really be a part of the
// meta system.
var SKIP_PROPERTIES = { __ember_source__: true };

function iterateSet(actions, callback) {
  if (!actions.targets) { return false; }

  for (var i = 0, l = actions.targets.length; i < l; i++) {
    var target = actions.targets[i],
        methods = actions.methods[i];

    // loop backwards because of removeListener
    for (var j = methods.length - 1; j >= 0; j--) {
      var method = methods[j];
      if (!method) { continue; }
      if (callback({target: target, method: method}) === true) {
        return true;
      }
    }
  }

  return false;
}

function invokeAction(action, params, sender) {
  var method = action.method, target = action.target;
  // If there is no target, the target is the object
  // on which the event was fired.
  if (!target) { target = sender; }
  if ('string' === typeof method) { method = target[method]; }
  if (params) {
    method.apply(target, params);
  } else {
    method.apply(target);
  }
}

function targetSetUnion(obj, eventName, actions) {
  actions.targets = actions.targets || [];
  actions.methods = actions.methods || [];

   iterateSet(targetSetFor(obj, eventName), function (action) {
     var targetIndex = actions.targets.indexOf(action.target), methodIndex, targetMethods;
 
     if (targetIndex !== -1) {
       targetMethods = actions.methods[targetIndex];
       methodIndex = targetMethods.indexOf(action.method);
       if (methodIndex === -1) {
         targetMethods.push(action.method);
       }
     } else {
       actions.targets.push(action.target);
       actions.methods.push([action.method]);
     }
  });
}

function addAction(actions, action) {
    var targetIndex = actions.targets.indexOf(action.target),
        targetMethods = actions.methods[targetIndex],
        targetMethodIndex = targetMethods && targetMethods.indexOf(action.method);
    if (targetMethods && targetMethodIndex === -1) {
      targetMethods.push(action.method);
    } else {
      actions.targets.push(action.target);
      actions.methods.push([action.method]);
    }
}

function targetSetDiff(obj, eventName, actions) {
  actions.targets = actions.targets || [];
  actions.methods = actions.methods || [];
  var diffActions = {targets: [], methods: []};
  iterateSet(targetSetFor(obj, eventName), function (action) {
    var targetIndex = actions.targets.indexOf(action.target),
        targetMethods = actions.methods[targetIndex],
        targetMethodIndex = targetMethods && targetMethods.indexOf(action.method);
    if (targetMethods && targetMethodIndex !== -1) return;
    addAction(actions, action);
    addAction(diffActions, action);
  });
  return diffActions;
}

/**
  Add an event listener

  @method addListener
  @for Ember
  @param obj
  @param {String} eventName
  @param {Object|Function} targetOrMethod A target object or a function
  @param {Function|String} method A function or the name of a function to be called on `target`
*/
function addListener(obj, eventName, target, method) {
  Ember.assert("You must pass at least an object and event name to Ember.addListener", !!obj && !!eventName);

  if (!method && 'function' === typeof target) {
    method = target;
    target = null;
  }

  var actions = actionsFor(obj, eventName, target, true),
      targetIndex = actions.targets.indexOf(target);
  if (targetIndex !== -1) {
    var targetMethods = actions.methods[targetIndex] = actions.methods[targetIndex] || [],
        targetMethodIndex = targetMethods.indexOf(method);

    if (targetMethodIndex === -1) {
      targetMethods.push(method);
    }
  } else {
    actions.targets.push(target);
    actions.methods.push([method]);
  }

  if ('function' === typeof obj.didAddListener) {
    obj.didAddListener(eventName, target, method);
  }
}

/**
  Remove an event listener

  Arguments should match those passed to {{#crossLink "Ember/addListener"}}{{/crossLink}}

  @method removeListener
  @for Ember
  @param obj
  @param {String} eventName
  @param {Object|Function} targetOrMethod A target object or a function
  @param {Function|String} method A function or the name of a function to be called on `target`
*/
function removeListener(obj, eventName, target, method) {
  Ember.assert("You must pass at least an object and event name to Ember.removeListener", !!obj && !!eventName);

  if (!method && 'function' === typeof target) {
    method = target;
    target = null;
  }

  function _removeListener(target, method) {
    var actions = actionsFor(obj, eventName, target, true),
        targetIndex = actions.targets.indexOf(target),
        targetMethods = actions.methods[targetIndex] || [];

    var targetMethodIndex = targetMethods.indexOf(method);
    if (targetMethodIndex !== -1) { targetMethods.splice(targetMethodIndex, 1); }
    if (!targetMethods.length) {
      actions.targets.splice(targetIndex, 1);
      actions.methods.splice(targetIndex, 1);
    }

    if ('function' === typeof obj.didRemoveListener) {
      obj.didRemoveListener(eventName, target, method);
    }
  }

  if (method) {
    _removeListener(target, method);
  } else {
    iterateSet(targetSetFor(obj, eventName), function(action) {
      _removeListener(action.target, action.method);
    });
  }
}

/**
  @private

  Suspend listener during callback.

  This should only be used by the target of the event listener
  when it is taking an action that would cause the event, e.g.
  an object might suspend its property change listener while it is
  setting that property.

  @method suspendListener
  @for Ember
  @param obj
  @param {String} eventName
  @param {Object|Function} targetOrMethod A target object or a function
  @param {Function|String} method A function or the name of a function to be called on `target`
  @param {Function} callback
*/
function suspendListener(obj, eventName, target, method, callback) {
  if (!method && 'function' === typeof target) {
    method = target;
    target = null;
  }

  var actions = actionsFor(obj, eventName, target, true),
      targetIndex = actions.targets.indexOf(target),
      targetMethods = targetIndex !== -1 && actions.methods[targetIndex],
      targetMethodIndex = targetMethods && targetMethods.indexOf(method),
      action;

  if (targetMethods && targetMethodIndex !== -1) {
    action = targetMethods.splice(targetMethodIndex, 1)[0];
  }

  try {
    return callback.call(target);
  } finally {
    if (action) { targetMethods.push(action); }
  }
}

/**
  @private

  Suspend listener during callback.

  This should only be used by the target of the event listener
  when it is taking an action that would cause the event, e.g.
  an object might suspend its property change listener while it is
  setting that property.

  @method suspendListener
  @for Ember
  @param obj
  @param {Array} eventName Array of event names
  @param {Object|Function} targetOrMethod A target object or a function
  @param {Function|String} method A function or the name of a function to be called on `target`
  @param {Function} callback
*/
function suspendListeners(obj, eventNames, target, method, callback) {
  if (!method && 'function' === typeof target) {
    method = target;
    target = null;
  }

  var removedMethods = [],
      targetMethodArrays = [],
      eventName, actions, action, i, l;

  for (i=0, l=eventNames.length; i<l; i++) {
    eventName = eventNames[i];
    actions = actionsFor(obj, eventName, target, true);
    var targetIndex = actions.targets.indexOf(target),
        targetMethods = actions.methods[targetIndex],
        targetMethodIndex = actions.methods[targetIndex].indexOf(method);

    if (targetMethodIndex !== -1) {
      removedMethods.push(targetMethods.splice(targetMethodIndex, 1)[0]);
    }
    targetMethodArrays.push(targetMethods);
  }

  try {
    return callback.call(target);
  } finally {
    for (i=0, l=removedMethods.length; i<l; i++) {
      targetMethodArrays[i].push(removedMethods[i]);
    }
  }
}

/**
  @private

  Return a list of currently watched events

  @method watchedEvents
  @for Ember
  @param obj
*/
function watchedEvents(obj) {
  var listeners = metaFor(obj, false).listeners, ret = [];

  if (listeners) {
    for(var eventName in listeners) {
      if (!SKIP_PROPERTIES[eventName] && listeners[eventName]) {
        ret.push(eventName);
      }
    }
  }
  return ret;
}

/**
  @method sendEvent
  @for Ember
  @param obj
  @param {String} eventName
  @param {Array} params
  @return true
*/
function sendEvent(obj, eventName, params, targetSet) {
  // first give object a chance to handle it
  if (obj !== Ember && 'function' === typeof obj.sendEvent) {
    obj.sendEvent(eventName, params);
  }

  if (!targetSet) targetSet = targetSetFor(obj, eventName);

  iterateSet(targetSet, function (action) {
    invokeAction(action, params, obj);
  });
  return true;
}

/**
  @private
  @method hasListeners
  @for Ember
  @param obj
  @param {String} eventName
*/
function hasListeners(obj, eventName) {
  if (iterateSet(targetSetFor(obj, eventName), function() { return true; })) {
    return true;
  }

  // no listeners!  might as well clean this up so it is faster later.
  var set = metaPath(obj, ['listeners'], true);
  set[eventName] = null;

  return false;
}

/**
  @private
  @method listenersFor
  @for Ember
  @param obj
  @param {String} eventName
*/
function listenersFor(obj, eventName) {
  var ret = [];
  iterateSet(targetSetFor(obj, eventName), function (action) {
    ret.push([action.target, action.method]);
  });
  return ret;
}

Ember.addListener = addListener;
Ember.removeListener = removeListener;
Ember._suspendListener = suspendListener;
Ember._suspendListeners = suspendListeners;
Ember.sendEvent = sendEvent;
Ember.hasListeners = hasListeners;
Ember.watchedEvents = watchedEvents;
Ember.listenersFor = listenersFor;
Ember.listenersDiff = targetSetDiff;
Ember.listenersUnion = targetSetUnion;

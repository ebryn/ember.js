require('ember-metal/core');
require('ember-metal/platform');
require('ember-metal/utils');

/**
@module ember-metal
*/

var o_create = Ember.create,
    metaFor = Ember.meta,
    metaPath = Ember.metaPath;

/*
  The event system uses a series of nested hashes to store listeners on an
  object. When a listener is registered, or when an event arrives, these
  hashes are consulted to determine which target and action pair to invoke.

  The hashes are stored in the object's meta hash, and look like this:

      // Object's meta hash
      {
        listeners: {       // variable name: `listenerSet`
          "foo:changed": [ // variable name: `actions`
            [method, target, onceFlag]
          ]
        }
      }

*/

function indexOf(array, target, method, once) {
  var index = -1;
  for (var i = 0, l = array.length; i < l; i++) {
    if (method === array[i][0] && target === array[i][1] /* FIXME && once === array[i][2]*/) { index = i; break; }
  }
  return index;
}

// FIXME: writable isn't used anymore
function actionsFor(obj, eventName, writable) {
  var meta = metaFor(obj, writable),
      actions;

  if (!meta.listeners) { meta.listeners = {}; }

  if (!meta.hasOwnProperty('listeners')) {
    // setup inherited copy of the listeners object
    meta.listeners = o_create(meta.listeners);
  }

  // copy the actions from the parent if they exist, or initialize to an empty array
  actions = meta.listeners[eventName];

  // if there are actions, but the eventName doesn't exist in our listeners, then copy them from the prototype
  if (actions && !meta.listeners.hasOwnProperty(eventName)) {
    actions = meta.listeners[eventName] = meta.listeners[eventName].slice();
  } else if (!actions) {
    actions = meta.listeners[eventName] = [];
  }

  return actions;
}

function iterateSet(actions, callback) {
  if (!actions) { return false; }

  // loop backwards because of removeListener
  for (var i = actions.length - 1; i >= 0; i--) {
    if (!actions[i]) { continue; } // needed for removing an observer inside an observer?
    if (callback(actions[i][1], actions[i][0], actions[i][2]) === true) {
      return true;
    }
  }

  return false;
}

function targetSetUnion(obj, eventName, otherActions) {
  var meta = metaFor(obj, false),
      actions = meta.listeners && meta.listeners[eventName];

  iterateSet(actions, function (target, method, once) {
    var actionIndex = indexOf(otherActions, target, method, once);

    if (actionIndex === -1) {
      otherActions.push([method, target, once]);
    }
  });
}

function targetSetDiff(obj, eventName, otherActions) {
  var meta = metaFor(obj, false),
      actions = meta.listeners && meta.listeners[eventName],
      diffActions = [];
  iterateSet(actions, function (target, method, once) {
    var actionIndex = indexOf(otherActions, target, method, once);
    if (actionIndex !== -1) { return; }
    otherActions.push([method, target, once]);
    diffActions.push([method, target, once]);
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
function addListener(obj, eventName, target, method, once) {
  Ember.assert("You must pass at least an object and event name to Ember.addListener", !!obj && !!eventName);

  if (!method && 'function' === typeof target) {
    method = target;
    target = null;
  }

  var actions = actionsFor(obj, eventName, true),
      actionIndex = indexOf(actions, target, method, once);

  if (actionIndex !== -1) { return; }

  actions.push([method, target, once]);

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

  function _removeListener(target, method, once) {
    var actions = actionsFor(obj, eventName, true),
        actionIndex = indexOf(actions, target, method, once);

    // action doesn't exist, give up silently
    if (actionIndex === -1) { return; }

    actions.splice(actionIndex, 1);

    if ('function' === typeof obj.didRemoveListener) {
      obj.didRemoveListener(eventName, target, method);
    }
  }

  if (method) {
    _removeListener(target, method);
  } else {
    var meta = metaFor(obj, false),
        actions = meta.listeners && meta.listeners[eventName];

    iterateSet(actions, function(target, method, once) {
      _removeListener(target, method, once);
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

  var actions = actionsFor(obj, eventName, true),
      actionIndex = indexOf(actions, target, method), // not passing once...?
      action;

  if (actionIndex !== -1) {
    action = actions.splice(actionIndex, 1)[0];
  }

  try {
    return callback.call(target);
  } finally {
    if (action) { actions.push(action); }
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

  var removedActions = [],
      eventName, actions, action, i, l;

  for (i=0, l=eventNames.length; i<l; i++) {
    eventName = eventNames[i];
    actions = actionsFor(obj, eventName, true);
    var actionIndex = indexOf(actions, target, method); // FIXME: not passing once?

    if (actionIndex !== -1) {
      removedActions.push(actions.splice(actionIndex, 1)[0]);
    }
  }

  try {
    return callback.call(target);
  } finally {
    for (i=0, l=removedActions.length; i<l; i++) {
      actions.push(removedActions[i]);
    }
  }
}

// TODO: This knowledge should really be a part of the
// meta system.
var SKIP_PROPERTIES = { __ember_source__: true };

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

  if (!targetSet) {
    var meta = metaFor(obj, false);
    targetSet = meta.listeners && meta.listeners[eventName];
  }

  iterateSet(targetSet, function (target, method, once) {
    if (once) { removeListener(obj, eventName, target, method); }
    if (!target) { target = obj; }
    if ('string' === typeof method) { method = target[method]; }
    if (params) {
      method.apply(target, params);
    } else {
      method.apply(target);
    }
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
  var meta = metaFor(obj, false),
      eventActions = meta.listeners && meta.listeners[eventName];
  if (iterateSet(eventActions, function() { return true; })) {
    return true;
  }

  // no listeners!  might as well clean this up so it is faster later.
  // FIXME: verify this
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
  var meta = metaFor(obj, false),
      actions = meta.listeners && meta.listeners[eventName];

  iterateSet(actions, function (target, method) {
    ret.unshift([target, method]); // unshift since iterateSet is in reverse order
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

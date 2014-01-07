require('ember-runtime');
require('ember-htmlbars/core');
require('ember-htmlbars/vendor/handlebars.amd');
require('ember-htmlbars/vendor/htmlbars-0.1.0.amd');
require('ember-htmlbars/vendor/bound-templates.js-0.1.0.amd');
require('ember-htmlbars/view');

var HTMLBars = requireModule('htmlbars'),
    BoundTemplates = requireModule('bound-templates');

var get = Ember.get,
    addObserver = Ember.addObserver,
    removeObserver = Ember.removeObserver;

var queues = Ember.run.queues,
    indexOf = Ember.ArrayPolyfills.indexOf;
queues.splice(indexOf.call(queues, 'actions')+1, 0, 'render', 'afterRender');

Ember.HTMLBars.compile = function(string, options) {
  options = options || {};
  options.helpers = options.helpers || {};

  options.helpers.STREAM_FOR = STREAM_FOR;

  return BoundTemplates.compile(string, options);
};

function EmberObserverStream(obj, path) {
  this.obj = obj;
  this.path = path;

  addObserver(obj, path, this, 'didChange');
  this.lastValue = this.getValue();
}

EmberObserverStream.prototype = {
  obj: null,
  path: null,
  lastValue: null,

  next: null,
  error: null,
  complete: null,

  getValue: function() {
    return get(this.obj, this.path);
  },

  subscribe: function(next, error, complete) {
    this.next = next;
    this.error = error;
    this.complete = complete;

    next(this.lastValue);
  },

  didChange: function() {
    this.next(this.lastValue = this.getValue());
  },

  destroy: function() {
    removeObserver(this.obj, this.path, this, 'didChange');
    this.obj = this.path = this.lastValue = null;
    this.next = this.error = this.complete = null;
  }
};

var ArrayObserverStream = Ember.HTMLBars.ArrayObserverStream = function ArrayObserverStream(obj) {
  if (obj) { this.updateObj(obj); }
};

ArrayObserverStream.prototype = {
  obj: null,

  next: null,
  error: null,
  complete: null,

  updateObj: function(newObj) {
    var oldLength = 0;
    if (this.obj) {
      oldLength = this.obj.length;
      this.obj.removeArrayObserver(this);
    }
    this.obj = newObj;
    if (newObj) { newObj.addArrayObserver(this); }
    this.arrayDidChange(newObj, 0, oldLength, newObj.length);
  },

  subscribe: function(next, error, complete) {
    this.next = next;
    this.error = error;
    this.complete = complete;

    // TODO: publish whole array?
    // next(this.lastValue);
  },

  arrayWillChange: function(content, start, removed, added) {},
  arrayDidChange: function(content, start, removed, added) {
    this.next({obj: content, start: start, removed: removed, added: added});
  },

  destroy: function() {
    this.updateObj(null);
    this.next = this.error = this.complete = null;
  }
};

function STREAM_FOR(context, path) {
  if (context.isView) {
    return context.streamFor(path);
  } else {
    return new EmberObserverStream(context, path);
  }
}
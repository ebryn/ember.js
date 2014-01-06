require('ember-metal');
require('ember-htmlbars/vendor/handlebars.amd');
require('ember-htmlbars/vendor/htmlbars-0.1.0.amd');
require('ember-htmlbars/vendor/bound-templates.js-0.1.0.amd');

Ember.HTMLBars = Ember.HTMLBars || {};

require('ember-htmlbars/view');

var HTMLBars = requireModule('htmlbars'),
    BoundTemplates = requireModule('bound-templates');

var get = Ember.get,
    addObserver = Ember.addObserver,
    removeObserver = Ember.removeObserver;


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

function STREAM_FOR(context, path) {
  if (context.isView) {
    return context.streamFor(path);
  } else {
    return new EmberObserverStream(context, path);
  }
}
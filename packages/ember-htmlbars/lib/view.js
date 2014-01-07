var get = Ember.get,
    set = Ember.set;

var View = Ember.HTMLBars.View = function View(template, parentView, context) {
  this.parentView = parentView;
  this.context = context || parentView && parentView.context || this;
  this.template = template;
  this.streams = {};
  this.childViews = [];
  // we're intentionally avoiding chains, so finishChains isn't necessary
};

View.prototype = {
  isView: true,
  tagName: 'div',
  elementId: null,
  element: null,
  classNames: ['ember-view'],
  template: null,

  parentView: null,
  childViews: null,
  context: null,
  streams: null,

  render: function(parentEl) {
    var el = this.element = document.createElement(this.tagName),
        fragment = this.template(this, {data: {view: this}});

    if (this.elementId) { el.setAttribute('id', this.elementId); }
    if (this.classNames) { el.setAttribute('class', this.classNames.join(' ')); }

    el.appendChild(fragment);
    if (parentEl) { parentEl.appendChild(el); }
    this.childViews.forEach(function(cv) { cv.render(el); });
    return el;
  },

  createChildView: function(template) {
    var childView = new View(template, this);
    this.childViews.push(childView);
    return childView;
  },

  append: function() {
    document.body.appendChild(this.element);
  },

  appendTo: function(el) {
    el.appendChild(this.element);
  },

  streamFor: function(path) {
    var streams = this.streams,
        stream = streams[path];
    if (stream) { return stream; }
    stream = streams[path] = new ViewManagedStream();

    var context = this.context;
    Ember.addObserver(context, path, this, 'streamPropertyDidChange');
    stream.next(get(context, path));
    return stream;
  },

  _previousContext: null, // used to avoid double looping streams
  contextWillChange: function() {
    this._previousContext = this.context;
  },

  contextDidChange: function() {
    var previousContext = this._previousContext,
        context = this.context,
        streams = this.streams;
    for (var path in streams) {
      Ember.removeObserver(previousContext, path, this, 'streamPropertyDidChange');
      Ember.addObserver(context, path, this, 'streamPropertyDidChange');
      streams[path].next(get(context, path));
    }
    this._previousContext = null;

    // Notifying children manually avoids chains, which saves us a lot of upfront work
    var childViews = this.childViews;
    for (var i = 0, l = childViews.length; i < l; i++) {
      childViews[i].parentViewContextDidChange(context);
    }
  },

  streamPropertyDidChange: function(obj, path) {
    var streams = this.streams,
        stream = streams[path];
    stream.next(get(obj, path));
  },

  parentViewContextDidChange: function(parentContext) {
    set(this, 'context', parentContext);
  }
};

Ember.addBeforeObserver(View.prototype, 'context', null, 'contextWillChange');
Ember.addObserver(View.prototype, 'context', null, 'contextDidChange');

// Do we still need to do this if we're avoiding chains?
// View.prototype[Ember.META_KEY].proto = View.prototype;

// Turns out simple properties and observers wins perf wise over a CP for context
// Ember.defineProperty(View.prototype, 'context', Ember.computed(function(/*key, value*/) {
//   // if (arguments.length === 2) { return value; }
//   // TODO: controller
//   var parentView = this.parentView;
//   return get(parentView, 'context') || this;
// }));

function ViewManagedStream() {
  this.subscribers = [];
}

ViewManagedStream.prototype = {
  subscribers: null,
  lastValue: null,

  subscribe: function(next, error, complete) {
    var subscriber = { next: next, error: error, complete: complete };
    this.subscribers.push(subscriber);
    next(this.lastValue);
  },

  next: function next(value) {
    this.lastValue = value;
    this.subscribers.forEach(function(sub) { if (sub.next) sub.next(value); });
  },

  complete: function complete() {
    this.subscribers.forEach(function(sub) { if (sub.complete) sub.complete(); });
  },

  error: function error(reason) {
    this.subscribers.forEach(function(sub) { if (sub.error) sub.error(reason); });
  }
};
var View = Ember.HTMLBars.View = function View(template) {
  this.template = template;
  this.streams = {};
  this.childViews = [];
};

View.prototype = {
  isView: true,
  tagName: 'div',
  elementId: null,
  element: null,
  classNames: ['ember-view'],
  template: null,

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
    var childView = new View(template);
    childView.parentView = this;
    this.childViews.push(childView);
    return childView;
  },

  append: function() {
    document.body.appendChild(this.element);
  },

  streamFor: function(path) {
    var streams = this.streams,
        stream = streams[path];
    if (stream) { return stream; }
    stream = streams[path] = new ViewManagedStream();

    var context = Ember.get(this, 'context');
    Ember.addObserver(context, path, this, 'streamPropertyDidChange');
    stream.next(Ember.get(context, path));
    return stream;
  },

  streamPropertyDidChange: function(obj, path) {
    var streams = this.streams,
        stream = streams[path];
    stream.next(Ember.get(obj, path));
  }
};

Ember.defineProperty(View.prototype, 'context', Ember.computed(function() {
  // TODO: controller
  return this.parentView && this.parentView.context || this;
}));

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
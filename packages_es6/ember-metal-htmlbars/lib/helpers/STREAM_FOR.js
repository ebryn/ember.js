import { EmberObserverLazyValue } from "ember-metal-htmlbars/utils";

function streamFor(view, path) {
  var streams = view.streams;
  if (!streams) { streams = view.streams = {}; }
  var stream = streams[path];
  if (stream) { return stream; }

  // handle {{this}} - comes through as empty string
  var context = path === '' ? view : view.context;
  path = path === '' ? 'context' : path;

  // Ember.addObserver(context, path, this, 'streamPropertyDidChange');
  stream = streams[path] = new EmberObserverLazyValue(context, path);
  return stream;
}

var CONST_REGEX = /^[A-Z][^.]*\./;

export function STREAM_FOR(context, path) {
  if (CONST_REGEX.test(path)) {
    return Ember.get(null, path);
  } else if (context.isView) {
    return streamFor(context, path);
  } else {
    return new EmberObserverLazyValue(context, path);
  }
}
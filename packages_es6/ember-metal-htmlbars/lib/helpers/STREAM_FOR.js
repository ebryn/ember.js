import { EmberObserverLazyValue } from "ember-metal-htmlbars/utils";

function streamFor(view, path) {
  var streams = view.streams;
  if (!streams) { streams = view.streams = {}; }
  var stream = streams[path];
  if (stream) { return stream; }

  // Ideally:
  // Ember.addObserver(view, 'context.' + path, this, 'streamPropertyDidChange');

  if (path === '') { // handle {{this}}
    // TODO: possible optimization: reuse the context observer that already exists.
    //       this would require us to return some other type of stream object.
    stream = streams[path] = new EmberObserverLazyValue(view, 'context');
  } else {
    stream = streams[path] = new EmberObserverLazyValue(view.context, path);
  }
  
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
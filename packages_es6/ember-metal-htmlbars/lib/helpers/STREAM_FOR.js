import { EmberObserverLazyValue } from "ember-metal-htmlbars/utils";
import { get } from "ember-metal/property_get";
import LazyValue from "bound-templates/lazy-value";

var VIEW_KEYWORD_REGEX = /^view\./;

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
    stream = new EmberObserverLazyValue(view, 'context');
  } else if (VIEW_KEYWORD_REGEX.test(path)) {
    stream = new EmberObserverLazyValue(view, path.slice(5));
  } else if (view.context) {
    stream = new EmberObserverLazyValue(view.context, path);
  } else {
    stream = new EmberObserverLazyValue(view, 'context.'+path);
  }
  
  streams[path] = stream;
  return stream;
}

var CONST_REGEX = /^[A-Z][^.]*\./;

export function STREAM_FOR(context, path) {
  if (CONST_REGEX.test(path)) {
    return new LazyValue(function() {
      return get(null, path);
    });
  } else if (context.isView) {
    return streamFor(context, path);
  } else {
    return new EmberObserverLazyValue(context, path);
  }
}
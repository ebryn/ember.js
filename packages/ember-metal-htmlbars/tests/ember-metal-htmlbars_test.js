define("ember-metal-htmlbars/tests/helpers/each_test", 
  ["ember-metal-htmlbars/tests/test_helpers"],
  function(__dependency1__) {
    "use strict";
    var compile = __dependency1__.compile;
    var View = __dependency1__.View;
    var $ = __dependency1__.$;
    var equalHTML = __dependency1__.equalHTML;
    var set = __dependency1__.set;
    var defaultOptions = __dependency1__.defaultOptions;

    module("ember-metal-htmlbars/helpers/each");

    test("it works", function() {
      var context = {rows: ["one", "two", "three"]};
      var view = {
        isView: true,
        classNames: 'ember-view',
        template: compile("<ul>{{#each rows}}<li> {{this}}</li>{{/each}}</ul>"),
        templateOptions: defaultOptions,
        context: context
      };

      var el = Ember.run(View, View.appendTo, view, 'body');
      equalHTML(el, '<div class="ember-view"><ul><li> one</li><li> two</li><li> three</li></ul></div>');

      var start = Date.now();
      console.profile();
      Ember.run(function() {
        for (var i = 0, l = 10000; i < l; i++) {
          context.rows.pushObject("mic check " + i);
        }
      });
      console.profileEnd();
      var elapsed = Date.now() - start;
      console.log(elapsed);
      console.log($('li', view.element).length);

      Ember.run(Ember, Ember.set, context, 'rows', ['just lonely ol me']);

      equalHTML(el, '<div class="ember-view"><ul><li> just lonely ol me</li></ul></div>');
    });
  });
define("ember-metal-htmlbars/tests/helpers/if_unless_test", 
  [],
  function() {
    "use strict";
    /*
    module("Ember.HTMLBars.helpers.if");

    var View = Ember.HTMLBars.View,
        defaultOptions = View.DEFAULT_TEMPLATE_OPTIONS;

    function equalHTML(fragment, html) {
      var div = document.createElement("div");
      div.appendChild(fragment.cloneNode(true));
      equal(div.innerHTML, html);
    }

    test("it works", function() {
      var template = Ember.HTMLBars.compile("{{#if foo}}foo{{else}}bar{{/if}}"),
          view = View.create({
            template: template,
            context: {foo: true}
          });

      Em.run(view, view.render);

      equal(view.element.innerHTML, "foo");

      Ember.run(Ember, Ember.set, view.context, 'foo', false);
      equal(view.element.innerHTML, "bar");
    });
    */
  });
define("ember-metal-htmlbars/tests/helpers/view_test", 
  ["ember-metal-htmlbars/tests/test_helpers"],
  function(__dependency1__) {
    "use strict";
    var compile = __dependency1__.compile;
    var View = __dependency1__.View;
    var $ = __dependency1__.$;
    var equalHTML = __dependency1__.equalHTML;
    var set = __dependency1__.set;
    var defaultOptions = __dependency1__.defaultOptions;

    module("ember-metal-htmlbars/helpers/view");

    test("it works", function() {
      var view = {
        isView: true,
        classNames: 'ember-view',
        template: compile("{{#view class='ember-view'}} {{foo}}{{/view}}"),
        templateOptions: defaultOptions
      };

      var context = {foo: 'foo is here'};
      Ember.set(view, 'context', context);

      var el = Ember.run(View, View.render, view);
      equalHTML(el, '<div class="ember-view"><div class="ember-view"> foo is here</div></div>');

      Ember.set(context, 'foo', 'i pity the foo');
      equalHTML(el, '<div class="ember-view"><div class="ember-view"> i pity the foo</div></div>');

      context = {foo: 'no need to pity me sucka'};
      Ember.set(view, 'context', context);
      equalHTML(el, '<div class="ember-view"><div class="ember-view"> no need to pity me sucka</div></div>');
    });
  });
define("ember-metal-htmlbars/tests/main_test", 
  ["ember-metal-htmlbars/tests/test_helpers"],
  function(__dependency1__) {
    "use strict";
    var compile = __dependency1__.compile;
    var View = __dependency1__.View;
    var $ = __dependency1__.$;
    var equalHTML = __dependency1__.equalHTML;
    var set = __dependency1__.set;
    var defaultOptions = __dependency1__.defaultOptions;

    module("ember-metal-htmlbars");

    test("it works", function() {
      var template = compile("ohai");
      equalHTML(template(), "ohai");
    });

    test("basic binding", function() {
      var template = compile(" {{foo}}"),
          obj = {foo: "foo is here"},
          fragment = template(obj, defaultOptions);

      equalHTML(fragment, " foo is here");

      Ember.set(obj, 'foo', 'foo is still here');
      equalHTML(fragment, " foo is still here");
    });

    test("View", function() {
      var view = {isView: true, classNames: 'ember-view', template: compile("ohai"), templateOptions: defaultOptions},
          el = View.render(view);

      equalHTML(el, '<div class="ember-view">ohai</div>');
    });

    test("View with a binding inside", function() {
      var view = {isView: true, classNames: 'ember-view', template: compile(" {{foo}} {{bar.baz}}"), templateOptions: defaultOptions};

      Ember.set(view, 'context', {foo: 'foo is here', bar: {baz: 'baz!'}});

      var el = View.render(view);
      equalHTML(el, '<div class="ember-view"> foo is here baz!</div>');

      Ember.set(view, 'context.foo', 'i pity the foo');
      equalHTML(el, '<div class="ember-view"> i pity the foo baz!</div>');
    });

    test("View creation performance - 60,000 views", function() {
      var t = compile("{{#view}}{{foo}}{{/view}}{{#view}}{{foo}}{{/view}}{{#view}}{{foo}}{{/view}}{{#view}}{{foo}}{{/view}}{{#view}}{{foo}}{{/view}}");

      var start = Date.now();
      console.profile();
      Ember.run(function() {
        for (var i = 0, l = 10000; i < l; i++) {
          var context = {foo: 'foo is here'};
          var view = {isView: true, template: t, templateOptions: defaultOptions, context: context};
          View.appendTo(view, 'body');
        }
      });
      console.profileEnd();

      var elapsed = Date.now() - start;
      console.log(elapsed);

      ok(elapsed < 2000, "Actual time: " + elapsed + "ms. Target is less than 2000ms.");
    });
  });
define("ember-metal-htmlbars/tests/test_helpers", 
  ["ember-metal-htmlbars","ember-metal-views","exports"],
  function(__dependency1__, __dependency2__, __exports__) {
    "use strict";
    /*globals Node, DocumentFragment */

    var compile = __dependency1__.compile;
    __exports__.compile = compile;

    var View = __dependency2__;
    __exports__.View = View;

    function testsFor(name) {
      module(name, {
        setup: function() {
          $('#qunit-fixture').innerHTML = '';
        },
        teardown: function() {
          View.reset();
        }
      });
    }

    __exports__.testsFor = testsFor;function $(selector) {
      if (selector instanceof Node || selector instanceof DocumentFragment) { return selector; }
      return document.querySelector(selector);
    }

    __exports__.$ = $;function innerHTMLForFragment(frag) {
      var html = '', node;
      for (var i = 0, l = frag.childNodes.length; i < l; i++) {
        node = frag.childNodes[i];
        html += node.outerHTML || node.nodeValue;
      }
      return html;
    }

    function equalHTML(selector, expectedHTML, message) {
      var actualHTML;
      if (selector instanceof DocumentFragment) {
        actualHTML = innerHTMLForFragment(selector);
      } else {
        actualHTML = $(selector).outerHTML;
      }
      actualHTML = actualHTML.replace(/ id="[^"]+"/gmi, '');
      equal(actualHTML, expectedHTML, message || "HTML matches");
    }

    __exports__.equalHTML = equalHTML;function set(obj, key, value) {
      Ember.run(Ember, Ember.set, obj, key, value);
    }

    __exports__.set = set;function triggerEvent(el, name, data) {
      // var event = new Event(name);
      // el.dispatchEvent(event);
      var isKeyboardEvent = /key/.test(name);
      var event = document.createEvent('Event'); // (isKeyboardEvent ? 'KeyboardEvent' : 'Event');
      event.initEvent(name, true, true);
      if (isKeyboardEvent && data) { event.keyCode = event.which = data.keyCode; }
      // TODO: figure this out
      // if (isKeyboardEvent) {
      //   event.initKeyboardEvent(name, true, true, null, data.keyCode, DOM_KEY_LOCATION_STANDARD);
      // } else {
      //   event.initEvent(name, true, true);
      // }
      el.dispatchEvent(event);
    }

    __exports__.triggerEvent = triggerEvent;var defaultOptions = __dependency1__.defaultOptions;
    __exports__.defaultOptions = defaultOptions;
  });

require("ember-metal-htmlbars");
requireModule("ember-metal-htmlbars/tests/helpers/each_test");
requireModule("ember-metal-htmlbars/tests/helpers/if_unless_test");
requireModule("ember-metal-htmlbars/tests/helpers/view_test");
requireModule("ember-metal-htmlbars/tests/main_test");
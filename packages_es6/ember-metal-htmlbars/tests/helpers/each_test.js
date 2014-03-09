import { compile, View, $, equalHTML, set, defaultOptions, appendTo } from "ember-metal-htmlbars/tests/test_helpers";
import run from "ember-metal/run_loop";

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

  var el = appendTo(view, '#qunit-fixture');
  equalHTML(el, '<div class="ember-view"><ul><li> one</li><li> two</li><li> three</li></ul></div>');

  var start = Date.now();
  console.profile();
  run(function() {
    for (var i = 0, l = 10000; i < l; i++) {
      context.rows.pushObject("mic check " + i);
    }
  });
  console.profileEnd();
  var elapsed = Date.now() - start;
  console.log(elapsed);
  console.log($('li', view.element).length);

  run(null, set, context, 'rows', ['just lonely ol me']);

  equalHTML(el, '<div class="ember-view"><ul><li> just lonely ol me</li></ul></div>');
});
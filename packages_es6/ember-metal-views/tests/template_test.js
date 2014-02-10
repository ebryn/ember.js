var View = requireModule('ember-metal-views'),
    $ = function(selector) { return document.querySelector(selector); },
    equalHTML = function(selector, expectedHTML) { equal($(selector).innerHTML, expectedHTML, "HTML matches"); };

module("ember-metal-views - template support", {
  setup: function() {
    $('#qunit-fixture').innerHTML = '';
  }
});

test("a view can have a template", function() {
  var view = {
    isView: true,

    template: function(context) {
      return document.createTextNode(context.prop);
    },

    prop: "WAT"
  };

  View.appendTo(view, '#qunit-fixture');
  equalHTML('#qunit-fixture', "<div>WAT</div>");
});
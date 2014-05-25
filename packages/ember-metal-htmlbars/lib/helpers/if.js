export default function ifHelper(params, options) {
  var val = params[0].value();
  if (val) {
    options.render(options.data.view, options);
  } else if (options.inverse) {
    options.inverse(options.data.view, options);
  }
}
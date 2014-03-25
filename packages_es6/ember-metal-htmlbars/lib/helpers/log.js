import {apply} from "ember-metal/utils";
import Logger from "ember-metal/logger";

function log(params) {
  var values = new Array(params.length);
  for (var i = 0, l = params.length; i < l; i++) {
    values[i] = params[i].value();
  }

  apply(Logger.log, Logger.log, values);
}

export default log;
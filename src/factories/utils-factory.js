/**
 * Utils angularJS Factory
 */
angularAPP.factory('UtilsFactory', function ($log) {
  // Sort arrays by key
  function sortByKey(array, key, reverse) {
    return array.sort(function (a, b) {
      var x = a[key];
      var y = b[key];
      return ((x < y) ? -1 * reverse : ((x > y) ? 1 * reverse : 0));
    });
  }

  // schema = "{\"type\":\"record\",\"name\":\"User\",\"fields\":[{\"name\":\"bla\",\"type\":\"string\"}]}";
  // object =  JSON.parse(schema);
  // http://jsfiddle.net/KJQ9K/1736/
  function recurseSchema(object, basename,
                         separator=".",
                         name_key="name")
  {
    var result = [];

    // Gather the basename for recursive objects
    var basename_recursive = basename;
    if (result.length > 0) {
      basename_recursive = result[result.length - 1][-1];
    }

    for (var key in object) {
      var current_name = "";
      if ("name" in object){
        current_name = object["name"];
      }

      if (typeof object[key] === "string" &&
          key == name_key)
      {
        if (basename) {
          result.push([String(basename) +
                       separator +
                       object[key]]);
        }else {
          result.push([object[key]]);
        }
        //result[result.length - 1] = result[result.length - 1].resplace("..", ".");
      }

      if (typeof object[key] === "object") {
        var basename_t = "";
        if (basename_recursive) {
          basename_t = String(basename_recursive) + separator + String(current_name);
        } else {
          basename_t = String(current_name);
        }

        result.push(
          recurseSchema(object[key], basename_t,
                        separator, name_key)
        );
      }
    }

    return result;
  }


  function prependBaseName(basename, arr, separator="."){
    for (var i = 0; i < arr.length; i++){
      if (basename){
        arr[i] = String(basename) + separator + String(arr[i]);
      }
      $log.info("arr[i] = ", arr[i]);
    }

    if (arr.length > 0) {
      return arr;
    }

    return [];
  }

  // http://stackoverflow.com/questions/1349404/generate-random-string-characters-in-javascript
  function randomID()
  {
    var text = "";
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

    for( var i=0; i < 5; i++ )
      text += possible.charAt(Math.floor(Math.random() * possible.length));

    return text;
  }

  function toType(obj) {
    return ({}).toString.call(obj).match(/\s([a-zA-Z]+)/)[1].toLowerCase();
  }

  function range(start, count) {
    return Array.apply(0, Array(count))
      .map(function (element, index) {
        return index + start;
      });
  }

  /* Public API */
  return {
    recurseSchema: function(object, value) {
      // return prependBaseName(
      //   value, prependBaseName(object["name"], recurseSchema(object.fields, ""))
      // );
      $log.info("generated : ", recurseSchema(object.fields, ""));
      return [object["name"],
              prependBaseName(object["name"], recurseSchema(object.fields, ""))];
              //recurseSchema(object.fields, object["name"])];
    },
    range: function(start, count){
      return range(start, count);
    },
    toType: function(obj){
      return toType(obj);
    },
    sortByKey: function (array, key, reverse) {
      return sortByKey(array, key, reverse);
    },
    sortByVersion: function(array) {
      var sorted = array.sort(function(a, b) {
        return a.version - b.version;
      });
      return sorted;
    },
    randomID: function(){
      return randomID();
    },
    IsJsonString: function (str) {
      try {
        JSON.parse(str);
      } catch (e) {
        return false;
      }
      return true;
    }

  }

});

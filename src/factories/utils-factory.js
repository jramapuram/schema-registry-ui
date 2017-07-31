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
                         separator="\r\n",
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
        result.push([String(basename) +
                     separator +
                     object[key]]);
      }

      if (typeof object[key] === "object") {
        var basename_t = String(basename_recursive) + separator + String(current_name);
        result.push(
          recurseSchema(object[key], basename_t,
                        separator, name_key)
        );
      }
    }

    return result;
  }


  function prependBaseName(basename, arr){
    for (var i = 0; i < arr.length; i++){
      arr[i] = String(basename) + "\r\n" + String(arr[i]);
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
      return prependBaseName(
        value, prependBaseName(object["name"], recurseSchema(object.fields, ""))
      );
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

angularAPP.controller('SubjectsCtrl', function ($rootScope, $scope, $route, $routeParams, $log, $location, $mdDialog, SchemaRegistryFactory, UtilsFactory, toastFactory, Avro4ScalaFactory, env) {

  $log.info("Starting schema-registry controller: view ( " + $routeParams.subject + "/" + $routeParams.version + " )");
  $rootScope.listChanges = false;
  $rootScope.isSubmitDisabled = true;
  $rootScope.algorithm = "";
  $rootScope.baseName = "";
  $rootScope.runningList = new Set();

  $scope.selectedChecked = function(basename, name) {
    $rootScope.baseName = basename;
    // add/remove logic
    if ($rootScope.runningList.has(name)){
      $rootScope.runningList.delete(name);
    }else{
      $rootScope.runningList.add(name);
    }

    // check to see if we should enable/disable our button
    if ($rootScope.runningList.size > 0){
      $rootScope.isSubmitDisabled = false;
    }else{
      $rootScope.isSubmitDisabled = true;
    }

    $log.info("set now contains: ", $rootScope.runningList);
  };

  $scope.submitRunningList = function() {
    if (!String.prototype.format) {
      String.prototype.format = function() {
        var args = arguments;
        return this.replace(/{(\d+)}/g, function(match, number) {
          return typeof args[number] != 'undefined'
            ? args[number]
            : match
          ;
        });
      };
    }

    var url = env.ZEPPELIN() + '/api/notebook';
    $log.info("submitting running set: ", $rootScope.runningList, " to ", url);
    $log.info("submitting with algorithm: ", $rootScope.algorithm);
    var featureNames = Array.from($rootScope.runningList);
    // for (var i = 0; i < featureNames.length; i++) {
    //   featureNames[i] = featureNames[i].replace(',', '\',\'');
    // }

    var textBlock = SchemaRegistryFactory.getAlgorithm($rootScope.algorithm);
    $log.info("received : ", textBlock);
    var featureBlock = featureNames.map(featureName => `'${featureName}'`).join(',');
    String.prototype.replaceAll = function(search, replacement) {
      var target = this;
      return target.replace(new RegExp(search, 'g'), replacement);
    };
    featureBlock = featureBlock.replaceAll(',', `','`);
    textBlock = textBlock.format($rootScope.baseName,
                                 featureBlock);
    $log.info("formatted : ", textBlock);
    SchemaRegistryFactory.putZeppelinNotebook(textBlock);
  };

  $scope.setAlgorithm = function(alg) {
    $rootScope.algorithm = alg;
    $log.info("setting algorithm to ", $rootScope.algorithm);
  };

  toastFactory.hideToast();

  /**
   * At start-up - get the entire subject `History`
   */
  SchemaRegistryFactory.getSubjectHistory($routeParams.subject).then(
    function success(data) {
      $scope.completeSubjectHistory = SchemaRegistryFactory.getSubjectHistoryDiff(data);
      //$log.warn("Diff is:");
      //$log.warn(JSON.stringify($scope.completeSubjectHistory));
    }
  );

  $scope.allowTransitiveCompatibilities = env.allowTransitiveCompatibilities()

  $scope.$watch(function () {
    return $scope.aceString;
  }, function (a) {
    $scope.isAvroUpdatedAndCompatible =false;
  }, true);

  SchemaRegistryFactory.getSubjectConfig($routeParams.subject).then(
    function success(config) {
    $scope.compatibilitySelect = config.compatibilityLevel;
    $scope.existingValue = config.compatibilityLevel;
    },
    function errorCallback(response) {
      $log.error(response);
    });

  SchemaRegistryFactory.getGlobalConfig().then(
    function success(config) {
      $scope.globalConfig = config.compatibilityLevel;
    },
    function failure(response) {
      $log.error("Failure with : " + JSON.stringify(response));
      $scope.connectionFailure = true;
    });


  /**
   * At start-up do something more ...
   */
  if ($routeParams.subject && $routeParams.version) {
    var promise = SchemaRegistryFactory.getSubjectAtVersion($routeParams.subject, $routeParams.version);
    promise.then(function (selectedSubject) {
      $log.info('Success fetching [' + $routeParams.subject + '/' + $routeParams.version + '] with MetaData');
      $rootScope.subjectObject = selectedSubject;

      $scope.arraySchema = typeof $rootScope.subjectObject.Schema[0] != 'undefined'? true : false
      $scope.tableWidth = 100/$scope.subjectObject.Schema.length


      $rootScope.schema = selectedSubject.Schema.fields;

      // flattened schemas need to be appened here so that they can be viewed in the viewer
      $log.info('flattened is null?' +
                String(selectedSubject.flattenedNames == null) +
                " len = "+
                String(selectedSubject.flattenedNames.length));
      if (selectedSubject.flattenedNames != null &&
          selectedSubject.flattenedNames.length > 0)
      {
        $rootScope.schema.flattened = selectedSubject.flattenedNames;
        $rootScope.schema.basename = selectedSubject.subjectName; // selectedSubject.baseName;
        $log.info('basename: ', $rootScope.schema.basename,
                  'rootscope schema type: ' + UtilsFactory.toType($rootScope.schema) +
                  ', flattened is: \n '+ $rootScope.schema.flattened);
      }
      // else {
      //   $rootScope.schema.flattened = [];
      // }

      $scope.aceString = angular.toJson(selectedSubject.Schema, true);
      //$scope.fullyQualifiedName = UtilsFactory.JSON.flatten($scope.aceString);
      $scope.aceStringOriginal = $scope.aceString;
      $scope.aceReady = true;
      SchemaRegistryFactory.getSubjectsVersions($routeParams.subject).then(
        function success(allVersions) {
          var otherVersions = [];
          angular.forEach(allVersions, function (version) {
            if (version != $rootScope.subjectObject.version) {
              otherVersions.push(version);
            }
          });
          $scope.otherVersions = otherVersions;
          $scope.multipleVersionsOn = $scope.otherVersions.length > 0; // TODO remove
        },
        function failure(response) {
          // TODO
        }
      )
    }, function (reason) {
      $log.error('Failed: ' + reason);
    }, function (update) {
      $log.info('Got notification: ' + update);
    });
  }
  $scope.$on('$routeChangeSuccess', function() {
     $scope.cluster = env.getSelectedCluster().NAME;//$routeParams.cluster;
     $scope.maxHeight = window.innerHeight - 215;
     if ($scope.maxHeight < 310) {$scope.maxHeight = 310}
  })

  $scope.updateCompatibility = function (compatibilitySelect) {
    SchemaRegistryFactory.updateSubjectCompatibility($routeParams.subject, compatibilitySelect).then (
      function success() {
         $scope.existingValue = compatibilitySelect;
         $rootScope.listChanges = true; // trigger a cache re-load
         $scope.success = true;
      });
  };

  $scope.aceString = "";
  $scope.aceStringOriginal = "";
  $scope.multipleVersionsOn = false;

  $scope.isAvroUpdatedAndCompatible = false;
  $scope.testAvroCompatibility = function () {
    $log.debug("Testing Avro compatibility");
    if ($scope.aceString == $scope.aceStringOriginal) {
      toastFactory.showSimpleToastToTop("You have not changed the schema");
    } else {
      if (UtilsFactory.IsJsonString($scope.aceString)) {
        $scope.aceBackgroundColor = "rgba(0, 128, 0, 0.04)";
        $log.debug("Edited schema is a valid json and is a augmented");
        SchemaRegistryFactory.testSchemaCompatibility($routeParams.subject, $scope.aceString).then(
          function success(result) {
            if (result) {
              $log.info("Schema is compatible");
              $scope.aceBackgroundColor = "rgba(0, 128, 0, 0.04)";
              toastFactory.showSimpleToast("You can now evolve the schema");
              $scope.isAvroUpdatedAndCompatible = true;
            } else {
              $scope.aceBackgroundColor = "rgba(255, 255, 0, 0.10)";
              toastFactory.showLongToast("This schema is incompatible with the latest version");
            }
          },
          function failure(data) {
            if(data.error_code==500){
                $scope.aceBackgroundColor = "rgba(255, 255, 0, 0.10)";
                toastFactory.showSimpleToastToTop("Not a valid avro");
            }
            else {
              $log.error("Could not test compatibilitydasdas", data);
            }
        });
      } else {
        $scope.aceBackgroundColor = "rgba(255, 255, 0, 0.10)";
        toastFactory.showLongToast("Invalid Avro");
      }
    }
  };

  $scope.addToPushList = function (name) {
    $scope.fullyQualifiedName = SchemaRegistryFactory.getFullyQualifiedName(name);
    $rootScope.runningList.push($scope.fulyQualifiedName);
  };

  $scope.evolveAvroSchema = function () {
    if ($scope.aceString != $scope.aceStringOriginal &&
      UtilsFactory.IsJsonString($scope.aceString)) {
      SchemaRegistryFactory.testSchemaCompatibility($routeParams.subject, $scope.aceString).then(
        function success(result) {
          var latestSchema = SchemaRegistryFactory.getLatestSubjectFromCache($routeParams.subject);
          $log.warn("peiler");
          $log.warn(latestSchema);
          var latestID = latestSchema.id;
          SchemaRegistryFactory.registerNewSchema($routeParams.subject, $scope.aceString).then(
            function success(schemaId) {
              $log.info("Latest schema ID was : " + latestID);
              $log.info("New    schema ID is  : " + schemaId);
              if (latestID == schemaId) {
                toastFactory.showSimpleToastToTop(" Schema is the same as latest ")
              } else {
                toastFactory.showSimpleToastToTop(" Schema evolved to ID: " + schemaId);
                $rootScope.$broadcast('newEvolve');
                $location.path('/cluster/'+ $scope.cluster  +'/schema/' + $routeParams.subject + '/version/latest');
                $route.reload();
              }
            },
            function failure(data) {
            }
          );
        },
        function failure(data) {

        }
      );
    } else {
      $scope.aceBackgroundColor = "rgba(255, 255, 0, 0.10)";
      toastFactory.showLongToast("Invalid Avro");
    }
  };

  $scope.isAvroAceEditable = false;
  $scope.aceBackgroundColor = "white";
  $scope.cancelEditor = function () {
    $scope.selectedIndex = 0;
    $log.info("Canceling editor");
    $scope.maxHeight = $scope.maxHeight + 64;
    $scope.form.json.$error.validJson = false;
    $scope.aceBackgroundColor = "white";
    toastFactory.hideToast();
    $log.info("Setting " + $scope.aceStringOriginal);
    $scope.isAvroAceEditable = false;
    $scope.isAvroUpdatedAndCompatible = false;
    $scope.aceString = $scope.aceStringOriginal;
    $scope.aceSchemaSession.setValue($scope.aceString);

  };

  $scope.toggleEditor = function () {
    $scope.isAvroAceEditable = !$scope.isAvroAceEditable;
    if ($scope.isAvroAceEditable) {
      $scope.maxHeight = $scope.maxHeight - 64;
      toastFactory.showLongToast("You can now edit the schema");
      $scope.aceBackgroundColor = "rgba(0, 128, 0, 0.04)";
    } else {
      $scope.aceBackgroundColor = "white";
      toastFactory.hideToast();
    }
  };

  /************************* md-table ***********************/
  $scope.tableOptions = {
    rowSelection: false,
    multiSelect: false,
    autoSelect: false,
    decapitate: false,
    largeEditDialog: false,
    boundaryLinks: false,
    limitSelect: true,
    pageSelect: true
  };

  $scope.query = {
    order: 'name',
    limit: 100,
    page: 1
  };

  // This one is called each time - the user clicks on an md-table header (applies sorting)
  $scope.logOrder = function (a) {
    // $log.info("Ordering event " + a);
    sortSchema(a);
  };

  function sortSchema(type) {
    var reverse = 1;
    if (type.indexOf('-') == 0) {
      // remove the - symbol
      type = type.substring(1, type.length);
      reverse = -1;
    }
    // $log.info(type + " " + reverse);
    $scope.schema = UtilsFactory.sortByKey($scope.schema, type, reverse);
  }

  function getScalaFiles(xx) {
    var scala = Avro4ScalaFactory.getScalaFiles(xx);
    $log.error("SCALA-> " + scala);
  }

  $scope.otherTabSelected = function () {$scope.hideEdit = true;}

  /************************* md-table ***********************/
  $scope.editor;

  // When the 'Ace' schema/view is loaded
  $scope.viewSchemaAceLoaded = function (_editor) {
    // $log.info("me");
    $scope.editor = _editor;
    $scope.editor.$blockScrolling = Infinity;
    $scope.aceSchemaSession = _editor.getSession(); // we can get data on changes now
    $scope.editor.getSession().setUseWrapMode(true)


    var lines = $scope.aceString.split("\n").length;
    // TODO : getScalaFiles($scope.aceString);
    // Add one extra line for each command > 110 characters
    angular.forEach($scope.aceString.split("\n"), function (line) {
      lines = lines + Math.floor(line.length / 110);
    });
    if (lines <= 1) {
      lines = 10;
    }
    // $log.warn("Lines loaded for curl create connector -> " + lines + "\n" + $scope.curlCommand);
    _editor.setOptions({
      minLines: lines,
      maxLines: lines,
      highlightActiveLine: false
    });
    // var _renderer = _editor.renderer;
    // _renderer.animatedScroll = false;
  };

  // When the 'Ace' schema/view is CHANGED
  $scope.viewSchemaAceChanged = function (_editor) {
    $scope.editor = _editor;
    var aceString = $scope.aceSchemaSession.getDocument().getValue();
    // $log.warn("LOADED ....");
    // Highlight differences
    var Range = ace.require('ace/range').Range;
    // TODO !!!
    // $scope.aceSchemaSession.addMarker(new Range(2, 5, 4, 16), "ace_diff_new_line", "fullLine");
    $scope.aceString = aceString;
  };

  $scope.showTree = function (keyOrValue) {
    return !(angular.isNumber(keyOrValue) || angular.isString(keyOrValue) || (keyOrValue==null));
  };

  $scope.zip = rows=>rows[0].map((_,c)=>rows.map(row=>row[c]));

}); //end of controller

// Useful for browsing through different versions of a schema
angularAPP.directive('clickLink', ['$location', function ($location) {
  return {
    link: function (scope, element, attrs) {
      element.on('click', function () {
        scope.$apply(function () {
          $location.path(attrs.clickLink);
        });
      });
    }
  }

}]);

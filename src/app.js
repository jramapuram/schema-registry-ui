'use strict';

var heightLastTimeSent = 0;
function postDocumentHeight()
{
  var height = $(document).height();

  if (height == heightLastTimeSent)
    return;

  console.log("height : " + height);

  heightLastTimeSent = height;

  var target = parent.postMessage ? parent
    : (parent.document.postMessage ? parent.document : undefined);

  if (typeof target != "undefined" && document.body.scrollHeight)
  {
    var msg = {
      type : "ifram-height",
      data : height

    };
    target.postMessage(msg, "*");
  }
}

if (top != self)
{
  postDocumentHeight();
  $(window).resize(postDocumentHeight);

  $(document).bind('DOMSubtreeModified', postDocumentHeight);
  $(document).bind('DOMNodeInserted', postDocumentHeight);
  $(document).bind('DOMNodeRemoved', postDocumentHeight);
  $(document).bind('DOMNodeRemovedFromDocument', postDocumentHeight);
  $(document).bind('DOMNodeInsertedIntoDocument', postDocumentHeight);
  $(document).bind('DOMAttrModified', postDocumentHeight);
  $(document).bind('DOMCharacterDataModified', postDocumentHeight);
}


var angularAPP = angular.module('angularAPP', [
  'ui.ace',
  'angularSpinner',
  'angularUtils.directives.dirPagination',
  'ngRoute',
  'ngMaterial',
  'ngAnimate',
  'ngAria',
  'md.data.table',
  'diff-match-patch',
  'angular-json-tree',
  'ngSanitize'

]);

angularAPP.controller('MenuCtrl', function ($scope, $log) {
});

angularAPP.config(function ($routeProvider) {
  $routeProvider
    .when('/', {
      templateUrl: 'src/schema-registry/home/home.html',
      controller: 'HomeCtrl'
    })
    .when('/cluster/:cluster', {
      templateUrl: 'src/schema-registry/home/home.html',
      controller: 'HomeCtrl'
    })
    .when('/cluster/:cluster/schema/new', {
      templateUrl: 'src/schema-registry/new/new.html',
      controller: 'NewSubjectCtrl as ctrl'
    })
    .when('/cluster/:cluster/export', {
      templateUrl: 'src/schema-registry/export/export.html',
      controller: 'ExportSchemasCtrl'
    })
    .when('/cluster/:cluster/schema/:subject/version/:version', {
      templateUrl: 'src/schema-registry/view/view.html',
      controller: 'SubjectsCtrl'
    }).otherwise({
    redirectTo: '/'
  });
  // $locationProvider.html5Mode(true);
});

angularAPP.controller('HeaderCtrl', function ($rootScope, $scope, $location, $log, SchemaRegistryFactory, env) {


  $scope.$on('$routeChangeSuccess', function() {
     $rootScope.clusters = env.getClusters();
     $scope.cluster = env.getSelectedCluster();
     $scope.color = $scope.cluster.COLOR;
  });

  $scope.updateEndPoint = function(cluster) {
    $rootScope.connectionFailure = false;
    $location.path("/cluster/"+cluster)
  }
});

angularAPP.run(
    function loadRoute( env, $routeParams, $rootScope ) {
        $rootScope.$on('$routeChangeSuccess', function() {
          env.setSelectedCluster($routeParams.cluster);
       });
    }
)

/* Custom directives */

angularAPP.directive('validJson', function() {
  return {
    require: 'ngModel',
    priority: 1000,
    link: function(scope, elem, attrs, ngModel) {

      // view to model
      ngModel.$parsers.unshift(function(value) {
        var valid = true,
          obj;
        try {
          obj = JSON.parse(value);
        } catch (ex) {
          valid = false;
        }
        ngModel.$setValidity('validJson', valid);
        return valid ? obj : undefined;
      });

      // model to view
      ngModel.$formatters.push(function(value) {
        return value;//JSON.stringify(value, null, '\t');
      });
    }
  };
});
angularAPP.config(['$compileProvider',
    function ($compileProvider) {
        $compileProvider.aHrefSanitizationWhitelist(/^\s*(https?|ftp|mailto|tel|file|blob):/);
}]);

angularAPP.config(function ($mdThemingProvider) {
  $mdThemingProvider.theme('default')
    .primaryPalette('blue-grey')
    .accentPalette('blue')
    .warnPalette('grey');
});

angularAPP.filter('reverse', function() {
  return function(items) {
    return items.slice().reverse();
  };
});

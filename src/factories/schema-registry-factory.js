/**
 * Schema-Registry angularJS Factory
 * version 0.7 (16.Aug.2016)
 *
 * @author antonios@landoop.com
 */
angularAPP.factory('SchemaRegistryFactory', function ($rootScope, $http, $location, $q, $log, UtilsFactory, env) {

  /**
   * Get subjects
   * @see http://docs.confluent.io/3.0.0/schema-registry/docs/api.html#get--subjects
   */
  function getSubjects() {

    var url = env.SCHEMA_REGISTRY() + '/subjects/';
    $log.debug("  curl -X GET " + url);
    var start = new Date().getTime();

    var deferred = $q.defer();
    $http.get(url)
      .then(
        function successCallback(response) {
          var allSubjectNames = response.data;
          $log.debug("  curl -X GET " + url + " => " + allSubjectNames.length + " registered subjects in [ " + ((new Date().getTime()) - start) + " ] msec");
          deferred.resolve(allSubjectNames);
        },
        function errorCallback(response) {
          deferred.reject("Failure with : " + response)
        });

    return deferred.promise;
  }

  /**
   * Get subjects versions
   * @see http://docs.confluent.io/3.0.0/schema-registry/docs/api.html#get--subjects-(string- subject)-versions
   */
  function getSubjectsVersions(subjectName) {

    var url = env.SCHEMA_REGISTRY() + '/subjects/' + subjectName + '/versions/';
    $log.debug("  curl -X GET " + url);
    var start = new Date().getTime();

    var deferred = $q.defer();
    $http.get(url).then(
      function successCallback(response) {
        var allVersions = response.data;
        $log.debug("  curl -X GET " + url + " => " + JSON.stringify(allVersions) + " versions in [ " + (new Date().getTime() - start) + " ] msec");
        deferred.resolve(allVersions);
      },
      function errorCallback(response) {
        var msg = "Failure with : " + response + " " + JSON.stringify(response);
        $log.error("Error in getting subject versions : " + msg);
        deferred.reject(msg);
      });

    return deferred.promise;

  }

  /**
   * Get a specific version of the schema registered under this subject
   * @see http://docs.confluent.io/3.0.0/schema-registry/docs/api.html#get--subjects-(string- subject)-versions-(versionId- version)
   */
  function getSubjectAtVersion(subjectName, version) {

    var url = env.SCHEMA_REGISTRY() + '/subjects/' + subjectName + '/versions/' + version;
    $log.debug("  curl -X GET " + url);

    var deferred = $q.defer();
    var start = new Date().getTime();
    $http.get(url).then(
      function successCallback(response) {
        var subjectInformation = response.data;
        $log.debug("  curl -X GET " + url + " => [" + subjectName + "] subject " + JSON.stringify(subjectInformation).length + " bytes in [ " + (new Date().getTime() - start) + " ] msec");
        deferred.resolve(subjectInformation);
      },
      function errorCallback(response) {
        var msg = "Failure getting subject at version : " + response + " " + JSON.stringify(response);
        $log.error(msg);
        deferred.reject(msg);
      });

    return deferred.promise;

  }
    function getAllSchemas(cache) {
      var i;
      var allSchemasCache = []
      angular.forEach(cache, function (schema) {
        for (i = 1; i <= schema.version; i++) {
          getSubjectAtVersion(schema.subjectName, i).then(function (selectedSubject) {
          allSchemasCache.push(selectedSubject)
          //$rootScope.downloadFile += '\n echo >>>' + selectedSubject.subject +'.'+ selectedSubject.version + '.json <<< \n' + schema.schema + ' \n \n EOF';
          })
        }
      });
      $rootScope.allSchemasCache = allSchemasCache;
    return allSchemasCache
  }
  /**
   * Register a new schema under the specified subject. If successfully registered, this returns the unique identifier of this schema in the registry.
   * @see http://docs.confluent.io/3.0.0/schema-registry/docs/api.html#post--subjects-(string- subject)-versions
   */
  function postNewSubjectVersion(subjectName, newSchema) {

    var deferred = $q.defer();
    $log.debug("Posting new version of subject [" + subjectName + "]");

    var postSchemaRegistration = {
      method: 'POST',
      url: env.SCHEMA_REGISTRY() + '/subjects/' + subjectName + "/versions",
      data: '{"schema":"' + newSchema.replace(/\n/g, " ").replace(/\s\s+/g, ' ').replace(/"/g, "\\\"") + '"}' + "'",
      dataType: 'json',
      headers: {'Content-Type': 'application/json', 'Accept': 'application/json'}
    };

    $http(postSchemaRegistration)
      .success(function (data) {
        //$log.info("Success in registering new schema " + JSON.stringify(data));
        var schemaId = data.id;
        deferred.resolve(schemaId);
      })
      .error(function (data, status) {
        $log.info("Error on schema registration : " + JSON.stringify(data));
        var errorMessage = data.message;
        if (status >= 400) {
          $log.debug("Schema registrations is not allowed " + status + " " + data);
        } else {
          $log.debug("Schema registration failure: " + JSON.stringify(data));
        }
        deferred.reject(data);
      });

    return deferred.promise;

  }

  /**
   * Check if a schema has already been registered under the specified subject. If so, this returns the schema string
   * along with its globally unique identifier, its version under this subject and the subject name.
   *
   * @see http://docs.confluent.io/3.0.0/schema-registry/docs/api.html#post--subjects-(string- subject)
   */
  function checkSchemaExists(subjectName, subjectInformation) {

    var deferred = $q.defer();
    $log.debug("Checking if schema exists under this subject [" + subjectName + "]");

    var postSchemaExists = {
      method: 'POST',
      url: env.SCHEMA_REGISTRY() + '/subjects/' + subjectName,
      data: '{"schema":"' + subjectInformation.replace(/\n/g, " ").replace(/\s\s+/g, ' ').replace(/"/g, "\\\"") + '"}' + "'",
      dataType: 'json',
      headers: {'Content-Type': 'application/json', 'Accept': 'application/json'}
    };

    $http(postSchemaExists)
      .success(function (data) {
        var response = {
          id: data.id,
          version: data.version
        };
        $log.info("Response : " + JSON.stringify(response));
        deferred.resolve(response);
      })
      .error(function (data, status) {
        $log.info("Error while checking if schema exists under a subject : " + JSON.stringify(data));
        var errorMessage = data.message;
        if (status == 407) {
          $log.debug("Subject not found or schema not found - 407 - " + status + " " + data);
        } else {
          $log.debug("Some other failure: " + JSON.stringify(data));
        }
        $defered.reject("Something")
      });

    return deferred.promise;

  }

  /**
   * Test input schema against a particular version of a subject’s schema for compatibility.
   * @see http://docs.confluent.io/3.0.0/schema-registry/docs/api.html#post--compatibility-subjects-(string- subject)-versions-(versionId- version)
   */
  function testSchemaCompatibility(subjectName, subjectInformation) {

    var deferred = $q.defer();
    $log.debug("  Testing schema compatibility for [" + subjectName + "]");

    var postCompatibility = {
      method: 'POST',
      url: env.SCHEMA_REGISTRY() + '/compatibility/subjects/' + subjectName + "/versions/latest",
      data: '{"schema":"' + subjectInformation.replace(/\n/g, " ").replace(/\s\s+/g, ' ').replace(/"/g, "\\\"") + '"}' + "'",
      dataType: 'json',
      headers: {'Content-Type': 'application/json', 'Accept': 'application/json'}
    };

    $http(postCompatibility)
      .success(function (data) {
        $log.info("Success in testing schema compatibility " + JSON.stringify(data));
        deferred.resolve(data.is_compatible)
      })
      .error(function (data, status) {
        $log.warn("Error on check compatibility : " + JSON.stringify(data));
        if (status == 404) {
          if (data.error_code == 40401) {
            $log.warn("40401 = Subject not found");
          }
          $log.warn("[" + subjectName + "] is a non existing subject");
          deferred.resolve("new"); // This will be a new subject (!)
        } else {
          $log.error("HTTP > 200 && < 400 (!) " + JSON.stringify(data));
        }
        deferred.reject(data);
      });

    return deferred.promise;

  }

  /**
   *  Helper to get the string value for an algorithm
   */
  function getAlgorithm(alg) {
    $log.info("got \"", alg, "\" in getalg");
    switch (alg) {
    case 'batch_kmeans':
      return `
val sqlc = new org.apache.spark.sql.SQLContext(sc)

val myBatchJobConfig = BatchJobConfig(
    // Hdfs path [hardcoded for now]
    hdfsPath = "hdfs://hnn1-americano.di.uoa.gr:9000/topics/",
    // DataFrame shaping
    topic = "{0}",
    selectedFields = Array({1}),
    filter = Array(
        // eg: you can filter as follows:
        // ("header.sourceSystem", "hmod.wizzit.venac.2", "=="),
        // ("y", 0.01, ">")
    ),

    // The content needs to be specified manually, eg:
    // content = Array("header.time", "header.sourceSystem", "x", "y", "z")
    content = Array("")
)

val myBatchJob = new BatchJob()

// Create the DataFrame coontaining the desired data
val df = myBatchJob.createDataFrame(sqlc, myBatchJobConfig)

val myBatchKmeansConfig = BatchKmeansConfig(
    k = 5, // change to cluster desired
    // The features need to be filtered manually
    // eg: features = Array("x", "y", "z")
    features = Array()
)

val myBatchKmeans = new BatchKmeans()
val results = myBatchKmeans.fit(df, myBatchKmeansConfig)
val (pipelineModel, assembler, kmeansModel, trainingError) = results
val centroids = kmeansModel.clusterCenters
centroids.zipWithIndex.foreach(c => println(s"Centroid #\$\{c._2\} coordinates: \$\{c._1\}"))
// Need to specify output transform as well, eg:
// val clusteredDf = pipelineModel.transform(df).select("x", "y", "z", "prediction")
val clusteredDf = pipelineModel.transform(df).select()
clusteredDf.show(10)`;
      // return `
      //         val sqlc = new org.apache.spark.sql.SQLContext(sc)
      //         val U = new SparkUtils()
      //         val df = U.createDataFrame(sqlc, "hdfs://hnn1-americano.di.uoa.gr:9000/topics/{0}")
      //         val features = Array({1})
      //         val config = KmeansConfig(k=15) //change this to desired K
      //         val kmeansTask = new KmeansTask()
      //         val results = kmeansTask.fit(config, df, features)
      //         val (pipelineModel, assembler, kmeansModel, trainingError) = results
      // `;

    case 'batch_dt':
      throw 'Batch Decision Tree not implemented';

    case 'streaming_kmeans':
     return `
val myStreamingJobConfig = StreamingJobConfig(
    // Network
    schemaRegistryHost = "eagle5.di.uoa.gr",
    kafkaBrokerHost = "eagle5.di.uoa.gr",
    carbonHost = "eagle5.di.uoa.gr",
    // Spark Streaming
    cpDir = "hdfs://hnn1-americano.di.uoa.gr:9000/spark/test125",
    // Stream shaping
    topic = "{0}",
    selectedFields = Array({1}),
    filter = Array(
        // Filter, an example is shown below:
        // ("unit", "KELVIN", "=="),
        // ("value", 1000.0, "<="),
        // ("value", -1000.0, ">="),
        // Array(("header.sourceModule","module00", "=="), ("header.sourceModule", "module01", "=="), ("header.sourceModule","feature00", "==")),
        // Array(("header.sourceSystem", "robot00", "=="), ("header.sourceSystem","sick_py_generator", "=="))
    ),
    // Specify the content, example below:
    // content = Array("header.time", "value")
    content = Array()
)

val myStreamingJob = new StreamingJob()

val myStreamingKmeansConfig = StreamingKmeansConfig(
    k = 10, // specify these hyperparameters
    decayFactor = 0.9,
    // Need to specify the features, eg:
    // features = Array("value")
    features = Array()
)

val myStreamingKmeans = new StreamingKmeans()

import org.apache.spark.streaming.{Seconds, StreamingContext}

val batchInterval = Seconds(myStreamingJobConfig.batchInterval)
val ssc = new StreamingContext(sc, batchInterval)
ssc.checkpoint(myStreamingJobConfig.cpDir)

val myStream = myStreamingJob.subscribeToKafkaStream(ssc, myStreamingJobConfig)

// Need to specify output destination, example below:
// myStreamingJob.sendGrafana(myStream, myStreamingJobConfig, "header.time", "value", "raw.fake_robot_0")
myStreamingJob.sendGrafana(myStream, myStreamingJobConfig, "")

val trainedStreamingKmeans = myStreamingKmeans.train(myStream, myStreamingKmeansConfig)

val latestModel = trainedStreamingKmeans.latestModel()

ssc.start()`;

    default:
      return `
val sqlc = new org.apache.spark.sql.SQLContext(sc)
val U = new SparkUtils()
val df = U.createDataFrame(sqlc, "hdfs://hnn1-americano.di.uoa.gr:9000/topics/{0}")
val features = Array({1})`;
    }
  }

  /**
   * POST to Zeppelin
   * @see https://zeppelin.apache.org/docs/0.8.0-SNAPSHOT/rest-api/rest-notebook.html#create-a-new-note
   */
  function putZeppelinNotebook(textBlock) {
    var deferred = $q.defer();
    var subjectName = UtilsFactory.randomID(); // TODO: provide a name for the notebook
    var paragraphBlock = [{"title": "Feature Selection", "text": textBlock}];

    var postData = {};
    postData.name = subjectName;
    postData.paragraphs = paragraphBlock;

    var postZeppelin = {
      method: 'POST',
      url: env.ZEPPELIN() + '/api/notebook',
      data: postData,
      dataType: 'json',
      headers: {'Content-Type': 'application/json', 'Accept': 'application/json'}
    };

    $http(postZeppelin)
      .success(function (data) {
        $log.info("Success in posting " + JSON.stringify(postData)
                  + " | Return data: " + JSON.stringify(data));

        var newLocation = env.ZEPPELIN() + "#/notebook/" + JSON.stringify(data.body).replace(/['"]+/g, '');
        $log.info("redirecting to " +  newLocation);
        window.location = newLocation;
      })
      .error(function (data, status) {
        $log.info("Error on posting the following to zeppelin : " + JSON.stringify(postData)
                  + " | Error code: " + JSON.stringify(status)
                  + " | Error message: ", JSON.stringify(data));
        deferred.reject(data);
      });

    return deferred.promise;
  }



  /**
   * Put global config (Test input schema against a particular version of a subject’s schema for compatibility.
   * @see http://docs.confluent.io/3.0.0/schema-registry/docs/api.html#put--config
   */
  function putConfig(compatibilityLevel) {

    var deferred = $q.defer();

    if (["NONE", "FULL", "FORWARD", "BACKWARD", "FULL_TRANSITIVE", "FORWARD_TRANSITIVE", "BACKWARD_TRANSITIVE"].indexOf(compatibilityLevel) != -1) {

      var putConfig = {
        method: 'PUT',
        url: env.SCHEMA_REGISTRY() + '/config',
        data: '{"compatibility":"' + compatibilityLevel + '"}' + "'",
        dataType: 'json',
        headers: {'Content-Type': 'application/json', 'Accept': 'application/json'}
      };

      $http(putConfig)
        .success(function (data) {
          $log.info("Success in changing global schema-registry compatibility " + JSON.stringify(data));
          deferred.resolve(data.compatibility)
        })
        .error(function (data, status) {
          $log.info("Error on changing global compatibility : " + JSON.stringify(data));
          if (status == 422) {
            $log.warn("Invalid compatibility level " + JSON.stringify(status) + " " + JSON.stringify(data));
            if (JSON.stringify(data).indexOf('50001') > -1) {
              $log.error(" Error in the backend data store - " + $scope.text);
            } else if (JSON.stringify(data).indexOf('50003') > -1) {
              $log.error("Error while forwarding the request to the master: " + JSON.stringify(data));
            }
          } else {
            $log.debug("HTTP > 200 && < 400 (!) " + JSON.stringify(data));
          }
          deferred.reject(data);
        });

    } else {
      $log.warn("Compatibility level:" + compatibilityLevel + " is not supported");
      deferred.reject();
    }

    return deferred.promise;

  }

  /**
   * Get global compatibility-level config
   * @see http://docs.confluent.io/3.0.0/schema-registry/docs/api.html#get--config
   */
  function getGlobalConfig() {

    var deferred = $q.defer();
    var url = env.SCHEMA_REGISTRY() + '/config';
    $log.debug("  curl -X GET " + url);
    var start = new Date().getTime();
    $http.get(url)
      .success(function (data) {
        $log.debug("  curl -X GET " + url + " => in [ " + ((new Date().getTime()) - start) + "] msec");
        deferred.resolve(data)
      })
      .error(function (data, status) {
        deferred.reject("Get global config rejection : " + data + " " + status)
      });

    return deferred.promise;

  }

  function getSubjectConfig(subjectName) {
    var deferred = $q.defer();
    var url = env.SCHEMA_REGISTRY() + '/config/' + subjectName;
    $log.debug("  curl -X GET " + url);
    var start = new Date().getTime();
    $http.get(url)
      .success(function (data) {
        $log.debug("  curl -X GET " + url + " => in [ " + ((new Date().getTime()) - start) + "] msec");
        deferred.resolve(data)
      })
      .error(function (data, status) {
      if (status == 404) {
      $log.warn('No compatibility level is set for '+ subjectName +'. Global compatibility level is applied');
      } else
        deferred.reject("Get global config rejection : " + data + " " + status)
      });
    return deferred.promise;

  }

  /**
   * Update compatibility level for the specified subject
   * @see http://docs.confluent.io/3.0.0/schema-registry/docs/api.html#put--config-(string- subject)
   */
  function updateSubjectCompatibility(subjectName, newCompatibilityLevel) {

    var deferred = $q.defer();

    if (["NONE", "FULL", "FORWARD", "BACKWARD", "FULL_TRANSITIVE", "FORWARD_TRANSITIVE", "BACKWARD_TRANSITIVE"].indexOf(newCompatibilityLevel) != -1) {

      var putConfig = {
        method: 'PUT',
        url: env.SCHEMA_REGISTRY() + '/config/' + subjectName,
        data: '{"compatibility":"' + newCompatibilityLevel + '"}' + "'",
        dataType: 'json',
        headers: {'Content-Type': 'application/json', 'Accept': 'application/json'}
      };

      $http(putConfig)
        .success(function (data) {
          $log.info("Success in changing subject [ " + subjectName + " ] compatibility " + JSON.stringify(data));
          deferred.resolve(data.compatibility)
        })
        .error(function (data, status) {
          $log.info("Error on changing compatibility : " + JSON.stringify(data));
          if (status == 422) {
            $log.warn("Invalid compatibility level " + JSON.stringify(status) + " " + JSON.stringify(data));
            if (JSON.stringify(data).indexOf('50001') > -1) {
              $log.error(" Error in the backend data store - " + $scope.text);
            } else if (JSON.stringify(data).indexOf('50003') > -1) {
              $log.error("Error while forwarding the request to the master: " + JSON.stringify(data));
            }
          } else {
            $log.debug("HTTP > 200 && < 400 (!) " + JSON.stringify(data));
          }
          deferred.reject(data);
        });

    } else {
      $log.warn("Compatibility level:" + newCompatibilityLevel + " is not supported");
      deferred.reject();
    }

    return deferred.promise;

  }


  /**
   * Custom logic of Factory is implemented here.
   *
   * In a nut-shell `CACHE` is holding a cache of known subjects
   * Methods here are utilizing the cache - picking from it or updating
   *
   * Subjects are immutable in the schema-registry, thus downloading them
   * just once is enough !
   */

  var CACHE = []; // A cache of the latest subject

  /**
   * Gets from CACHE if exists - undefined otherwise
   */
  function getFromCache(subjectName, subjectVersion) {
    var start = new Date().getTime();
    var response = undefined;
    angular.forEach(CACHE, function (subject) {
      if (subject.subjectName == subjectName && subject.version == subjectVersion) {
        $log.debug("  [ " + subjectName + "/" + subjectVersion + " ] found in cache " + JSON.stringify(subject).length + " bytes in [ " + ((new Date().getTime()) - start) + " ] msec");
        response = subject;
      }
    });
    return response;
  }

  /**
   * GETs latest from CACHE or 'undefined'
   */
  function getLatestFromCache(subjectName) {
    var subjectFromCache = undefined;
    for (var i = 1; i < 10000; i++) {
      var x = getFromCache(subjectName, i);
      if (x != undefined)
        subjectFromCache = x;
    }
    return subjectFromCache;
  }


  /**
   *
   * Composite & Public Methods of this factory
   *
   */
  return {

    // Proxy in function
    getGlobalConfig: function () {
      return getGlobalConfig();
    },

    getSubjectConfig: function (subjectName) {
      return getSubjectConfig(subjectName);
    },

    getAlgorithm: function (alg) {
      return getAlgorithm(alg);
    },

    putZeppelinNotebook: function(textBlock) {
      return putZeppelinNotebook(textBlock);
    },

    putConfig: function (config) {
      return putConfig(config);
    },
    updateSubjectCompatibility: function (subjectName, newCompatibilityLevel) {
      return updateSubjectCompatibility(subjectName, newCompatibilityLevel);
    },

    // Proxy in function
    testSchemaCompatibility: function (subjectName, subjectInformation) {
      return testSchemaCompatibility(subjectName, subjectInformation);
    },

    // Proxy in function
    registerNewSchema: function (subjectName, subjectInformation) {
      return postNewSubjectVersion(subjectName, subjectInformation);
    },

    // Proxy in function
    getSubjectsVersions: function (subjectName) {
      return getSubjectsVersions(subjectName);
    },

    // Proxy in function
    getLatestSubjectFromCache: function (subjectName) {
      return getLatestFromCache(subjectName);
    },
    // Proxy in function
    getAllSchemas: function (schemas) {
      return getAllSchemas(schemas);
    },

    /**
     * GETs all subject-names and then GETs the /versions/latest of each one
     *
     * Refreshes the CACHE object with latest subjects
     */
    refreshLatestSubjectsCACHE: function () {

      var deferred = $q.defer();
      var start = new Date().getTime();

      // 1. Get all subject names
      getSubjects().then(
        function success(allSubjectNames) {
          // 2. Get full details of subject's final versions
          var urlFetchLatestCalls = [];
          angular.forEach(allSubjectNames, function (subject) {
            urlFetchLatestCalls.push($http.get(env.SCHEMA_REGISTRY() + '/subjects/' + subject + '/versions/latest'));
          });
          $q.all(urlFetchLatestCalls).then(function (latestSchemas) {
            CACHE = []; // Clean up existing cache - to replace with new one
            angular.forEach(latestSchemas, function (result) {
              var data = result.data;
              var schemaData = JSON.parse(data.schema);

              // var currentType = UtilsFactory.toType(schemaData);
              // if (currentType == "string"){
              //   $log.debug("current schema type is string, skipping..");
              //   // schemaData.flattened = "";
              // }else{
              //   schemaData.flattened = UtilsFactory.recurseSchema(schemaData, "name");
              //   $log.debug("isobject: " + schemaData.flattened + " of length "
              //              + schemaData.length + "object type: "
              //              + UtilsFactory.toType(schemaData.flattened));
              // }

              var tpl = UtilsFactory.recurseSchema(schemaData, data.subject);
              var baseName = tpl[0];
              var flattenedNames = tpl[1];

              var cacheData = {
                version: data.version,  // version
                id: data.id,            // id
                schema: data.schema,    // schema - in String - schema i.e. {\"type\":\"record\",\"name\":\"User\",\"fields\":[{\"name\":\"name\",\"type\":\"string\"}]}
                Schema: schemaData,     // js type | name | doc | fields ...
                flattenedNames: flattenedNames,
                baseName: baseName,
                subjectName: data.subject
              };
              CACHE.push(cacheData);
            });
            $log.debug("  pipeline : get-latest-subjects-refresh-cache in [ " + (new Date().getTime() - start) + " ] msec");
            $rootScope.showSpinner = false;
            $rootScope.Cache = CACHE;
            deferred.resolve(CACHE);
          });
        });

      return deferred.promise;

    },
    /**
     * Get one subject at a particular version
     */
    getSubjectAtVersion: function (subjectName, subjectVersion) {

      var deferred = $q.defer();

      // If it's easier to fetch it from cache
      var subjectFromCache = getFromCache(subjectName, subjectVersion);
      if (subjectFromCache != undefined) {
        deferred.resolve(subjectFromCache);
      } else {
        var start = new Date().getTime();
        getSubjectAtVersion(subjectName, subjectVersion).then(
          function success(subjectInformation) {

            var fullSchema = JSON.parse(subjectInformation.schema); // this is json

            // var currentType = UtilsFactory.toType(fullSchema);
            // if (currentType == "string"){
            //   $log.debug("1. current schema type is string, skipping..");
            //   // schemaData.flattened = "";
            // }else{
            //   fullSchema.flattened = UtilsFactory.recurseSchema(fullSchema, "name");
            //   $log.debug("1. isobject");
            //   // $log.debug("1. isobject: " + fullSchema.flattened + " of length " + fullSchema.length);
            //   // $log.debug("1. object type: "+ UtilsFactory.toType(fullSchema.flattened));
            // }

            //cache it
            var tpl = UtilsFactory.recurseSchema(JSON.parse(subjectInformation.schema), "name");
            var baseName = tpl[0];
            var flattenedNames = tpl[1];

            var subjectInformationWithMetadata = {
              version: subjectInformation.version,
              id: subjectInformation.id,
              schema: subjectInformation.schema, // this is text
              Schema:  fullSchema, //JSON.parse(subjectInformation.schema), // this is json
              flattenedNames: flattenedNames,
              baseName: baseName,
              subjectName: subjectInformation.subject
            };
            $log.debug("  pipeline: " + subjectName + "/" + subjectVersion + " in [ " + (new Date().getTime() - start) + " ] msec");
            deferred.resolve(subjectInformationWithMetadata);
          },
          function errorCallback(response) {
            $log.error("Failure with : " + JSON.stringify(response));
          });
      }
      return deferred.promise;

    },

    /**
     * GETs the entire subject's history, by
     *
     * i. Getting all version
     * ii. Fetching each version either from cache or from HTTP GET
     */
    getSubjectHistory: function (subjectName) {

      var deferred = $q.defer();

      $log.info("Getting subject [ " + subjectName + "] history");
      var completeSubjectHistory = [];
      getSubjectsVersions(subjectName).then(
        function success(allVersions) {
          var urlCalls = [];
          angular.forEach(allVersions, function (version) {
            // If in cache
            var subjectFromCache = getFromCache(subjectName, version);
            if (subjectFromCache != undefined) {
              completeSubjectHistory.push(subjectFromCache);
            } else {
              urlCalls.push($http.get(env.SCHEMA_REGISTRY() + '/subjects/' + subjectName + '/versions/' + version));
            }
          });
          // Get all missing versions and add them to cache
          $q.all(urlCalls).then(function (results) {
            angular.forEach(results, function (result) {
              completeSubjectHistory.push(result.data);
            });
            deferred.resolve(completeSubjectHistory);
          });
        },
        function failure(data) {
          deferred.reject("pdata=>" + data);
        });

      return deferred.promise;

    },

    /**
     * Get the history in a diff format convenient for rendering a ui
     */
    getSubjectHistoryDiff: function (subjectHistory) {
      var changelog = [];

      $log.info("Sorting by version..");
      var sortedHistory = UtilsFactory.sortByVersion(subjectHistory);
      for (var i = 0; i < sortedHistory.length; i++) {
        var previous = '';
        if (i > 0)
          previous = JSON.parse(sortedHistory[i - 1].schema);
        var changeDetected = {
          version: sortedHistory[i].version,
          id: sortedHistory[i].id,
          current: JSON.parse(sortedHistory[i].schema),
          previous: previous
        };
        changelog.push(changeDetected);
      }

      return changelog;
    }
  }

});

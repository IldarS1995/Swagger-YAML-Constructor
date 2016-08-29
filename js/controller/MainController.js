(function () {
    app.controller('mainController', function ($scope) {

        $scope.file = {obj: undefined};
        $scope.swaggerObject = null;

        $scope.tabs = [
            {name: "General information", page: "tab_pages/main_info_tab.html"},
            {name: "Paths", page: "tab_pages/paths_tab.html"},
            {name: "Definitions", page: "tab_pages/definition_tab.html"}
        ];
        $scope.currentTab = $scope.tabs[0];

        $scope.definitionTypes = ["object", "array"];

        $scope.defPropertyTypes = ["$ref", "integer", "string", "boolean", "array"];

        $scope.innerPropertyTypes = ["$ref", "integer", "string", "boolean"];


        $scope.setCurrentTab = function (tab) {
            $scope.currentTab = tab;
        };

        $scope.loadFile = function () {
            var reader = new FileReader();
            reader.readAsText($scope.file.obj, "UTF-8");
            reader.onload = function (e) {
                var doc;
                try {
                    doc = jsyaml.safeLoad(e.target.result);
                }
                catch (e) {
                    console.log(e);
                    return;
                }

                $scope.$apply(function () {
                    $scope.swaggerObject = doc;
                    $scope.postProcessLoad();
                });
            };
            reader.onerror = function (e) {
                console.log(e);
            };
        };

        $scope.postProcessLoad = function () {
            var obj = $scope.swaggerObject;

            $scope.processDefinitions(obj);
            $scope.processPaths(obj);
        };

        $scope.processDefinitions = function (obj) {
            for (def in obj.definitions) {
                var defObj = obj.definitions[def];
                defObj.name = def;

                if (defObj.type == 'array' && defObj.items.$ref) {
                    defObj.items.type = '$ref';
                }

                for (prop in defObj.properties) {
                    var defObjProp = defObj.properties[prop];
                    defObjProp.name = prop;
                    if (defObjProp.$ref) {
                        defObjProp.type = "$ref";
                    }
                    if (defObjProp.type == 'array' && defObjProp.items.$ref) {
                        defObjProp.items.type = '$ref';
                    }
                }
            }
        };

        $scope.cleanDefinitionIntermediateData = function (obj) {
            for (def in obj.definitions) {
                var defObj = obj.definitions[def];
                if (def != defObj.name) {
                    //DTO definition name was changed; change the JSON key name from def to defObj.name
                    obj.definitions[defObj.name] = defObj;
                    delete obj.definitions[def];
                }

                delete defObj.name;

                if (defObj.type == 'array') {
                    delete defObj.properties;
                    if (defObj.items.type == '$ref') {
                        delete defObj.items.type;
                    }
                    else {
                        delete defObj.items.$ref;
                    }
                }
                else if (defObj.type == 'object') {
                    delete defObj.items;

                    for (prop in defObj.properties) {
                        var defObjProp = defObj.properties[prop];
                        delete defObjProp.name;
                        if (defObjProp.type != '$ref') {
                            delete defObjProp.$ref;
                        }
                        else {
                            delete defObjProp.type;
                        }

                        if (defObjProp.type != 'array') {
                            delete defObjProp.items;
                        }
                        else if (defObjProp.type == 'array' && defObjProp.items.type == '$ref') {
                            delete defObjProp.items.type;
                        }
                    }
                }
            }
        };

        $scope.preProcessSave = function (obj) {
            $scope.removeHashKeys(obj.tags);

            $scope.cleanDefinitionIntermediateData(obj);
            $scope.cleanPathsIntermediateData(obj);
        };

        $scope.setPropRef = function (prop, val) {
            prop.$ref = val;
            alert(prop.$ref);
        };

        $scope.processPaths = function (obj) {
            for (path in obj.paths) {
                obj.paths[path].path = path;
            }
        };

        $scope.cleanPathsIntermediateData = function (obj) {

        };

        $scope.isSelected = function (ref, key) {
            return ref === '#/definitions/' + key;
        };

        $scope.prefixDef = function (def) {
            return "#/definitions/" + def;
        };

        $scope.newSwaggerFile = function () {
            $scope.swaggerObject = {
                swagger: "2.0",
                info: {},
                host: "",
                basePath: "",
                tags: [],
                paths: [],
                definitions: [],
                schemes: "http",
                produces: "application/json"
            };
        };

        $scope.removeTag = function (index) {
            $scope.swaggerObject.tags.splice(index, 1);
        };
        $scope.addTag = function () {
            $scope.swaggerObject.tags.push({name: "", description: ""});
        };


        $scope.saveAsYaml = function () {
            var swaggerObjectCopy = angular.copy($scope.swaggerObject);
            $scope.preProcessSave(swaggerObjectCopy);
            var yamlContent = jsyaml.dump(swaggerObjectCopy);
            var blob = new Blob([yamlContent], {type: "text/plain;charset=utf-8"});
            saveAs(blob, "yaml_result.yaml");
        };

        $scope.removeHashKeys = function (arr) {
            for (i in arr) {
                delete arr[i].$$hashKey;
            }
        };

        $scope.addNewDefinition = function () {
            var newName = "ObjDto_" + Math.random();
            if (!$scope.swaggerObject.definitions) {
                $scope.swaggerObject.definitions = {};
            }

            $scope.swaggerObject.definitions[newName] = {
                name: newName,
                type: "object",
                properties: {}
            };
        };
        $scope.addNewProperty = function (def) {
            var newName = "property_" + Math.random();

            def.properties[newName] = {
                name: newName,
                description: "descr",
                type: "integer"
            };
        };
    });
})();
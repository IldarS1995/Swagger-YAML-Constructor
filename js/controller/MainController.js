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

        $scope.defPropertyTypes = ["$ref", "integer", "number", "string", "boolean", "array"];

        $scope.innerPropertyTypes = ["$ref", "integer", "number", "string", "boolean"];

        $scope.httpMethods = ["get", "post", "put", "delete"];

        $scope.contentTypes = ["application/json"];


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
                defObj.initialName = def;

                if (defObj.type == 'array' && defObj.items.$ref) {
                    defObj.items.type = '$ref';
                }

                for (prop in defObj.properties) {
                    var defObjProp = defObj.properties[prop];
                    defObjProp.name = prop;
                    defObjProp.initialName = prop;
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
                delete defObj.initialName;

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
                        if (prop != defObjProp.name) {
                            //Property name was changed; change the JSON key name from prop to defObjProp.name
                            defObj.properties[defObjProp.name] = defObjProp;
                            delete defObj.properties[prop];
                        }

                        delete defObjProp.name;
                        delete defObjProp.initialName;

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

        $scope.changeRefOfDefinitions = function (obj) {
            for (var def in obj.definitions) {
                var defObj = obj.definitions[def];
                if (defObj.type == 'array') {
                    if (defObj.items.type == '$ref') {
                        $scope.possiblyChangeRef(obj, defObj.items);
                    }
                }
                else if (defObj.type == 'object') {
                    for (prop in defObj.properties) {
                        var defObjProp = defObj.properties[prop];
                        if (defObjProp.type == '$ref') {
                            $scope.possiblyChangeRef(obj, defObjProp);
                        }
                        else if (defObjProp.type == 'array') {
                            if (defObjProp.items.type == '$ref') {
                                $scope.possiblyChangeRef(obj, defObjProp.items);
                            }
                        }
                    }
                }
            }
        };

        $scope.onlyDefinitionName = function (ref) {
            var prefixLength = "#/definitions/".length;
            return ref.substring(prefixLength);
        };
        $scope.possiblyChangeRef = function (obj, withRef) {
            var definition = obj.definitions[$scope.onlyDefinitionName(withRef.$ref)];
            var fullDefinitionName = $scope.prefixDef(definition.name);
            if (fullDefinitionName != withRef.$ref) {
                withRef.$ref = fullDefinitionName;
            }
        };

        $scope.changeRefOfChangedDtoNames = function (obj) {
            $scope.changeRefOfDefinitions(obj);

        };

        $scope.preProcessSave = function (obj) {
            $scope.removeHashKeys(obj.tags);

            $scope.changeRefOfChangedDtoNames(obj);
            $scope.cleanDefinitionIntermediateData(obj);
            $scope.cleanPathsIntermediateData(obj);
        };

        $scope.processPaths = function (obj) {
            for (path in obj.paths) {
                obj.paths[path].path = path;
            }
        };

        $scope.cleanPathsIntermediateData = function (obj) {

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
            if (!$scope.swaggerObject.tags) {
                $scope.swaggerObject.tags = [];
            }

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
                initialName: newName,
                name: newName,
                type: "object",
                properties: {}
            };
        };
        $scope.addNewProperty = function (def) {
            var newName = "property_" + Math.random();

            def.properties[newName] = {
                initialName: newName,
                name: newName,
                description: "descr",
                type: "integer"
            };
        };

        $scope.deleteDefinition = function (def) {
            delete $scope.swaggerObject.definitions[def.initialName];
        };
        $scope.deleteProperty = function (def, prop) {
            delete def.properties[prop.initialName];
        };

        $scope.addResponseCode = function (path) {
            var newCode = $scope.prompt("Please choose the code", "1");
            if (!$scope.isNumeric(newCode)) {
                alert("Please enter a number");
            }
            else if (path.responses[newCode]) {
                alert("There's already such response code in the list.");
            }
            else {
                path.responses[newCode] = {
                    initialCode: newCode,
                    code: newCode,
                    description: "",
                    schema: {$ref: $scope.swaggerObject.definitions[0]}
                };
            }
        };

        $scope.isNumeric = function (n) {
            return !isNaN(parseFloat(n)) && isFinite(n);
        }
    });
})();
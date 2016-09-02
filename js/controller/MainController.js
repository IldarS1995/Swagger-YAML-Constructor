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

        $scope.paramIn = ["header", "body", "query", "path"];


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
                var pathObj = obj.paths[path];

                pathObj.name = path;
                pathObj.initialName = path;

                for (meth in pathObj) {
                    var httpMethod = pathObj[meth];
                    httpMethod.name = meth;
                    httpMethod.initialName = meth;

                    for (param in httpMethod.parameters) {
                        var paramObj = httpMethod.parameters[param];
                        paramObj.name = param;
                        paramObj.initialName = param;
                        if (paramObj.schema.$ref) {
                            paramObj.type = "$ref";
                        }
                    }

                    for (response in httpMethod.responses) {
                        var responseObj = httpMethod.responses[response];
                        responseObj.name = response;
                        responseObj.initialName = response;
                    }
                }
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

        $scope.deleteResponse = function (method, response) {
            delete method.responses[response.initialName];
        };
        $scope.addResponseCode = function (method) {
            var newCode = prompt("Please choose the code", "1");
            if (!$scope.isNumeric(newCode)) {
                alert("Please enter a number");
            }
            else if (method.responses[newCode]) {
                alert("There's already such response code in the list.");
            }
            else {
                method.responses[newCode] = {
                    initialCode: newCode,
                    code: newCode,
                    description: "",
                    schema: {$ref: $scope.swaggerObject.definitions[0]}
                };
            }
        };

        $scope.isNumeric = function (n) {
            return !isNaN(parseFloat(n)) && isFinite(n);
        };

        $scope.deletePath = function (path) {
            delete $scope.swaggerObject.paths[path.initialName];
        };
        $scope.addNewPath = function () {
            var name = prompt("Please choose the URI", "/path");
            if ($scope.swaggerObject.paths[name]) {
                alert("There's already such parameter in the list.");
            }
            else {
                $scope.swaggerObject.paths[name] = {
                    name: name,
                    initialName: name,
                    httpMethods: []
                };
            }
        };

        $scope.deleteParam = function (method, initialName) {
            delete method.parameters[initialName];
        };
        $scope.addParam = function (method) {
            var name = prompt("Please choose the name", "Param");
            if (method.parameters[name]) {
                alert("There's already such parameter in the list.");
            }
            else {
                method.parameters[name] = {
                    initialName: name,
                    name: name,
                    in: "query",
                    required: false,
                    description: "",
                    type: "integer"
                };
            }
        };

        $scope.deleteHttpMethod = function (path, initialName) {
            delete path.methods[initialName];
        };
        $scope.addHttpMethod = function (path)  {
            var freeMethod = $scope.findFreeMethod(path);
            if (!freeMethod) {
                alert("I'm afraid there're no more free HTTP methods left.");
            }

            path[freeMethod] = {
                method: freeMethod,
                initialMethod: freeMethod,
                summary: "",
                description: "",
                produces: $scope.contentTypes[0],
                tags: [],
                parameters: [],
                responses: []
            };
        };
        $scope.findFreeMethod = function (path) {
            if ($scope.countOfFields(path) >= $scope.httpMethods.length) {
                return null;
            }

            for (i in $scope.httpMethods) {
                var meth = $scope.httpMethods[i];
                if (!path[meth]) {
                    return meth;
                }
            }

            return null;
        };

        $scope.countOfFields = function (obj) {
            var i = 0;
            for (field in obj) {
                if (obj.hasOwnProperty(field)) {
                    i++;
                }
            }

            return i;
        };

        $scope.selectedTag = null;
        $scope.removeTagFromMethod = function (method, tagIdx) {
            method.tags.splice(tagIdx, 1);
        };
        $scope.addTagToMethod = function (method) {
            method.tags.push($scope.selectedTag.name);
        };
    });
})();
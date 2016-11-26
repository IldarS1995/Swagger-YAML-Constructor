(function () {
    app.controller('mainController', function ($scope) {

        $scope.file = {obj: undefined};
        $scope.swaggerObject = null;

        $scope.tabs = [
            {name: "General information", page: "tab_pages/main_info_tab.html"},
            {name: "Definitions", page: "tab_pages/definition_tab.html"},
            {name: "Paths", page: "tab_pages/paths_tab.html"}
        ];
        $scope.currentTab = $scope.tabs[0];

        $scope.definitionTypes = ["object", "array"];

        $scope.defPropertyTypes = ["$ref", "integer", "number", "string", "boolean", "array"];

        $scope.innerPropertyTypes = ["$ref", "integer", "number", "string", "boolean"];

        $scope.httpMethods = ["get", "post", "put", "delete"];

        $scope.contentTypes = ["", "application/json"];

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
            $scope.changeRefOfPaths(obj);
        };

        $scope.preProcessSave = function (obj) {
            $scope.removeHashKeys(obj.tags);

            $scope.changeRefOfChangedDtoNames(obj);
            $scope.cleanDefinitionIntermediateData(obj);
            $scope.cleanPathsIntermediateData(obj);
        };

        $scope.processPaths = function (obj) {
            for (var path in obj.paths) {
                if (!obj.paths.hasOwnProperty(path)) {
                    continue;
                }

                var pathObj = obj.paths[path];

                pathObj.name = path;
                pathObj.initialName = path;
                pathObj.freeHttpMethods = $scope.findFreeMethods(pathObj);

                for (var meth in pathObj) {
                    if (!pathObj.hasOwnProperty(meth) || !$scope.isHttpMethod(meth)) {
                        continue;
                    }

                    var httpMethod = pathObj[meth];
                    httpMethod.name = meth;

                    if (!httpMethod.produces) {
                        httpMethod.produces = [""];
                    }

                    for (var idx in httpMethod.parameters) {
                        var paramObj = httpMethod.parameters[idx];
                        if (paramObj.schema && paramObj.schema.$ref) {
                            paramObj.type = "$ref";
                        }
                    }

                    for (var response in httpMethod.responses) {
                        if (!httpMethod.responses.hasOwnProperty(response)) {
                            continue;
                        }

                        var responseObj = httpMethod.responses[response];
                        if ($scope.isNumeric(response)) {
                            responseObj.name = parseInt(response);
                        }
                        else {
                            responseObj.name = 99; //The default code
                        }

                        if (!responseObj.schema.type) {
                            responseObj.schema.type = "object";
                        }
                    }
                }
            }
        };

        $scope.cleanPathsIntermediateData = function (obj) {
            for (var path in obj.paths) {
                if (!obj.paths.hasOwnProperty(path)) {
                    continue;
                }

                var pathObj = obj.paths[path];

                if (path != pathObj.name) {
                    //Path URL changed
                    obj.paths[pathObj.name] = pathObj;
                    delete obj.paths[path];
                }
                delete pathObj.name;
                delete pathObj.initialName;
                delete pathObj.freeHttpMethods;

                for (var meth in pathObj) {
                    if (!pathObj.hasOwnProperty(meth) || !$scope.isHttpMethod(meth)) {
                        continue;
                    }

                    var httpMethod = pathObj[meth];

                    if (meth != httpMethod.name) {
                        //Method changed
                        pathObj[httpMethod.name] = httpMethod;

                        delete pathObj[meth];
                    }
                    delete httpMethod.name;

                    if (httpMethod.produces
                        && (httpMethod.produces.length == 0 || httpMethod.produces[0] == '')) {
                        delete httpMethod.produces;
                    }

                    for (var idx in httpMethod.parameters) {
                        var paramObj = httpMethod.parameters[idx];
                        if (paramObj.type != "$ref") {
                            delete paramObj.schema;
                        }
                        else {
                            delete paramObj.type;
                        }
                    }

                    for (var response in httpMethod.responses) {
                        if (!httpMethod.responses.hasOwnProperty(response)) {
                            continue;
                        }

                        var responseObj = httpMethod.responses[response];

                        if (response != responseObj.name) {
                            httpMethod.responses[responseObj.name] = responseObj;
                            delete httpMethod.responses[response];
                        }
                        delete responseObj.name;
                        delete responseObj.initialName;

                        if (responseObj.schema) {
                            if (responseObj.schema.type == "object") {
                                delete responseObj.schema.type;
                            }
                            else if (responseObj.schema.type == "array") {
                                delete responseObj.schema.$ref;
                            }
                        }
                    }

                    if (httpMethod.responses[$scope.minCode]) {
                        httpMethod.responses["default"] = httpMethod.responses[$scope.minCode];
                        delete httpMethod.responses[$scope.minCode];
                    }
                }
            }
        };

        $scope.changeRefOfPaths = function (obj) {
            for (var path in obj.paths) {
                if (!obj.paths.hasOwnProperty(path)) {
                    continue;
                }

                var pathObj = obj.paths[path];
                for (var meth in pathObj) {
                    if (!pathObj.hasOwnProperty(meth)) {
                        continue;
                    }

                    var methObj = pathObj[meth];
                    for (var param in methObj.parameters) {
                        var paramObj = methObj.parameters[param];

                        if (paramObj.type == '$ref') {
                            $scope.possiblyChangeRef(obj, paramObj.schema);
                        }
                        else if (paramObj.type == 'array') {
                            $scope.possiblyChangeRef(obj, paramObj.schema.items);
                        }
                    }

                    for (var response in methObj.responses) {
                        if (!methObj.responses.hasOwnProperty(response)) {
                            continue;
                        }

                        var responseObj = methObj.responses[response];
                        if (responseObj.schema.type == 'object') {
                            $scope.possiblyChangeRef(obj, responseObj.schema);
                        }
                        else if (responseObj.schema.type == 'array') {
                            $scope.possiblyChangeRef(obj, responseObj.schema.items);
                        }
                    }
                }
            }
        };

        $scope.isHttpMethod = function (meth) {
            return $scope.httpMethods.indexOf(meth) > -1;
        };

        $scope.prefixDef = function (def) {
            return "#/definitions/" + def;
        };

        $scope.newSwaggerFile = function () {
            $scope.swaggerObject = {
                swagger: "2.0",
                info: {},
                host: "api.com",
                basePath: "/api",
                tags: [],
                paths: {},
                definitions: {},
                schemes: ["http"],
                produces: ["application/json"]
            };
        };

        $scope.paramTypeChanged = function (param) {
            if (param.type == "$ref") {
                param.in = "body";
            }
        };

        $scope.removeTag = function (index) {
            var obj = $scope.swaggerObject;
            var tag = obj.tags[index].name;
            obj.tags.splice(index, 1);

            //Remove this tag from each path tag list
            for (path in obj.paths) {
                if (!obj.paths.hasOwnProperty(path)) {
                    continue;
                }

                var pathObj = obj.paths[path];
                for (meth in pathObj) {
                    if (!pathObj.hasOwnProperty(meth)) {
                        continue;
                    }

                    var methObj = pathObj[meth];
                    if (methObj.tags && (idx = methObj.tags.indexOf(tag)) > -1) {
                        methObj.tags.splice(idx, 1);
                    }
                }
            }
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
            if (!$scope.swaggerObject.definitions) {
                $scope.swaggerObject.definitions = {};
            }

            var newName = prompt("Enter the definition name", "ObjDto");
            if (!newName) {
                return;
            }

            if ($scope.hasDefinitionWithName(newName)) {
                alert("There's already a definition with such name. Please choose another.");
                return;
            }

            $scope.swaggerObject.definitions[newName] = {
                initialName: newName,
                name: newName,
                type: "object",
                properties: {}
            };
        };

        $scope.hasDefinitionWithName = function(name) {
            var obj = $scope.swaggerObject;
            for (var i in obj.definitions) {
                if (!obj.definitions.hasOwnProperty(i)) {
                    continue;
                }

                var def = obj.definitions[i];
                if (def.name === name) {
                    return true;
                }
            }
            return false;
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

        $scope.minCode = 99;
        $scope.maxCode = 899;

        $scope.deleteResponse = function (method, response) {
            delete method.responses[response.initialName];
        };
        $scope.addResponseCode = function (method) {
            var newCode = prompt("Please choose the code", "100");
            if (!newCode) {
                return;
            }
            if (!$scope.isNumeric(newCode)) {
                alert("Please enter a number");
                return;
            }

            var code = parseInt(newCode);
            if (code < $scope.minCode || code > $scope.maxCode) {
                alert("The code you entered is out of the range.");
            }
            else if (method.responses[code] || code == 99 && method.responses["default"]) {
                alert("There's already such response code in the list.");
            }
            else {
                var obj = $scope.swaggerObject.definitions;
                var defNames = $scope.getFieldNames(obj);
                if (!method.responses) {
                    method.responses = {};
                }

                method.responses[code] = {
                    name: code,
                    initialName: code,
                    description: "",
                    schema: {
                        type: "object",
                        $ref: defNames.length == 0 ? null : $scope.prefixDef(defNames[0])
                    }
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
            if (!name) {
                return;
            }

            if ($scope.swaggerObject.paths[name]) {
                alert("There's already such path in the list.");
            }
            else {
                $scope.swaggerObject.paths[name] = {
                    name: name,
                    initialName: name,
                    freeHttpMethods: angular.copy($scope.httpMethods),
                    methodToCreate: $scope.httpMethods[0]
                };
            }
        };

        $scope.deleteParam = function (method, idx) {
            method.parameters.splice(idx, 1);
        };
        $scope.addParam = function (method) {
            var name = prompt("Please choose the name", "Param");
            if ($scope.hasParameter(method.parameters, name)) {
                alert("There's already such parameter in the list.");
            }
            else {
                method.parameters.push({
                    name: name,
                    in: "query",
                    required: false,
                    description: "",
                    type: "integer"
                });
            }
        };
        $scope.hasParameter = function (params, name) {
            for (i in params) {
                if (params[i].name == name) {
                    return true;
                }
            }
            return false;
        };

        $scope.deleteHttpMethod = function (path, name) {
            delete path[name];
            path.freeHttpMethods.push(name);
            path.methodToCreate = path.freeHttpMethods[0];
        };
        $scope.addHttpMethod = function (path, methodToCreate)  {
            path[methodToCreate] = {
                name: methodToCreate,
                summary: "",
                description: "",
                produces: [$scope.contentTypes[0]],
                consumes: [],
                tags: [],
                parameters: [],
                responses: {}
            };

            var idx = path.freeHttpMethods.indexOf(methodToCreate);
            path.freeHttpMethods.splice(idx, 1);
            path.methodToCreate = path.freeHttpMethods[0];
        };
        $scope.findFreeMethods = function (pathObj) {
            var freeHttpMethods = angular.copy($scope.httpMethods);
            for (meth in pathObj) {
                if (pathObj.hasOwnProperty(meth) && $scope.isHttpMethod(meth)) {
                    var idx = freeHttpMethods.indexOf(meth);
                    freeHttpMethods.splice(idx, 1);
                }
            }

            return freeHttpMethods;
        };

        $scope.getFieldNames = function (obj) {
            var arr = [];
            for (var field in obj) {
                if (obj.hasOwnProperty(field)) {
                    arr.push(field);
                }
            }

            return arr;
        };

        $scope.selectedTag = {selected: null};
        $scope.removeTagFromMethod = function (method, tagIdx) {
            method.tags.splice(tagIdx, 1);
        };
        $scope.addTagToMethod = function (method) {
            method.tags.push($scope.selectedTag.selected.name);
        };

        $scope.propNameLoseFocus = function (def, prop) {
            if (prop.initialName != prop.name && def.properties[prop.name]) {
                alert("All properties must be unique in one product.");
                prop.name = prop.initialName;
            }
        };

        $scope.defNameLoseFocus = function (def) {
            if (def.initialName != def.name && $scope.swaggerObject.definitions[def.name]) {
                alert("All definition names must be unique.");
                def.name = def.initialName;
            }
        };

        $scope.pathNameLoseFocus = function (path) {
            if (path.initialName != path.name && $scope.swaggerObject.paths[path.name]) {
                alert("All path names must be unique.");
                path.name = path.initialName;
            }
        };
    });
})();
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

                console.log(doc);
                $scope.$apply(function () {
                    $scope.swaggerObject = doc;
                });
            };
            reader.onerror = function (e) {
                console.log(e);
            };
        };

        $scope.removeTag = function (index) {
            $scope.swaggerObject.tags.splice(index, 1);
        };
        $scope.addTag = function () {
            $scope.swaggerObject.tags.push({name: "", description: ""});
        };


        $scope.saveAsYaml = function () {
            $scope.removeHashKeys($scope.swaggerObject.tags);
            var yamlContent = jsyaml.dump($scope.swaggerObject);
            var blob = new Blob([yamlContent], {type: "text/plain;charset=utf-8"});
            saveAs(blob, "yaml_result.yaml");
        };
        $scope.removeHashKeys = function (arr) {
            for (i in arr) {
                delete arr[i].$$hashKey;
            }
        };
    });
})();
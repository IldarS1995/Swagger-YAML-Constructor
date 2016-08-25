(function () {
    app.controller('mainController', function ($scope) {

        $scope.swaggerObject = {};

        $scope.tabs = [
            {name: "General information", page: "tab_pages/main_info_tab.html"},
            {name: "Paths", page: "tab_pages/paths_tab.html"},
            {name: "Definitions", page: "tab_pages/definition_tab.html"}
        ];
        $scope.currentTab = $scope.tabs[0];

        $scope.setCurrentTab = function(tab) {
            $scope.currentTab = tab;
        }
    });
})();
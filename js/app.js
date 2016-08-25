var app;
(function () {
    app = angular.module('app', ['ngRoute', 'ngResource']);

    app.directive('includeReplace', function () {
        return {
            require: 'ngInclude',
            restrict: 'A',
            link: function (scope, el, attrs) {
                el.replaceWith(el.children());
            }
        };
    });
})();
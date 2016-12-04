var app;
(function () {
    app = angular.module('app', ['ngRoute', 'ngResource', 'angularUtils.directives.dirPagination']);

    app.directive('includeReplace', function () {
        return {
            require: 'ngInclude',
            restrict: 'A',
            link: function (scope, el, attrs) {
                el.replaceWith(el.children());
            }
        };
    });

   app .filter('filterByName', function() {
        return function(input, search) {
            if (!input) return input;
            if (!search) return input;
            var expected = ('' + search).toLowerCase();
            var result = {};
            angular.forEach(input, function(value, key) {
                var actual = ('' + key).toLowerCase();
                if (actual.indexOf(expected) !== -1) {
                    result[key] = value;
                }
            });
            return result;
        }
    });

    app.directive("fileread", [function () {
        return {
            scope: {
                fileread: "="
            },
            link: function (scope, element, attributes) {
                element.bind("change", function (changeEvent) {
                    scope.$apply(function () {
                        scope.fileread = changeEvent.target.files[0];
                    });
                });
            }
        }
    }]);
})();
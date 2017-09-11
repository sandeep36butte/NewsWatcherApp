angular.module('app',['ngRoute'])
.config(function($routeProvider){
    $routeProvider
        .when('/',{controller:'LoginCtrl',templateUrl:'./ngviews/login.html'})
        .when('/news',{controller:'NewsCtrl',templateUrl:'./ngviews/news.html'})
        .when('/news/:saved',{controller:'NewsCtrl',templateUrl:'./ngviews/login.html'})
        .when('/sharednews',{controller:'SharedNewsCtrl',templateUrl:'./ngviews/sharednews.html'})
        .when('/profile',{controller:'ProfileCtrl',templateUrl:'./ngviews/profile.html'})

})
.controller('ApplicationCtrl',['$rootscope','$scope','$http','$location','$window',function($rootscope,$scope,$http,$location,$window){
    var retrievedObject = $window.localStorge.getItem("userToken");
    if (retrievedObject){
        $rootscope.session = JSON.parse(retrievedObject);
        $scope.rememberMe = true;
        $rootscope.loogedIn = true;
        $http.default,headers.common['x-auth'] = $rootscope.session.token;
        $scope.emit('msg',"signed in as "+$rootscope.session.displayName);
        $location.path('/news').replace();
    }else{
        $scope.rememberMe = false;
        $location.path('/').replace();
    }
    $scope.$on('msg',function(event,msg){
        $scope.currentMsg = msg;
    });
    $scope.logout = function(){
        $http({
            method : 'DELETE',
            url : "/api/sessions"+$rootscope.session.userId,
            headers:{
                'Content-Type':'application/json'
            },
            responseType : 'json'
        }).then(function successCallback(response){
            $rootscope.loogedIn = false;
            $rootscope.session = null;
            $http.default.headers.common['x-auth'] = null;
            $window.localStorge.removeItem("userToken");
            $location.path('/').replace();
        },function errorCallback(response){
            $scope.$emit('msg',"Signed Out Failed "+response.data.message);
        });
    }
    $scope.changeView = function(view){
        $location.path(view).replace();
    }
    $scope.dismissError = function(){
        $scope.currentMsg = null;
    }
}])
.controller('LoginCtrl',['$rootscope','$scope','$http','$location','$window',function($rootscope,$scope,$http,$location,$window){
    $scope.login = function(email,password){
        $http({
            method : 'POST',
            url : 'api/sessions',
            cache : false,
            headers:{
                'Content-Type' : 'application/json'
            },
            responseType : 'json',
            data:{email:email,password:password}
        }).then(function successCallback(response){
            $rootscope.loogedIn = true;
            $rootscope.session = response.data;
            $http.defaults.headers.common['x-auth']=response.data.token;
            $scope.emit('msg',"Signed in as :"+response.data.displayName);
            if ($scope.rememberMe){
                var xfer = {
                    token:response.data.toke,
                    displayName : response.data.displayName,
                    userId : response.data.userId
                };
                $window.localStorge.setItem("userTokmen",JSON.stringify(xfer));
            }
            else{
                $window.localStorge.removeItem("userToken");
            }
            $location.path('/news').replace();
        },
        function errorCallback(response){
            $scope.emit('msg',"signed in failed."+response.data.message);
        }
    );
    }
    $scope.register = function(){
        $http({
            method:'POST',
            url : 'api/users',
            cache:false,
            headers:{
                'Content-Type':'application/json'
            },
            responseType:'json',
            data :{
                email:$scope.emailReg,
                displayName : $scope.displayNameReg,
                password : $scope.passwordReg
            }
        }).then(function successCallback(response){
            $scope.emit("msg","Registered");
        },function errorCallback(response){
            $scope.emit("msg","Failed to Register "+response.data.message);
        });
    }
    $scope.openRegModal = function(){
        angular.element('#myRegMOdal').modal('show');
    }
}])
.controller('ProfileCtrl',['$rootscope','$scope','$http','$location','$window',function($rootscope,$scope,$http,$location,$window){
    
}])
.controller('NewsCtrl',['$rootscope','$scope','$http','$location','$window','$routeparams',function($rootscope,$scope,$http,$location,$window,$routeparams){
    
}])
.controller('SharedNewsCtrl',['$rootscope','$scope','$http','$location','$window',function($rootscope,$scope,$http,$location,$window){
    
    }])
    
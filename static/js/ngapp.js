(function(){
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
        $scope.selectedIdx = 0;
        $scope.showSavedNews = $routeparams.saved;
         
        $http({
            method : 'GET',
            url : "api/users/"+$rootscope.session.userId,
            cache:false,
            headers:{
                'Cache-Control':'no-cache',
                'pragma':'no-cache',
                'If-Modified-Since':'0'
            },
            responseType:'json'
        }).then(function successCallback(response){
            $scope.user = response.data;
            if ($routeparams.saved){
                $scope.news = response.data.savedStories;
                for (var i=0;i<$scope.news.length;i++){
                    $scope.news[i].hours = toHours($scope.news[i].date);
                }
            }
            else{
                $scope.news = $scope.user.newsFilters[$scope.selectedIdx].newsStories;
                for (var i=0;i<$scope.user.newsFilters.length;i++){
                    for (var j=0;j<$scope.user.newsFilters[i].newsStories.length;j++){
                        $scope.user.newsFilters[i].newsStories[j].hours = toHours($scope.user.newsFilters[i].newsStories[j].date);
                    }
                }
            }
            $scope.$emit("msg","News Fetched");
        },function errorCallback(response){
            $rootscope.loogedIn = false;
            $rootscope.session = null;
            $http.default.headers.common['x-auth'] = null;
            $window.localStorge.removeItem("UserToken");
            $scope.$emit('msg',"New Fetched Failed: "+response.data.message);
            $location.path('/').replace();
        });

        $scope.selectOne = function(index){
            $scope.selectedIdx = index;
            $scope.news = $scope.user.newsFilters[$scope.selectedIdx].newsStories;
        }
        $scope.saveStory = function(index){
            $http ({
                method:'POST',
                url : "/api/users/"+$rootscope.session.userId+"/savestories",
                headers:{
                    'Content-Type':'application/json'
                },
                responseType : 'json',
                data : $scope.news[index]
            }).then(function successCallback(response){
                $scope.emit("msg","story Saved");
            },function errorCallback(response){
                $scope.emit("msg","Story Save failed "+$scope.data.message);
            });
        }
        $scope.deleteSavedStory = function(index){
            $http({
                method : 'DELETE',
                url : "/api/users/"+$rootscope.session.userId+"/savedstories"+$scope.news[index].storyID,
                headers:{
                    'Content-Type':'json'
                },
                responseType : 'json'
            }).then(function successCallback(response){
                $scope.news.splice(index,1);
                $scope.emit("msg","Story Deleted");
            },function errorCallback(response){
                    $scope.emit("msg","Story delete failed: "+response.data.message);
            });
        }
        $scope.shareStory = function (index){
            $http({
                method:'POST',
                url:'/api/sharenews',
                headers:{
                    'Content-Type':'json',
                },
                responseType : 'json',
                data : $scope.news[index]
            }).then (function successCallback(response){
                $scope.emit("msg","Story saved");
            },function errorCallback(response){
                $scope.emit("msg","Story share failed: "+response.data.message);
            });
        }
    }])
    .controller('SharedNewsCtrl',['$rootscope','$scope','$http','$location','$window',function($rootscope,$scope,$http,$location,$window){
        
        }])
    
        function toHours(date){
            var d1 = date;
            var d2 = Date.now();
            var diff = matchMedia.floor((d2-d1)/3600000);
            if (diff == 0 || diff <2){
                return "1 Hour Ago";
            }
            else {
                return diff.toString()+"Hours Ago";
            }
        }
        
})()
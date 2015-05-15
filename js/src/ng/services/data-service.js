define([], function()
{
    var services = angular.module('app.Services', ['firebase']);

    services.factory('configService', ['$q', '$http', function($q, $http) {

      var sup = this;
      this.data = null;

      this.load = function(){
        var defer = $q.defer();

        if(this.data != null){
          defer.resolve(this.data);
          return defer.promise;
        }

        $http.get('/js/config.json').success(function(data, status, headers, config) {
          sup.data = data[0];
          defer.resolve(sup.data);
        }).error(function(data, status, headers, config) {
          // called asynchronously if an error occurs
          // or server returns response with an error status.
        });

        return defer.promise;
      }

      return this;

    }]);

    services.factory('datService', ['$q', '$http', 'configService', '$filter', function($q, $http, configService, $filter) {

      var sup = this;
      this.categorias = null;
      this.paginas = null;

      var categoriasRef = null;
      var paginasRef = null;
      var loadedPaginas = null;
      var loadedCategorias = null;


      this.loadData = function(){
        var defer = $q.defer();

        if(loadedPaginas == null && loadedCategorias == null){
          configService.load().then(function(data){

            categoriasRef = new Firebase(data.categoriasRef);
            paginasRef = new Firebase(data.paginasRef);

            categoriasRef.on('value', function(dataSnapshot) {
              loadedCategorias = dataSnapshot.val();

              paginasRef.on('value', function(dataSnapshot) {
                Firebase.goOffline();
                loadedPaginas = dataSnapshot.val();

                defer.resolve({categorias: angular.copy(loadedCategorias), paginas: angular.copy(loadedPaginas)});
              });
            });
          });

          return defer.promise;
        }

        defer.resolve({categorias: angular.copy(loadedCategorias), paginas: angular.copy(loadedPaginas)});

        return defer.promise;
      }

      function filterPages(slug){
        var categoria;
        var paginas = new Array();

        angular.forEach(sup.categorias, function(value, key) {
          if(value.slug == slug){
            categoria = value;
            categoria.$id = key;
          }
        });

        angular.forEach(sup.paginas, function(value, key) {
          if(value.parentId == categoria.$id){
            paginas.push(value);
          }
        });

        return {paginas: paginas, categoria: categoria};
      }

      this.getPages = function(slug){
        var defer = $q.defer();

        sup.getData().then(function(){
          defer.resolve(filterPages(slug));
        });

        return defer.promise;
      }

      this.getPage = function(slug){
        var defer = $q.defer();

        sup.getData().then(function(){
          var pagina;

          angular.forEach(sup.paginas, function(value, key) {
            if(value.slug == slug){
              pagina = value;
            }
          });

          defer.resolve(pagina);
        });

        return defer.promise;
      }

      this.getData = function(){
        var defer = $q.defer();

        this.loadData().then(function(data){
          sup.paginas = data.paginas;
          sup.categorias = {};

          angular.forEach(sup.paginas, function(value, key){
            value.$id = key;
          });

          angular.forEach(sup.paginas, function(value, key){
              var parent = value.parentId;
              if(data.categorias[parent] && value.state == "available"){
                sup.categorias[parent] = data.categorias[parent];
                sup.categorias[parent].url = (sup.categorias[parent].url)? '/pages/'+sup.categorias[parent].slug : '/'+value.slug;
              }
          });

          defer.resolve();
        });

        return defer.promise;
      }

      return this;

    }]);


    return services;
});
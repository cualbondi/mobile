angular.module('app').controller('AppCtrl', AppCtrl);

AppCtrl.$inject = ['$scope', '$http', '$templateRequest', '$ionicModal', '$timeout', '$ionicSideMenuDelegate', 'geolocationService', 'Recorridos', 'localstorage', '$compile', 'Favoritos', 'Geocoder']

function AppCtrl($scope, $http, $templateRequest, $ionicModal, $timeout, $ionicSideMenuDelegate, geolocationService, Recorridos, localstorage, $compile, Favoritos, Geocoder) {

  $scope.ciudades = localstorage.get('ciudades');
  if ( !$scope.ciudades ) {
    $scope.ciudades = [
      {slug:"bahia-blanca",  nombre:"Bahía Blanca" , latlng:[-38.71712603942564, -62.26758956909179]},
      {slug:"buenos-aires",  nombre:"Buenos Aires" , latlng:[-34.61060576091466, -58.38821411132812]},
      {slug:"cordoba",       nombre:"Córdoba"      , latlng:[-31.41672448645413, -64.18350219726561]},
      {slug:"la-plata",      nombre:"La Plata"     , latlng:[-34.92137284339113, -57.95438289642334]},
      {slug:"mar-del-plata", nombre:"Mar del Plata", latlng:[-38.00353496501491, -57.55290985107422]},
      {slug:"mendoza",       nombre:"Mendoza"      , latlng:[-32.88960597084806, -68.84445190429688]},
      {slug:"rosario",       nombre:"Rosario"      , latlng:[-32.94350062291001, -60.64985275268555]},
      {slug:"salta",         nombre:"Salta"        , latlng:[-24.78924754938909, -65.41031241416931]},
      {slug:"santa-fe",      nombre:"Santa Fé"     , latlng:[-31.64189163095992, -60.70441961288452]}
    ];
    localstorage.set("ciudades", $scope.ciudades);
  }

  $scope.ciudad = localstorage.get('ciudad');
  if ($scope.ciudad) {
    Recorridos.setCiudad($scope.ciudad.slug);
    Geocoder.setCiudad($scope.ciudad.slug)
  }

  $scope.inputA = '';
  $scope.inputB = '';

  $scope.radio = 300;
  Recorridos.setDefaultRadio($scope.radio);
  $scope.resultadoIndice = 0;
  $scope.resultados = [];

  $scope.enableHighAccuracy = true;

  geolocationService.onPosition($scope, function(event, position) {
    $scope.locationMarker.setLatLng([position.coords.latitude, position.coords.longitude]);
    $scope.locationMarker.setRadius(position.coords.accuracy);
    if ($scope.map) $scope.locationMarker.addTo($scope.map);
    angular.element(document.getElementsByClassName('location-marker')).removeClass('red')
  })
  geolocationService.onError($scope, function(event, error) {
    // TODO 1: show and maintain error message on screen
    // OR alternatively remove marker

    // TODO 2: If error is because no permission from device, show message
    // with button to enable geolocation, (maybe do this inside service?)

    angular.element(document.getElementsByClassName('location-marker')).addClass('red')

    console.log(error.code)
    console.log(error.message)
  })



  $scope.marcar = function(e, marker) {
    if ( e.latlng ) {
      marker.setLatLng(e.latlng).addTo($scope.map);
      if (marker == $scope.markerA) $scope.inputA = e.text;
      if (marker == $scope.markerB) $scope.inputB = e.text;
      if ( marker.getPopup() )
        marker.unbindPopup();
      if ( e.text )
        marker.bindPopup(e.text);
    }
    else {
      $scope.map.removeLayer(marker);
      marker.setLatLng = null;
    }
    $scope.buscarRecorridos();
    $scope.map.closePopup();
  };


  $scope.tileLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; Cualbondi & OpenStreetMap contributors',
    unloadInvisibleTiles: false,
    updateWhenIdle: false
  })


  $scope.resultadosLayer = L.featureGroup();
  $scope.favoritosLayer = L.featureGroup();
  $scope.locationMarker = L.markerWithCircle(null, {draggable: false, radius: 0, icon: new L.DivIcon({className: 'location-marker'}), opacity:0, fillOpacity:0.1});
  // $scope.MarkerA && $scope.MarkerB
  // {
  //  type: 'GPS' || 'Favorito' || 'Click en mapa' || 'Busqueda' || null/undefined,
  //  latlng: L.latLng
  // }
  $scope.markerA = L.markerWithCircle(null, {draggable: true, radius: $scope.radio, icon: new L.DivIcon({className: 'markerA', popupAnchor: [0,-40]}), weight:1, opacity:0.8, fillOpacity:0.2, color:'#ef5734'});
  $scope.markerB = L.markerWithCircle(null, {draggable: true, radius: $scope.radio, icon: new L.DivIcon({className: 'markerB', popupAnchor: [0,-40]}), weight:1, opacity:0.8, fillOpacity:0.2, color:'#74b843'});
  $scope.markerA.on('moveend', function(e) {$scope.$apply(function() {$scope.marcar({text:'Origen marcado manualmente en mapa', latlng:e.target._latlng},$scope.markerA) }); });
  $scope.markerB.on('moveend', function(e) {$scope.$apply(function() {$scope.marcar({text:'Destino marcado manualmente en mapa', latlng:e.target._latlng},$scope.markerB) }); });

  $templateRequest("popup-gps.html").then(function(html) {
    var template = angular.element(html);
    $scope.locationMarker.bindPopup($compile(template)($scope)[0]);
  });

  $scope.alert = function(msg) {
    alert(msg)
  };

  $scope.favoritos = Favoritos.items;
  Favoritos.onChange($scope, function(event, favoritos) {
    $scope.favoritosLayer.clearLayers();
    $scope.favoritosMarkers = [];
    $templateRequest("popup-favorito.html").then(function(html) {
      for (var i = 0; i < favoritos.length; i++) {
        var $scopefav = $scope.$new(true);
        $scopefav.deleteFavorito = (function(i) { return function(){$scope.deleteFavorito(i);} })(i);
        $scopefav.favorito= favoritos[i];
        var template = angular.element(html);
        var marker = L.marker(favoritos[i].latlng, {icon: new L.DivIcon({className: 'markerFavorito'}), pane: 'tilePane'} );
        marker.bindPopup($compile(template)($scopefav)[0]);
        $scope.favoritosMarkers.push(marker)
        marker.addTo($scope.favoritosLayer);
      }
    });
  }, true);

  $scope.deleteFavorito = function(i) {
    if (confirm('¿Seguro que desea borrar este favorito?'))
      Favoritos.delete(i);
  };

  $scope.clickFavorito = function(i) {
    $scope.map.panTo($scope.favoritosMarkers[i].getLatLng());
    $scope.favoritosMarkers[i].openPopup();
    $scope.modal_favoritos.hide()
  };

  $scope.init = function() {
    if (!$scope.map) {
      $scope.map = new L.map('mapa',
        {
          zoomSnap: 0.5,
          zoomDelta: 0.5,
          closePopupOnClick: true,
          attributionControl: false,
          zoomControl:false,
          contextmenu: true,
          contextmenuItems: [
            {
              text: 'Marcar Origen',
              icon: 'img/markerA.png',
              callback: function(e) { $scope.$apply(function() {e.text = 'Origen marcado manualmente en mapa'; $scope.marcar(e, $scope.markerA);}); }
            }, {
              text: 'Marcar Destino',
              icon: 'img/markerB.png',
              callback: function(e) { $scope.$apply(function() {e.text = 'Destino marcado manualmente en mapa';$scope.marcar(e, $scope.markerB);}); }
            },
            '-',
            {
              text: 'Marcar Favorito',
              iconCls: 'icon ion-star',
              callback: function(e) {
                $scope.$apply(function() {
                  var nombre = prompt('Nombre del favorito');
                  if (nombre) Favoritos.add(nombre, e.latlng);
                })
              }
            }
        ]
        }
      );
      $scope.map.on('contextmenu.show', function() { $scope.map.closePopup(); });
      $scope.map.addControl( L.control.zoom({position: 'bottomright'}) );
      $scope.map.addLayer($scope.resultadosLayer);
      $scope.map.addLayer($scope.favoritosLayer);
      $scope.tileLayer.addTo($scope.map);
      if ($scope.locationMarker.getLatLng()) $scope.locationMarker.addTo($scope.map);
      $scope.map.on('click', function(e) {
        //$scope.map.contextmenu.showAt(e.latlng);
      });
    }
    $scope.map.setView($scope.ciudad.latlng, 12);
  }

  // mostrar resultados en todos lados
  $scope.$watchCollection('resultados', function(n, o) {if(n!=o){
    actualizar_vista_resultados(n, $scope.resultadoIndice);
  }}, true);


  $scope.buscarRecorridos = function buscarRecorridos(p, next) {
      var more = true;
      if ( typeof p === 'undefined' || typeof p === 'object') {
          $scope.resultadoIndice = 0;
          $scope.resultados = [];
          more = false;
          p = 1;
      }
      if ( $scope.markerA.getLatLng() !== null && $scope.markerB.getLatLng() !== null ) {
          $scope.busqueda=true;
          $scope.status = 'buscando lineas';
          Recorridos.search({
              origen: $scope.markerA.getLatLng(),
              destino: $scope.markerB.getLatLng(),
              p: p
          }).success(function(data) {
            $scope.status = '';
            if ( more ) {
                $scope.resultados = $scope.resultados.concat(data.resultados);
            }
            else
                $scope.resultados = data.resultados;
            $scope.cantidadResultados = data.cant;
            if (next) next();
          })

      }
  };


  function actualizar_vista_resultados(newValue, idx) {
      $scope.resultadoIndice = idx;
      $scope.resultadosLayer.clearLayers();
      var res = $scope.resultadoIndice;
      var r = [];
      if ( newValue.length > res ) {
          var ruta_corta = newValue[res].itinerario[0].ruta_corta;
          var dec = RC4decode(ruta_corta);
          dec = dec.replace("LINESTRING(", "").replace("LINESTRING (", "").replace(/, /g, ',').replace(")","").split(",");
          for ( var i = 0; i < dec.length; i++ ) {
              var p = dec[i].split(" ");
              r.push([parseFloat(p[1]), parseFloat(p[0])]);
          }
          var ruta = L.polyline(r, {color:"#37A", weight:8, opacity:0.9});
          var flechas1 = L.polylineDecorator(ruta, { patterns: [{
            offset: '42',
            repeat: 150,
            symbol: L.Symbol.arrowHead({
              pixelSize: 4,
              polygon: false,
              pathOptions: {
                color: '#FFF',
                opacity: 0.5,
                weight: 2
              }
            })
          }]});
          var flechas2 = L.polylineDecorator(ruta, { patterns: [{
            offset: '50',
            repeat: 150,
            symbol: L.Symbol.arrowHead({
              pixelSize: 4,
              polygon: false,
              pathOptions: {
                color: '#FFF',
                opacity: 0.7,
                weight: 2
              }
            })
          }]});
          var flechas3 = L.polylineDecorator(ruta, { patterns: [{
            offset: '58',
            repeat: 150,
            symbol: L.Symbol.arrowHead({
              pixelSize: 4,
              polygon: false,
              pathOptions: {
                color: '#FFF',
                opacity: 0.9,
                weight: 2
              }
            })
          }]});

          $scope.resultadosLayer.addLayer(ruta);
          $scope.resultadosLayer.addLayer(flechas1);
          $scope.resultadosLayer.addLayer(flechas2);
          $scope.resultadosLayer.addLayer(flechas3);
      }
  }

  $scope.setCiudad = function (ciudadSlug) {
    for (var i = 0; i<$scope.ciudades.length; i++) {
      if ($scope.ciudades[i].slug == ciudadSlug)
        $scope.ciudad = $scope.ciudades[i];
    }
    localstorage.set('ciudad', $scope.ciudad);
    Recorridos.setCiudad(ciudadSlug);
    Geocoder.setCiudad(ciudadSlug)
    $scope.init();
  }

  $scope.setResultadoIndice = function (indice) {
    var end = function() {
      $scope.loadingResultados = false;
      $scope.resultadoIndice = indice;
      actualizar_vista_resultados($scope.resultados, indice);
    };
    $scope.loadingResultados = true;
    if (indice >= $scope.resultados.length) {
      $scope.buscarRecorridos(parseInt(indice/5)+1, end);
    }
    else {
      end();
    }
  }


  $scope.buscarA = function(a) {
    $scope.origenesSuggestions_loading = true;
    $scope.origenesSuggestions = null;
    $scope.modal_buscarA.show();
    Geocoder.search($scope.inputA).success(function(data){
      $scope.origenesSuggestions_loading = false;
      $scope.origenesSuggestions = data;
    }).error(function(){
      // TODO
    })
  }

  $scope.setOrigenSuggestion = function() {
    var sugg = $scope.origenesSuggestions[$scope.origenSelected];
    $scope.origenSelected = null;
    $scope.marcar({latlng:{lat:sugg.geom.coordinates[1],lng:sugg.geom.coordinates[0]}, text:sugg.nombre}, $scope.markerA);
  }

  // Form data for the login modal
  $scope.loginData = {};

  // Create the login modal that we will use later
  $ionicModal.fromTemplateUrl('modal-login.html', {
    scope: $scope
  }).then(function(modal) {
    $scope.modal = modal;
  });

  // Triggered in the login modal to close it
  $scope.closeLogin = function() {
    $scope.modal.hide();
  };

  // Open the login modal
  $scope.login = function() {
    $scope.modal.show();
  };

  // Perform the login action when the user submits the login form
  $scope.doLogin = function() {
    console.log('Doing login', $scope.loginData);

    // Simulate a login delay. Remove this and replace with your login
    // code if using a login system
    $timeout(function() {
      $scope.closeLogin();
    }, 1000);
  };


  $ionicModal.fromTemplateUrl('modal-ciudades.html', {scope: $scope}).then(function(modal) {
    $scope.modal_ciudades = modal;
    if ($scope.ciudad) $scope.init()
    else modal.show();
  });
  $ionicModal.fromTemplateUrl('modal-login.html'   , {scope: $scope}).then(function(modal) {
    $scope.modal_login    = modal;
  });
  $ionicModal.fromTemplateUrl('modal-favoritos.html', {scope: $scope}).then(function(modal) {
    $scope.modal_favoritos= modal;
  });
  $ionicModal.fromTemplateUrl('modal-buscarA.html', {scope: $scope}).then(function(modal) {
    $scope.modal_buscarA= modal;
  });

}

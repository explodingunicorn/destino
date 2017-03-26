/**
 * Created by Corey on 11/12/2016.
 */
var getRandomInt = function(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min)) + min;
};

var destino = (function() {
    var colors = [
        '#E03616',
        '#CFFFB0',
        '#5998C5',
        '#7FD1B9',
        '#EF767A',
        '#9CEC5B',
        '#FFF2F1'
    ];

    var Map = function() {
        this.width = 0;
        this.height = 0;
        this.origin = {};

        this.headNode;
        this.svg;

        this.initMap = function() {
            this.width = $(window).innerWidth();
            this.height = $(window).innerHeight();
            this.origin.x = this.width/2;
            this.origin.y = this.height/2;

            this.svg = d3.select('body').append('svg').attr('width', this.width).attr('height', this.height).attr('class', 'map');
        }
    };

    var Node = function(map) {
        this.origin = {};
        this.pos = {
            lat: 0,
            lng: 0
        };
        this.size = 0;
        this.rings = 0;
        this.color = "#E8D464";
        this.svg = map;

        this.key = "";
        this.googleObject;
        this.angle = 0;
        this.speed;
        this.children = [];

        this.initNode = function(x, y, size) {
            this.size = size;
            this.origin.x = x;
            this.origin.y = y;

            this.svg.attr('id', this.key).append('circle').attr('cx', this.origin.x).attr('cy', this.origin.y).attr('r', this.size).style('fill', this.color);
        };

        this.initRings = function() {
            if(typeof(this.rings) === "number") {
                for (var i = 0; i < this.rings; i++) {
                    this.svg.append('circle').attr('class','ring').attr('cx', this.origin.x).attr('cy', this.origin.y).attr('r', this.size + i*3).attr('fill', 'none').attr('stroke-width', 1).attr('stroke',this.color);
                }
            }
        };

        this.newChild = function(obj) {
            var newNode = new Node(this.svg.append('g').attr('class', 'planet'));
            var geom = newNode.googleObject = obj;
            var coord = newNode.calculateDistance(geom.geometry.location.lat(), geom.geometry.location.lng(), this.pos.lat, this.pos.lng, this.origin, 'K');
            newNode.speed = getRandomInt(1, 10);
            var size = obj.types.length;
            newNode.rings = Math.floor(obj.rating);
            newNode.key = obj.place_id;
            newNode.color = colors[getRandomInt(0, colors.length - 1)];
            newNode.initNode(coord.x, coord.y, size*2);
            newNode.initRings();
            this.children.push(newNode);
        };

        this.calculateDistance = function(lat1, lon1, lat2, lon2, origin, unit) {
            var radlat1 = Math.PI * lat1/180;
            var radlat2 = Math.PI * lat2/180;
            var theta = lon1-lon2;
            var radtheta = Math.PI * theta/180;
            var dist = Math.sin(radlat1) * Math.sin(radlat2) + Math.cos(radlat1) * Math.cos(radlat2) * Math.cos(radtheta);
            dist = Math.acos(dist);
            dist = dist * 180/Math.PI;
            dist = dist * 60 * 1.1515;
            if (unit=="K") { dist = dist * 1.609344 }
            if (unit=="N") { dist = dist * 0.8684 }

            dist = dist * 8;

            if (dist < size) {
                dist = getRandomInt(100, 200);
            } else if (dist > $(window).innerHeight()/2) {
                dist = getRandomInt(100, $(window).innerHeight() - 100);
            }

            var flipX = getRandomInt(0, 2);
            var flipY = getRandomInt(0, 2);

            if (flipX === 1) {
                flipX = 1;
            } else {
                flipX = -1;
            }

            if (flipY === 1) {
                flipY = 1;
            } else {
                flipY = -1;
            }

            var x = origin.x + (dist * flipX);
            var y = origin.y + (dist * flipY);

            return {
                x: x,
                y: y
            };
        };

        this.rotateChildren = function() {
            for(var i = 0; i < this.children.length; i++) {
                var angle = this.children[i].angle = this.children[i].angle + this.children[i].speed / 40;
                this.children[i].svg.attr('transform', "rotate(" + angle + "," + this.origin.x + "," + this.origin.y + ")");
            }
        }


    };

    var map = new Map();
    var size = 60;
    var center;

    var init = function() {
        map.initMap();
        center = map.headNode = new Node(map.svg.append('g').attr('class', 'universe'));
        map.headNode.initNode(map.origin.x, map.origin.y, size);
    };

    var createPlanet = function(obj) {
        center.newChild(obj);
    };

    var findPlanetInfo = function(id) {
        for (var i = 0; i < center.children.length; i++) {
            if (id === center.children[i].key) {
                return center.children[i].googleObject;
            }
        }
    };

    var animate = function() {
        center.rotateChildren();
        animating = requestAnimationFrame(animate);
    };

    return {
        init: init,
        createPlanet: createPlanet,
        animate: animate,
        findPlanetInfo: findPlanetInfo,
        map: map
    };
})();

var service;

var initMap = function(location) {
    destino.init();
    initParalax();
    limit = 0;

    var map = new google.maps.Map(document.getElementById('googleMap'), {
        center: {lat: -34.397, lng: 150.644},
        zoom: 6
    });
    if (location) {
        var geocoder = new google.maps.Geocoder();

        geocoder.geocode({'address': location}, function(results, status) {
            if (status == google.maps.GeocoderStatus.OK) {
                var pos = {
                    lat: results[0].geometry.location.lat(),
                    lng: results[0].geometry.location.lng()
                };

                destino.map.headNode.pos.lat = pos.lat;
                destino.map.headNode.pos.lng = pos.lng;

                map.setCenter(pos);

                var request = {
                    location: pos,
                    radius: '50000',
                    types: ['store']
                };

                service = new google.maps.places.PlacesService(map);
                service.nearbySearch(request, mapsCallback);
            }
        })
    } else {
        // Try HTML5 geolocation.
        console.log('No location');
    }
};

var limit = 0;
var selectedPlaces = [];
var shuffle = [];

for(var i = 0; i < 20; i++) {
    shuffle[i] = i;
}

var shuffleArray = function(array) {
    var currentIndex = array.length, temporaryValue, randomIndex;

    // While there remain elements to shuffle...
    while (0 !== currentIndex) {

        // Pick a remaining element...
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex -= 1;

        // And swap it with the current element.
        temporaryValue = array[currentIndex];
        array[currentIndex] = array[randomIndex];
        array[randomIndex] = temporaryValue;
    }

    return array;
};

shuffle = shuffleArray(shuffle);

var  mapsCallback = function(results, status) {
    if (status == google.maps.places.PlacesServiceStatus.OK) {
        destino.animate();

        for (var i = 0; i < 13; i++) {
            var place = results[shuffle[i]];
            console.log(place);
            selectedPlaces.push(place);
            destino.createPlanet(place);
        }

        // var detailsLoop = setInterval(function() {
        //     service.getDetails({placeId: results[shuffle[limit]].place_id}, getDetails);
        //     if(limit === 13) {
        //         clearInterval(detailsLoop);
        //     }
        //     limit++;
        // }, 300);
    }
};

var getDetails = function(place, status) {
    if(status == google.maps.places.PlacesServiceStatus.OK) {
        selectedPlaces.push(place);
        destino.createPlanet(place);
    } else {
        console.log(status);
    }
};

var showHoverDivLocal = function(obj) {
    var hoverDiv = $('.hoverDiv');
    hoverDiv.append('<h1>' + '{ ' + obj.name + ' }' + '</h1>');
};

var showHoverDivNational = function(string) {
    var hoverDiv = $('.hoverDiv');
    hoverDiv.append('<h1>' + '{ ' + string + ' }' + '</h1>');
}

var populatePlanetInfo = function() {
    var planetInfo = $('.planetInfo .info');
    $('.planetInfo').show();
    planetInfo.append('<h1>' + currentPlanetObj.name + '</h1>');
    planetInfo.append('<h2>' + currentPlanetObj.formatted_address + '</h2>');

    if(currentPlanetObj.rating) {
        planetInfo.append('<h2>' + 'Rating: ' + currentPlanetObj.rating + '/5' + '</h2>');
    }
};

var animating;
var currentPlanetObj;
$('.planetInfo').hide();
$('.destinoInfo').hide();
$('.inputDiv').hide();

$('body').on({
        mouseenter: function () {
            currentPlanetObj = destino.findPlanetInfo($(this).attr('id'));
            showHoverDivLocal(currentPlanetObj);
            cancelAnimationFrame(animating);
        },
        mouseleave: function () {
            $('.hoverDiv').empty();
            destino.animate();
        }
    }, '.planet'
);

var windowHeight = $(window).innerHeight();
var windowWidth = $(window).innerWidth();
var mousePos = {};


var initParalax = function() {
    var starsContainer = $('.stars');
    var starsTop = parseInt(starsContainer.css('top'));
    var starsLeft = parseInt(starsContainer.css('left'));

    $(document).mousemove(function (event) {

        var mouseX = mousePos.x = event.pageX;
        var mouseY = mousePos.y = event.pageY;
        var posX = (windowWidth / 2 - mouseX);
        var posY = (windowHeight / 2 - mouseY);

        var universeContainer = $('.map');

        universeContainer.css('top', posY / 10);
        universeContainer.css('left', posX / 10);

        starsContainer.css('top', starsTop - posY / 100);
        starsContainer.css('left', starsLeft - posX / 100);
    });
};

$('body').on('click', '.planet', function() {
    if (!$('.planetInfo').hasClass('open')) {
        populatePlanetInfo();
        $('.planetInfo').toggleClass('open');
    } else {
        $('.planetInfo .info').empty();
        populatePlanetInfo();
    }


});

$('body').on('click', '.planetInfoClose', function() {
    $('.planetInfo').hide();
    $('.planetInfo .info').empty();
});

$('.infoContainer h2').click(function() {
    $('.planetInfo').hide();
    $('.destinoInfo').show();
});

$('.aboutClose').click(function() {
    $('.destinoInfo').hide();
});

$('.changeLocation').click(function() {
    $('.inputDiv').show();
    $('.inputDiv input').val($('.currentLocation').text());
});

$('.getText').click(function() {
    $('.map').addClass('fadeOut');
    setTimeout(function() {
        $('.map').remove();
        cancelAnimationFrame(animating);
        $('.currentLocation').text($('.inputDiv input').val());
        initMap($('.inputDiv input').val());
    }, 990);
    $('.inputDiv').hide();
});

$.getJSON('./cities.json', function(data) {
    d3.select('body').append('svg').attr('class', 'stars');
    createStars(data);
    var randomData = data[getRandomInt(0, data.length)];
    var str = randomData.name + ', ' + randomData.subcountry;
    $('.currentLocation').text(str);
    initMap(str);
});

var createStars = function(cities) {
    for (var i = 0; i < cities.length; i++) {
        var randX = getRandomInt(-300, windowWidth + 300);
        var randY = getRandomInt(-300, windowHeight + 300);
        d3.select('.stars').append('circle').attr('r', 2).attr('cx', randX).attr('cy', randY).attr('fill', "#E8D464").style('opacity', '.2').attr('id', cities[i].name + ',' + cities[i].subcountry).attr('class', 'star');
    }
};

$('body').on('click', '.star', function() {
    var str = $(this).attr('id');
    str = str.replace(',', ', ');

    $('.map').addClass('fadeOut');
    setTimeout(function() {
        $('.map').remove();
        cancelAnimationFrame(animating);
        $('.currentLocation').text(str);
        initMap(str);
    }, 990);
});

$('body').on({
        mouseenter: function () {
            var str = $(this).attr('id');
            str = str.replace(',', ', ');
            showHoverDivNational(str);
        },
        mouseleave: function () {
            $('.hoverDiv').empty();
        }
    }, '.star'
);
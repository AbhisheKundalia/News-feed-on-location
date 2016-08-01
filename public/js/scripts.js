/* global google */
/* global _ */
/**
 * scripts.js
 *
 * Computer Science 50
 * Problem Set 8
 *
 * Global JavaScript.
 */

// Google Map
var map;

// markers for map
var markers = [];

// info window
var info = new google.maps.InfoWindow();

var pos ={lat: 37.4236, lng: -122.1619};
var allowGeo = false;

//geolocating
function geolocate()
{
    if (navigator.geolocation) 
    {
        navigator.geolocation.getCurrentPosition(function(position) 
            {
                //store the present location of user
                window.pos = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude
                };
                
                // Setup geo locating icon
                if(window.allowGeo == false)
                {
                    // Create the DIV to hold the control and call the constructor passing in this DIV
                    var geolocationDiv = document.createElement('div');
                    var geolocationControl = new GeolocationControl(geolocationDiv, map);

                    map.controls[google.maps.ControlPosition.TOP_CENTER].push(geolocationDiv);
                    //to show that Geo-locating is available
                    window.allowGeo = true;
                }
                
                map.setCenter(pos);
                update();
                },
            function()
            {
                handleLocationError(true, info, map.getCenter());
            }
        );
    }
    else 
    {
        // Browser doesn't support Geolocation
        handleLocationError(false, info, map.getCenter());
    }
      

    function handleLocationError(browserHasGeolocation, infoWindow, pos) {
        info.setPosition(pos);
        info.setContent(browserHasGeolocation ?'Error: The Geolocation service failed.' :'Error: Your browser doesn\'t support geolocation.');
    }
    
}

//Geolocate button
function GeolocationControl(controlDiv, map) {

    // Set CSS for the control button
    var controlUI = document.createElement('div');
    controlUI.style.backgroundColor = '#444';
    controlUI.style.borderStyle = 'solid';
    controlUI.style.borderWidth = '1px';
    controlUI.style.borderColor = 'white';
    controlUI.style.height = '28px';
    controlUI.style.marginTop = '5px';
    controlUI.style.cursor = 'pointer';
    controlUI.style.textAlign = 'center';
    controlUI.title = 'Click to center map on your location';
    controlDiv.appendChild(controlUI);

    // Set CSS for the control text
    var controlText = document.createElement('div');
    controlText.style.fontFamily = 'Arial,sans-serif';
    controlText.style.fontSize = '10px';
    controlText.style.color = 'white';
    controlText.style.paddingLeft = '10px';
    controlText.style.paddingRight = '10px';
    controlText.style.marginTop = '8px';
    controlText.innerHTML = 'Center map on your location';
    controlUI.appendChild(controlText);

    // Setup the click event listeners to geolocate user
    google.maps.event.addDomListener(controlUI, 'click', geolocate);
}

// execute when the DOM is fully loaded
$(function(){
    //geolocate and move map center to that
    geolocate();
    
    
    var styles = [

        // hide Google's labels
        {
            featureType: "all",
            elementType: "labels",
            stylers: [
                {visibility: "off"}
            ]
        },

        // hide roads
        {
            featureType: "road",
            elementType: "geometry",
            stylers: [
                {visibility: "off"}
            ]
        }

    ];
    

    // options for map
    // https://developers.google.com/maps/documentation/javascript/reference#MapOptions
    var options = {
        center: {lat: 37.4236, lng: -122.1619}, // Stanford, California
        //center: pos, 
        disableDefaultUI: true,
        mapTypeId: google.maps.MapTypeId.ROADMAP,
        maxZoom: 14,
        panControl: true,
        styles: styles,
        zoom: 13,
        zoomControl: true
    };

    // get DOM node in which map will be instantiated
    var canvas = $("#map-canvas").get(0);

    // instantiate map
    map = new google.maps.Map(canvas, options);
    
    


    
    
    // configure UI once Google Map is idle (i.e., loaded)
    google.maps.event.addListenerOnce(map, "idle", configure);
    
});

/**
 * Adds marker for place to map.
 */
function addMarker(place)
{
    
    // TODO
    // console.log(place);
    // template for marker label to avoid comma if next value is missing
    var tem =  _.template("<%- place_name %>"+"<%if(admin_name1 !== '') { print(', '+admin_name1)} %>");
    var myLatlng = new google.maps.LatLng(place.latitude,place.longitude);
    
    //adds marker with label
    var marker = new MarkerWithLabel({
        position: myLatlng,
        draggable: false,
        map: map,
        labelContent: tem({place_name: place.place_name, admin_name1: place.admin_name1}),
        labelAnchor: new google.maps.Point(22, 0),
        labelClass: "labels", // the CSS class for the label
        labelStyle: {opacity: 0.75}
    });
    
    //for showing news info dialog
    google.maps.event.addListener(marker,"click",function()
    {
        //to show the loading sign till the data is retrieved
        showInfo(marker);
        $.getJSON("articles.php",{geo:place.postal_code}).done(function(data,textStatus,jqXHR){
            if(data.length===0)
            {
                showInfo(marker,"Slow news day!");
                
            }
            else
            {
                var ul="<ul>";
                //var template=_.template("<li><a href='<%- link %>' target='_blank'><%- title %></a></li>");
                for(var i=0;i<data.length;i++)
                {
                    //ul+=template({link:data[i].link,title:data[i].title});
                
                    ul+="<li><a href='"+data[i].link+"' target='_blank'>"+data[i].title+"</a></li>";
                }
                ul+="</ul>";
                showInfo(marker,ul);
            }
        }).fail(function(jqXHR,textStatus,errorThrown)
        {
            console.log(errorThrown.toString());
            
        });
        
    });
    
    //adding marker to the list of markers
    markers.push(marker);
}

/**
 * Configures application.
 */
function configure()
{
    // update UI after map has been dragged
    google.maps.event.addListener(map, "dragend", function() {
        update();
    });

    // update UI after zoom level changes
    google.maps.event.addListener(map, "zoom_changed", function() {
        update();
    });

    // remove markers whilst dragging
    google.maps.event.addListener(map, "dragstart", function() {
        removeMarkers();
    });

    // configure typeahead
    // https://github.com/twitter/typeahead.js/blob/master/doc/jquery_typeahead.md
    $("#q").typeahead({
        autoselect: true,
        highlight: true,
        minLength: 1
    },
    {
        source: search,
        templates: {
            empty: "no places found yet",
            suggestion: _.template("<p>"+"<span class='place_name'><%- place_name %>"+"<%if(admin_name3 !== '') { print(', '+admin_name3)} %>"+"<%if(admin_name2 !== '') { print(', '+admin_name2)} %>"+"<%if(admin_name1 !== '') { print(', '+admin_name1)} %>"+"</span> <span class='postal_code'><%- postal_code %></span>"+"</p>")
        }
    });

    // re-center map after place is selected from drop-down
    $("#q").on("typeahead:selected", function(eventObject, suggestion, name) {

        // ensure coordinates are numbers
        var latitude = (_.isNumber(suggestion.latitude)) ? suggestion.latitude : parseFloat(suggestion.latitude);
        var longitude = (_.isNumber(suggestion.longitude)) ? suggestion.longitude : parseFloat(suggestion.longitude);

        // set map's center
        map.setCenter({lat: latitude, lng: longitude});

        // update UI
        update();
    });

    // hide info window when text box has focus
    $("#q").focus(function(eventData) {
        hideInfo();
    });

    // re-enable ctrl- and right-clicking (and thus Inspect Element) on Google Map
    // https://chrome.google.com/webstore/detail/allow-right-click/hompjdfbfmmmgflfjdlnkohcplmboaeo?hl=en
    document.addEventListener("contextmenu", function(event) {
        event.returnValue = true; 
        event.stopPropagation && event.stopPropagation(); 
        event.cancelBubble && event.cancelBubble();
    }, true);

    // update UI
    update();

    // give focus to text box
    $("#q").focus();
}

/**
 * Hides info window.
 */
function hideInfo()
{
    info.close();
}

/**
 * Removes markers from map.
 */
function removeMarkers()
{
    //removing each marker from map
    for (var i = 0; i < markers.length; i++)
    {
         markers[i].setMap(null);

    }
    //emptying the markers array
    markers.length = 0;
}

/**
 * Searches database for typeahead's suggestions.
 */
function search(query, cb)
{
    // get places matching query (asynchronously)
    var parameters = {
        geo: query
    };
    $.getJSON("search.php", parameters)
    .done(function(data, textStatus, jqXHR) {

        // call typeahead's callback with search results (i.e., places)
        cb(data);
    })
    .fail(function(jqXHR, textStatus, errorThrown) {

        // log error to browser's console
        console.log(errorThrown.toString());
    });
}

/**
 * Shows info window at marker with content.
 */
function showInfo(marker, content)
{
    // start div
    var div = "<div id='info'>";
    if (typeof(content) === "undefined")
    {
        // http://www.ajaxload.info/
        div += "<img alt='loading' src='img/ajax-loader.gif'/>";
    }
    else
    {
        div += content;
    }

    // end div
    div += "</div>";

    // set info window's content
    info.setContent(div);

    // open info window (if not already open)
    info.open(map, marker);
}

/**
 * Updates UI's markers.
 */
function update() 
{
    // get map's bounds
    var bounds = map.getBounds();
    var ne = bounds.getNorthEast();
    var sw = bounds.getSouthWest();
    var parameters;
    //console.log(pos);
    
   
    
    // get places within bounds (asynchronously)
    parameters = {
        ne: ne.lat() + "," + ne.lng(),
        q: $("#q").val(),
        sw: sw.lat() + "," + sw.lng(),
       };
    
    // check if the current location of the user is allowed
    if(window.allowGeo == true)
    {
        //if the current position of user is in the window of user set the current lat and lng in parameters 
        if((window.pos.lat >= sw.lat() && window.pos.lat <= ne.lat()) || (window.pos.lng >= sw.lng() && window.pos.lng <= ne.lng()))
        {
            parameters ['geolat']= window.pos.lat;
            parameters ['geolng']= window.pos.lng;
        }
    } 
    
    //ajax to get the array of data for present visible map
    $.getJSON("update.php", parameters)
    .done(function(data, textStatus, jqXHR) {
        
        // remove old markers from map
        removeMarkers();
        
        // add new markers to map
        for (var i = 0; i < data.length; i++)
        {
            addMarker(data[i]);
        }
        
    }
        
)
     .fail(function(jqXHR, textStatus, errorThrown) {

         // log error to browser's console
         console.log(errorThrown.toString());
     });
}
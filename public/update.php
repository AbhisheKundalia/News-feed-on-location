<?php

    require(__DIR__ . "/../includes/config.php");

    // ensure proper usage
    if (!isset($_GET["sw"], $_GET["ne"]))
    {
        http_response_code(400);
        exit;
    }

    // ensure each parameter is in lat,lng format
    if (!preg_match("/^-?\d+(?:\.\d+)?,-?\d+(?:\.\d+)?$/", $_GET["sw"]) ||
        !preg_match("/^-?\d+(?:\.\d+)?,-?\d+(?:\.\d+)?$/", $_GET["ne"]))
    {
        http_response_code(400);
        exit;
    }
    

    // explode southwest corner into two variables
    list($sw_lat, $sw_lng) = explode(",", $_GET["sw"]);

    // explode northeast corner into two variables
    list($ne_lat, $ne_lng) = explode(",", $_GET["ne"]);

    // find 10 cities within view, pseudorandomly chosen if more within view
    if ($sw_lng <= $ne_lng)
    {
        // doesn't cross the antimeridian
        $rows = CS50::query("SELECT * FROM places WHERE ? <= latitude AND latitude <= ? AND (? <= longitude AND longitude <= ?) GROUP BY country_code, place_name, admin_code1 ORDER BY RAND() LIMIT 10", $sw_lat, $ne_lat, $sw_lng, $ne_lng);
    }
    else
    {
        // crosses the antimeridian
        $rows = CS50::query("SELECT * FROM places WHERE ? <= latitude AND latitude <= ? AND (? <= longitude OR longitude <= ?) GROUP_BY country_code, place_name, admin_code1 ORDER BY RAND() LIMIT 10", $sw_lat, $ne_lat, $sw_lng, $ne_lng);
    }

    // output places as JSON (pretty-printed for debugging convenience)
    header("Content-type: application/json");
    $json=json_encode($rows, JSON_PRETTY_PRINT);
    
    //add values for present location to JSON object
    if(isset($_GET["geolat"]) && isset($_GET["geolng"]))
    {
        $jsondecode=json_decode($json,true);
        $count=count($jsondecode);
        $jsondecode[$count]['latitude']= $_GET["geolat"];
        $jsondecode[$count]['longitude']= $_GET["geolng"];
        $jsondecode[$count]['place_name']= "You!!";
        //admin_name1 for the marker label
        $jsondecode[$count]['admin_name1']= "";
        
        //print_r($jsondecode);
        $rows = CS50::query("SELECT  `postal_code` FROM  `places` WHERE ( latitude =  ? OR longitude = ?)",(intval(($_GET["geolat"]*100))/100).'%',(intval(($_GET["geolat"]*100))/100).'%');
        
        //check if the postal code returned value to rows successfully
        if($rows)
        {
            //Set geolocation marker postal code as value retrieved from query
            $jsondecode[$count]['postal_code']= $rows[0]['postal_code'];  
        }
        else
        {
            
            //postal_code(of just previous marker) for the infoWindow of news
            $jsondecode[$count]['postal_code'] =  $jsondecode[$count - 1]['postal_code'];
        }
        
        //print_r($jsondecode);
        $json=json_encode($jsondecode, JSON_PRETTY_PRINT);
    }
    //print_r(get_defined_vars());
    print($json);

?>
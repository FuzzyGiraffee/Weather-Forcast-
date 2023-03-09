const OPENWEATHERMAP_FORECAST_ENDPOINT = 'https://api.openweathermap.org/data/2.5/forecast';
const OPENWEATHERMAP_GEOLOCATION_ENDPOINT = 'https://api.openweathermap.org/geo/1.0/direct';
const OPENWEATHERMAP_KEY = '29d73e8fa2cce3052535c1cc8be2f673';

let getGeoResults = async (city, state, country) => {
    // ISO-3166 location. If `country` is `us`, then `state` is required
    let locationString = `${city},${country}`;
    if (country.toLowerCase() === 'us') {
        locationString = `${city},${state},${country}`;
    }

    let completed_url = `${OPENWEATHERMAP_GEOLOCATION_ENDPOINT}?q=${locationString}&appid=${OPENWEATHERMAP_KEY}`;
    let res = await fetch(completed_url);

    let bodyObject = await res.json();
    return bodyObject;
}

let getCoordsFromIso = async (city, state, country) => {
    let bodyObject = await getGeoResults(city, state, country);
    // assume [0] is the city we want.
    let result = {};
    if (bodyObject[0]['country'] === 'US') { result = { 'lat': bodyObject[0]['lat'], 'lon': bodyObject[0]['lon'], 'city': bodyObject[0]['name'] } }
    else { result = { 'lat': bodyObject[0]['lat'], 'lon': bodyObject[0]['lon'], 'city': bodyObject[0]['name'] } }
    return result;
}

let getForecast = async (lat, lon) => {
    let completed_url = `${OPENWEATHERMAP_FORECAST_ENDPOINT}?lat=${lat}&lon=${lon}&&cnt=41&appid=${OPENWEATHERMAP_KEY}`;
    return await (await fetch(completed_url)).json();
}



let showForecast = async (lat, lon) => {
    const delay = ms => new Promise(res => setTimeout(res, ms)); // https://stackoverflow.com/a/47480429
    $('#current').children().remove();
    $('#forecast').children().remove();
    $('#current').append($('<h2>Fetching data, please wait...</h2>'));
    retry_count = 5;
    while (retry_count > 0) {
        try {
            let result = await getForecast(lat, lon);
            renderForecast(result);
            retry_count = 0;
            return;
        } catch {
            retry_count--;
            $('#current').children().remove();
            $('#current').append($(`<h2>Fetching data failed. Retrying (${retry_count} attmempts left)...</h2>`));
            await delay(2000);
        }
        $('#current').append($(`<h2>Fetching data failed and no retries left. Check your internet connection.</h2>`));
    }
}

addEventListener('load', async (e) => {
    if (localStorage.getItem("runonce") === null) {
        firstTimeInit();
    }
    let prevCities = JSON.parse(localStorage.getItem('seen'));
    $('#previous_cities').on('click', '', (e) => {
        showForecast(e.target.dataset.lat, e.target.dataset.lon)
        $('#previous_cities').prepend($(e.target));
        let known_cities = [];
        $('#previous_cities').children().each(( i, e ) => {
            $e = $(e)
            known_cities.push({lat: $e.data('lat'), lon: $e.data('lon'), city: $e.text()})
        })
        localStorage.setItem('current', JSON.stringify(known_cities[0]))
        localStorage.setItem('seen', JSON.stringify(known_cities))

    })
    prevCities.forEach(dat => {
        $('#previous_cities').append(
            $(
                `<button type="button" class="btn btn-secondary previous" data-lat="${dat.lat}" data-lon="${dat.lon}">${dat.city}</button>`
            )
        );
    });


    let currentLocation = JSON.parse(localStorage.getItem('current'));

    showForecast(currentLocation.lat, currentLocation.lon);
})

let searchAndShow = async () => {
    let city = $('#city_text').val();
    let city_geo = await getCoordsFromIso(city, '', 'us')
    $('#previous_cities').prepend(
        $(
            `<button type="button" class="btn btn-secondary previous" data-lat="${city_geo.lat}" data-lon="${city_geo.lon}">${city_geo.city}</button>`
        )
    );
    showForecast(city_geo.lat, city_geo.lon)
    let known_cities = [];
    $('#previous_cities').children().each(( i, e ) => {
        $e = $(e)
        known_cities.push({lat: $e.data('lat'), lon: $e.data('lon'), city: $e.text()})
    })
    localStorage.setItem('current', JSON.stringify(known_cities[0]))
    localStorage.setItem('seen', JSON.stringify(known_cities))
}

let renderForecast = async (forecastData) => {
    let temp = forecastData.list[0].main.temp
    temp = ktof(temp).toFixed(2)
    let city_name = forecastData.city.name
    let current_weather = forecastData.list[0]
    $('#current').children().remove()
    $('#forcast').children().remove()
    $('#current').append(
        $(`
        <h2>${city_name} (${new Date(current_weather.dt_txt).toLocaleDateString()})<img src="https://openweathermap.org/img/wn/${current_weather.weather[0].icon}.png"></img></h2>
        <span class="temp">Temp: ${ktof(current_weather.main.temp).toFixed(2)}&deg;F</span><br>
        <span class="wind">Wind: ${current_weather.wind.speed} MPH</span><br>
        <span class="humid">Humidity: ${current_weather.main.humidity}%</span><br>
        `
        )
    )
    $('#forecast').append($(`<h2>5-Day Forecast</h2>`))
    let forecastArr = [forecastData.list[7], forecastData.list[15], forecastData.list[23], forecastData.list[31], forecastData.list[39]]
    forecastArr.forEach(weather_entry => {
        $('#forecast').append(
            $(`
            <div class="forecast-block">
                <span class="day">${new Date(weather_entry.dt_txt).toLocaleDateString()}<img src="https://openweathermap.org/img/wn/${weather_entry.weather[0].icon}.png"></img></span><br>
                <span class="temp">Temp: ${ktof(weather_entry.main.temp).toFixed(2)}&deg;F</span><br>
                <span class="wind">Wind: ${weather_entry.wind.speed} MPH</span><br>
                <span class="humid">Humidity: ${weather_entry.main.humidity}%</span><br>
            </div>
        `)
        );
    })
}

let firstTimeInit = async () => {
    localStorage.clear();
    seenCities = [
        { lat: 33.7489924, lon: -84.3902644, city: 'Atlanta' },
        { lat: 34.0536909, lon: -118.242766, city: 'Los Angeles' },
        { lat: 40.7127281, lon: -74.0060152, city: 'New York' },
        { lat: 29.7589382, lon: -95.3676974, city: 'Houston' },
    ];
    localStorage.setItem('seen', JSON.stringify(seenCities));
    localStorage.setItem('current', JSON.stringify(seenCities[0]))
    localStorage.setItem("runonce", true);
}

let ktof = (k) => { return (k - 273.15) * 1.8 + 32 }
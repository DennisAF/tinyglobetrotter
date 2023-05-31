mapboxgl.accessToken = 'pk.eyJ1IjoiZGVuemVybiIsImEiOiJjbDJnbnZndnIwNTA5M2luejE5b2lkamliIn0.VSMPKp2PdR4oPFBQwSrznw';

const map = new mapboxgl.Map({
  container: 'map',
  style: 'mapbox://styles/mapbox/streets-v12',
  center: [-74.5, 40],
  zoom: 2
});

let index = 0; // Index of the current country to fly to
let countries = []; // Array to hold country data

let userInteracting = false;
let spinEnabled = true;

const secondsPerRevolution = 120;
const maxSpinZoom = 5;
const slowSpinZoom = 3;

// Get the modal
var modal = document.getElementById("modal");

// Get the <span> element that closes the modal
var span = document.getElementsByClassName("close-button")[0];

// When the user clicks on <span> (x), close the modal
span.onclick = function() {
  modal.style.display = "none";
}

// When the user clicks anywhere outside of the modal, close it
window.onclick = function(event) {
  if (event.target == modal) {
    modal.style.display = "none";
  }
}

function spinGlobe() {
  const zoom = map.getZoom();
  if (spinEnabled && !userInteracting && zoom < maxSpinZoom) {
    let distancePerSecond = 360 / secondsPerRevolution;
    if (zoom > slowSpinZoom) {
      const zoomDif = (maxSpinZoom - zoom) / (maxSpinZoom - slowSpinZoom);
      distancePerSecond *= zoomDif;
    }
    const center = map.getCenter();
    center.lng -= distancePerSecond;
    map.easeTo({ center, duration: 1000, easing: (n) => n });
  }
}

map.on('load', function() {
  fetch('https://restcountries.com/v3.1/all')
    .then(response => response.json())
    .then(data => {
      countries = data.map(country => ({
        name: country.cca3,
        capital: country.capital && country.capital[0] ? country.capital[0] : 'N/A',
        countryName: country.name.common,
        flags: [country.flags.png],
        languages: Object.values(country.languages || {}), // Official languages
        population: country.population, // Population
        area: country.area, // Area/Size
        region: country.region, // Continent
        currencies: Object.values(country.currencies || {}).map(c => c.name) // Currency
      }));
      

      map.addSource('country-boundaries', {
        type: 'vector',
        url: 'mapbox://mapbox.country-boundaries-v1'
      });

      map.addLayer({
        id: 'country-boundaries',
        source: 'country-boundaries',
        'source-layer': 'country_boundaries',
        type: 'fill',
        paint: {
          'fill-color': 'transparent',
        }
      });

      map.addLayer({
        id: 'highlighted-country',
        source: 'country-boundaries',
        'source-layer': 'country_boundaries',
        type: 'fill',
        paint: {
          'fill-color': '#d2361e',
          'fill-opacity': 0.6,
        },
        filter: ["in", "iso_3166_1_alpha_3", ""]
      });

      spinGlobe();
    });
});

// New click event listener for the map
map.on('click', function(e) {
  const features = map.queryRenderedFeatures(e.point, { layers: ['country-boundaries'] });

  if (!features.length) {
    return;
  }

  const clickedCountry = features[0];
  
  // Check if the clicked country exists in your countries list
  const country = countries.find(country => country.name === clickedCountry.properties.iso_3166_1_alpha_3);
  
  if (country) {
    flyToAndHighlightCountry(country);
  }
});

map.on('mousedown', () => {
  userInteracting = true;
});

map.on('mouseup', () => {
  userInteracting = false;
  spinGlobe();
});

map.on('dragend', () => {
  userInteracting = false;
  spinGlobe();
});

map.on('pitchend', () => {
  userInteracting = false;
  spinGlobe();
});

map.on('rotateend', () => {
  userInteracting = false;
  spinGlobe();
});

map.on('moveend', () => {
  spinGlobe();
});

document.getElementById('btn-spin').addEventListener('click', (e) => {
  spinEnabled = !spinEnabled;
  if (spinEnabled) {
    spinGlobe();
    e.target.innerHTML = 'Freeze';
  } else {
    map.stop();
    e.target.innerHTML = 'Spin';
  }
});

function flyToAndHighlightCountry(country) {
  const infoDiv = document.getElementById('info');
  
  let flagHTML = `<img src="${country.flags[0]}" alt="Flag of ${country.countryName}" width="100" />`;

  // Construct the string for languages
  let languagesHTML = country.languages.join(', ');

  // Construct the string for currencies
  let currenciesHTML = country.currencies.join(', ');

  // Prepare the languages string
  let languagesArr = Object.values(country.languages || {});
  let languagesStr = '';
  for (let i = 0; i < languagesArr.length; i++) {
    languagesStr += languagesArr[i];
    if ((i + 1) % 2 === 0 && i !== languagesArr.length - 1) {
      languagesStr += '<br>'; // Add a line break after every two languages
    } else if (i !== languagesArr.length - 1) {
      languagesStr += ', ';
    }
  }

  infoDiv.innerHTML = `<div>${flagHTML}</div>
                       <h2>${country.countryName}</h2>
                       <p>Capital: ${country.capital}</p>
                       <p><b>Official Languages:</b> ${languagesStr}</p>
                       <p>Population: ${country.population.toLocaleString()}</p>
                       <p>Area: ${country.area.toLocaleString()} sq km</p>
                       <p>Continent: ${country.region}</p>
                       <p>Currency: ${currenciesHTML}</p>`;

  if (country.capital === 'N/A') return;

  spinEnabled = false;
  document.getElementById('btn-spin').innerHTML = 'Spin';

  fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${country.capital}.json?access_token=${mapboxgl.accessToken}`)
    .then(response => response.json())
    .then(data => {
      const coordinates = data.features[0].center;

      map.flyTo({
        center: coordinates,
        essential: true
      });

      map.setFilter('highlighted-country', ["in", "iso_3166_1_alpha_3", country.name]);

      document.getElementById('fly-back').style.display = 'block';

      infoDiv.style.opacity = '1';
    });
}

document.getElementById('fly').addEventListener('click', () => {
  const country = countries[index % countries.length];
  index++;
  flyToAndHighlightCountry(country);
});

document.getElementById('fly-back').addEventListener('click', () => {
  index -= 2;
  if (index < 0) index = countries.length - 1;
  const country = countries[index % countries.length];
  index++;
  flyToAndHighlightCountry(country);
});
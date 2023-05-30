mapboxgl.accessToken = 'pk.eyJ1IjoiZGVuemVybiIsImEiOiJjbDJnbnZndnIwNTA5M2luejE5b2lkamliIn0.VSMPKp2PdR4oPFBQwSrznw';
const map = new mapboxgl.Map({
  container: 'map',
  style: 'mapbox://styles/mapbox/streets-v12',
  center: [-74.5, 40],
  zoom: 2
});

let index = 0; // Index of the current country to fly to
let countries = []; // Array to hold country data

map.on('load', function() {
  fetch('https://restcountries.com/v3.1/all')
    .then(response => response.json())
    .then(data => {
      countries = data.map(country => ({
        name: country.cca3,
        capital: country.capital && country.capital[0] ? country.capital[0] : 'N/A',
        countryName: country.name.common
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
    });
});

function flyToAndHighlightCountry(country) {
  const infoDiv = document.getElementById('info');
  infoDiv.textContent = `Country: ${country.countryName}, Capital: ${country.capital}`;

  if (country.capital === 'N/A') return;

  fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${country.capital}.json?access_token=${mapboxgl.accessToken}`)
    .then(response => response.json())
    .then(data => {
      const coordinates = data.features[0].center;

      map.flyTo({
        center: coordinates,
        essential: true
      });

      map.setFilter('highlighted-country', ["in", "iso_3166_1_alpha_3", country.name]);

      // Show the 'Fly Back' button once the 'Fly' button is pressed
      document.getElementById('fly-back').style.display = 'block';

      // Make the info element visible
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

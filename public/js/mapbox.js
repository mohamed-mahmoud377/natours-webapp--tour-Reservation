
 export const displayMap = locations => {
  mapboxgl.accessToken =
      'pk.eyJ1IjoiamVycnkzNzciLCJhIjoiY2trZGJxMjdyMDg0YjJ2bW5zaGF2NHM5ayJ9.m-PD68x_5hN9o2H9B8oLJQ';

  var map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/jerry377/ckxxbdszocq1414peouwbfd6i',
    scrollZoom: false
    // center: [-118.113491, 34.111745],
    // zoom: 10,
    // interactive: false
  });

  const bounds = new mapboxgl.LngLatBounds();

  locations.forEach(loc => {
    // Create marker
    const el = document.createElement('div');
    el.className = 'marker';

    // Add marker
    new mapboxgl.Marker({
      element: el,
      anchor: 'bottom'
    })
      .setLngLat(loc.coordinates)
      .addTo(map);

    // Add popup
    new mapboxgl.Popup({
      offset: 30
    })
      .setLngLat(loc.coordinates)
      .setHTML(`<p>Day ${loc.day}: ${loc.description}</p>`)
      .addTo(map);

    // Extend map bounds to include current location
    bounds.extend(loc.coordinates);
  });

  map.fitBounds(bounds, {
    padding: {
      top: 200,
      bottom: 150,
      left: 100,
      right: 100
    }
  });
};

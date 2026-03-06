import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

serve(async (req) => {
  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    // Only allow POST requests
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Parse request body
    const body = await req.json();
    console.log('Request body:', body);

    const { latitude, longitude, radius } = body;

    console.log('Parsed parameters:', { latitude, longitude, radius, latitudeType: typeof latitude, longitudeType: typeof longitude, radiusType: typeof radius });

    if (latitude === undefined || longitude === undefined || radius === undefined) {
      console.log('Missing required parameters');
      return new Response(
        JSON.stringify({ error: 'Missing required parameters: latitude, longitude, radius' }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Get Ticketmaster API key from environment
    const apiKey = Deno.env.get('TICKETMASTER_API_KEY');

    if (!apiKey) {
      console.error('Ticketmaster API key not configured');
      return new Response(
        JSON.stringify({ error: 'API configuration error' }),
        { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    console.log('🎫 Fetching Ticketmaster events for:', { latitude, longitude, radius });

    // Build Ticketmaster API URL
    const currentDate = new Date().toISOString();
    const url = `https://app.ticketmaster.com/discovery/v2/events.json?apikey=${apiKey}&latlong=${latitude},${longitude}&radius=${radius}&unit=km&startDateTime=${currentDate}&size=20`;

    console.log('Ticketmaster API URL:', url.replace(apiKey, '[REDACTED]'));

    // Fetch from Ticketmaster API
    const response = await fetch(url);

    if (!response.ok) {
      console.error(`Ticketmaster API error: ${response.status} ${response.statusText}`);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch events from Ticketmaster' }),
        { status: response.status, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    const data = await response.json();
    console.log('Ticketmaster API response received');

    if (!data._embedded?.events || !Array.isArray(data._embedded.events)) {
      console.log('No events found in Ticketmaster response');
      return new Response(
        JSON.stringify({ events: [] }),
        { headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    }

    // Map Ticketmaster events to our format
    const events = data._embedded.events.map((event: any) => {
      // Extract venue coordinates if available
      let eventLat = latitude;
      let eventLon = longitude;
      let address = '';

      if (event._embedded?.venues?.[0]) {
        const venue = event._embedded.venues[0];
        if (venue.location) {
          eventLat = parseFloat(venue.location.latitude);
          eventLon = parseFloat(venue.location.longitude);
        }
        if (venue.address) {
          address = [
            venue.address.line1,
            venue.address.line2,
            venue.address.city,
            venue.address.stateCode,
            venue.address.postalCode,
            venue.address.countryCode
          ].filter(Boolean).join(', ');
        }
      }

      // Map Ticketmaster category to our categories
      let category = 'other';
      if (event.classifications?.[0]) {
        const classification = event.classifications[0];
        if (classification.segment?.name) {
          const segmentName = classification.segment.name.toLowerCase();
          if (segmentName.includes('music') || segmentName.includes('concert')) category = 'music';
          else if (segmentName.includes('sports')) category = 'sports';
          else if (segmentName.includes('arts') || segmentName.includes('theater')) category = 'art';
          else if (segmentName.includes('food') || segmentName.includes('drink')) category = 'food';
          else if (segmentName.includes('technology') || segmentName.includes('science')) category = 'technology';
          else if (segmentName.includes('education')) category = 'education';
          else if (segmentName.includes('community') || segmentName.includes('culture')) category = 'community';
          else if (segmentName.includes('fitness') || segmentName.includes('health')) category = 'fitness';
        }
      }

      return {
        id: `ticketmaster_${event.id}`,
        title: event.name || 'Untitled Event',
        description: event.description?.html || event.info || event.pleaseNote || '',
        category: category,
        latitude: eventLat,
        longitude: eventLon,
        address: address,
        startTime: event.dates?.start?.dateTime || event.dates?.start?.localDate || new Date().toISOString(),
        endTime: event.dates?.end?.dateTime || event.dates?.end?.localDate,
        attendeeCount: undefined, // Ticketmaster doesn't provide capacity in public API
        source: 'ticketmaster'
      };
    });

    console.log(`🎫 Returning ${events.length} Ticketmaster events`);

    return new Response(
      JSON.stringify({ events }),
      { headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );

  } catch (error) {
    console.error('Error in fetch-ticketmaster-events function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }
});

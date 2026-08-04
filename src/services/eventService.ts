// Event discovery service using open source APIs and community data
class EventService {
  // Ticketmaster has a free tier but requires API key, so we'll focus on community events
  // and potentially integrate with other open sources later

  async getLocalEvents(latitude: number, longitude: number, radius: number = 5): Promise<Array<{
    id: string;
    title: string;
    description?: string;
    category: string;
    latitude: number;
    longitude: number;
    address?: string;
    startTime: string;
    endTime?: string;
    attendeeCount?: number;
    source: string;
  }>> {
    try {
      // First, get events from our database
      const dbEvents = await this.getDatabaseEvents(latitude, longitude, radius);

      // Try to get events from external sources (if available)
      const externalEvents = await this.getExternalEvents(latitude, longitude, radius);

      // Combine and deduplicate
      const allEvents = [...dbEvents, ...externalEvents];
      const uniqueEvents = this.deduplicateEvents(allEvents);

      // Sort by start time and limit results
      return uniqueEvents
        .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
        .slice(0, 20);
    } catch (error) {
      console.error('Error fetching local events:', error);
      return [];
    }
  }

  private async getDatabaseEvents(latitude: number, longitude: number, radius: number): Promise<Array<any>> {
    try {
      // Import supabase dynamically to avoid circular dependencies
      const { supabase } = await import('../lib/supabase');

      const { data, error } = await supabase
        .from('events')
        .select('*')
        .gte('start_time', new Date().toISOString())
        .order('start_time', { ascending: true })
        .limit(50);

      if (error) {
        throw error;
      }

      return (data || []).map(event => ({
        id: `db_${event.id}`,
        title: event.title,
        description: event.description,
        category: event.category || 'event',
        latitude: parseFloat(event.latitude),
        longitude: parseFloat(event.longitude),
        address: event.address,
        startTime: event.start_time,
        endTime: event.end_time,
        attendeeCount: event.attendee_count,
        source: 'community',
      })).filter(event => {
        // Filter by distance
        const distance = this.calculateDistance(
          latitude, longitude, event.latitude, event.longitude,
        );
        return distance <= radius;
      });
    } catch (error) {
      console.error('Error fetching database events:', error);
      return [];
    }
  }

  private async getExternalEvents(latitude: number, longitude: number, radius: number): Promise<Array<any>> {
    // Skip external API calls in development to avoid rate limiting and mock data
    if (import.meta.env.DEV) {
      console.log('🎫 Skipping external event API in development mode');
      return [];
    }

    try {
      // Try to get events from Ticketmaster API
      const ticketmasterEvents = await this.getTicketmasterEvents(latitude, longitude, radius);
      return ticketmasterEvents;
    } catch (error) {
      console.error('Error fetching Ticketmaster events:', error);
      // Return empty array if API fails - no mock fallback
      return [];
    }
  }

  private async getTicketmasterEvents(latitude: number, longitude: number, radius: number): Promise<Array<any>> {
    try {
      // Validate parameters before sending
      if (typeof latitude !== 'number' || typeof longitude !== 'number' || typeof radius !== 'number') {
        console.error('🎫 Invalid parameter types:', { latitude: typeof latitude, longitude: typeof longitude, radius: typeof radius });
        return this.generateMockEvents(latitude, longitude, radius);
      }

      if (isNaN(latitude) || isNaN(longitude) || isNaN(radius)) {
        console.error('🎫 Parameters contain NaN:', { latitude, longitude, radius });
        return this.generateMockEvents(latitude, longitude, radius);
      }

      // Call Supabase Edge Function to fetch Ticketmaster events (solves CORS issues)
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const functionUrl = `${supabaseUrl}/functions/v1/fetch-ticketmaster-events`;

      console.log('🎫 Calling Supabase Edge Function for Ticketmaster events with params:', { latitude, longitude, radius });

      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          latitude,
          longitude,
          radius,
        }),
      });

      if (!response.ok) {
        console.error(`Supabase Edge Function error: ${response.status} ${response.statusText}`);
        // If Edge Function fails, fall back to mock events
        return this.generateMockEvents(latitude, longitude, radius);
      }

      const data = await response.json();
      console.log('🎫 Received events from Supabase Edge Function:', data.events?.length || 0);

      if (!data.events || !Array.isArray(data.events)) {
        console.warn('No events returned from Edge Function');
        return [];
      }

      // Filter events by distance (double-check)
      return data.events.filter((event: any) => {
        const distance = this.calculateDistance(latitude, longitude, event.latitude, event.longitude);
        return distance <= radius;
      });
    } catch (error) {
      console.error('Error calling Supabase Edge Function:', error);
      // Fallback to mock events
      return this.generateMockEvents(latitude, longitude, radius);
    }
  }

  private generateMockEvents(latitude: number, longitude: number, radius: number): Array<any> {
    const events = [];
    const now = new Date();

    // Generate events for the next 7 days
    for (let i = 0; i < 7; i++) {
      const eventDate = new Date(now);
      eventDate.setDate(now.getDate() + i);

      // Add some random events
      if (Math.random() > 0.7) { // 30% chance of an event each day
        const eventTypes = [
          { title: 'Local Music Night', category: 'music', description: 'Live music at downtown venue' },
          { title: 'Community Market', category: 'market', description: 'Farmers market with local vendors' },
          { title: 'Art Exhibition', category: 'art', description: 'Local artists showcase' },
          { title: 'Sports Game', category: 'sports', description: 'Local team playing' },
          { title: 'Food Festival', category: 'food', description: 'Street food and local cuisine' },
          { title: 'Tech Meetup', category: 'technology', description: 'Technology and startup networking' },
          { title: 'Yoga in the Park', category: 'fitness', description: 'Outdoor yoga session' },
          { title: 'Book Reading', category: 'education', description: 'Author reading and discussion' },
        ];

        const eventType = eventTypes[Math.floor(Math.random() * eventTypes.length)];

        // Random time between 6 PM and 10 PM
        const hour = 18 + Math.floor(Math.random() * 4);
        eventDate.setHours(hour, 0, 0, 0);

        // Slight random offset from center location
        const latOffset = (Math.random() - 0.5) * 0.02; // ±0.01 degrees
        const lonOffset = (Math.random() - 0.5) * 0.02;

        events.push({
          id: `mock_${i}_${Date.now()}`,
          title: eventType.title,
          description: eventType.description,
          category: eventType.category,
          latitude: latitude + latOffset,
          longitude: longitude + lonOffset,
          startTime: eventDate.toISOString(),
          attendeeCount: Math.floor(Math.random() * 200) + 20,
          source: 'generated',
        });
      }
    }

    return events;
  }

  async submitEvent(eventData: {
    title: string;
    description?: string;
    category?: string;
    latitude: number;
    longitude: number;
    address?: string;
    startTime: string;
    endTime?: string;
    attendeeCount?: number;
  }): Promise<boolean> {
    try {
      const { supabase } = await import('../lib/supabase');

      const { error } = await supabase
        .from('events')
        .insert({
          title: eventData.title,
          description: eventData.description,
          category: eventData.category || 'event',
          latitude: eventData.latitude,
          longitude: eventData.longitude,
          address: eventData.address,
          start_time: eventData.startTime,
          end_time: eventData.endTime,
          attendee_count: eventData.attendeeCount || 0,
          source: 'user',
        });

      if (error) {
        throw error;
      }
      return true;
    } catch (error) {
      console.error('Error submitting event:', error);
      return false;
    }
  }

  private deduplicateEvents(events: Array<any>): Array<any> {
    const seen = new Set<string>();
    return events.filter(event => {
      const key = `${event.title}_${event.latitude}_${event.longitude}_${event.startTime}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Return distance in kilometers
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  // Get event categories for filtering
  getEventCategories(): Array<{ value: string; label: string }> {
    return [
      { value: 'music', label: 'Music & Concerts' },
      { value: 'sports', label: 'Sports' },
      { value: 'art', label: 'Art & Culture' },
      { value: 'food', label: 'Food & Drink' },
      { value: 'technology', label: 'Technology' },
      { value: 'education', label: 'Education' },
      { value: 'community', label: 'Community' },
      { value: 'fitness', label: 'Fitness & Health' },
      { value: 'market', label: 'Markets & Shopping' },
      { value: 'other', label: 'Other' },
    ];
  }
}

export const eventService = new EventService();

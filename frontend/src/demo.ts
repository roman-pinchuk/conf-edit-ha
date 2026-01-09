/**
 * Demo entry point with mock API
 */

// Mock API data
const mockFiles = [
  {
    name: 'configuration.yaml',
    path: 'configuration.yaml',
    type: 'file' as const,
    size: 1024,
    modified: new Date().toISOString()
  },
  {
    name: 'automations',
    path: 'automations',
    type: 'directory' as const,
    children: [
      {
        name: 'lights.yaml',
        path: 'automations/lights.yaml',
        type: 'file' as const,
        size: 512,
        modified: new Date().toISOString()
      },
      {
        name: 'climate.yaml',
        path: 'automations/climate.yaml',
        type: 'file' as const,
        size: 768,
        modified: new Date().toISOString()
      }
    ]
  },
  {
    name: 'scripts',
    path: 'scripts',
    type: 'directory' as const,
    children: [
      {
        name: 'notifications.yaml',
        path: 'scripts/notifications.yaml',
        type: 'file' as const,
        size: 256,
        modified: new Date().toISOString()
      }
    ]
  }
];

const mockFileContents: Record<string, string> = {
  'configuration.yaml': `# Example Home Assistant Configuration
homeassistant:
  name: Demo Home
  latitude: 52.3676
  longitude: 4.9041
  elevation: 0
  unit_system: metric
  time_zone: Europe/Amsterdam

# Integrations
default_config:

# Text to speech
tts:
  - platform: google_translate

# Automations
automation: !include automations.yaml

# Scripts
script: !include scripts.yaml
`,
  'automations/lights.yaml': `# Light Automations
- alias: "Turn on lights at sunset"
  trigger:
    - platform: sun
      event: sunset
      offset: "-00:30:00"
  action:
    - service: light.turn_on
      target:
        entity_id:
          - light.living_room
          - light.kitchen
      data:
        brightness: 255

- alias: "Turn off lights at night"
  trigger:
    - platform: time
      at: "23:00:00"
  action:
    - service: light.turn_off
      target:
        entity_id: all
`,
  'automations/climate.yaml': `# Climate Automations
- alias: "Set temperature based on time"
  trigger:
    - platform: time
      at: "06:00:00"
    - platform: time
      at: "22:00:00"
  action:
    - choose:
        - conditions:
            - condition: time
              after: "06:00:00"
              before: "22:00:00"
          sequence:
            - service: climate.set_temperature
              target:
                entity_id: climate.thermostat
              data:
                temperature: 21
      default:
        - service: climate.set_temperature
          target:
            entity_id: climate.thermostat
          data:
            temperature: 18
`,
  'scripts/notifications.yaml': `# Notification Scripts
notify_everyone:
  alias: "Notify Everyone"
  sequence:
    - service: notify.mobile_app
      data:
        title: "{{ title }}"
        message: "{{ message }}"

doorbell_announcement:
  alias: "Doorbell Announcement"
  sequence:
    - service: tts.google_translate_say
      target:
        entity_id: media_player.living_room
      data:
        message: "Someone is at the door"
`
};

const mockEntities = [
  { entity_id: 'light.living_room', friendly_name: 'Living Room Light', domain: 'light', state: 'on' },
  { entity_id: 'light.kitchen', friendly_name: 'Kitchen Light', domain: 'light', state: 'off' },
  { entity_id: 'light.bedroom', friendly_name: 'Bedroom Light', domain: 'light', state: 'off' },
  { entity_id: 'switch.fan', friendly_name: 'Ceiling Fan', domain: 'switch', state: 'off' },
  { entity_id: 'climate.thermostat', friendly_name: 'Thermostat', domain: 'climate', state: 'heat' },
  { entity_id: 'sensor.temperature', friendly_name: 'Temperature', domain: 'sensor', state: '22' },
  { entity_id: 'sensor.humidity', friendly_name: 'Humidity', domain: 'sensor', state: '45' },
  { entity_id: 'binary_sensor.door', friendly_name: 'Front Door', domain: 'binary_sensor', state: 'off' },
  { entity_id: 'media_player.living_room', friendly_name: 'Living Room Speaker', domain: 'media_player', state: 'idle' },
];

// Override fetch before importing anything else
const originalFetch = window.fetch;
window.fetch = function(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
  console.log('[Demo] Fetch:', url);

  // Mock /api/files
  if (url.includes('/api/files') && !url.match(/\/api\/files\/.+/)) {
    console.log('[Demo] Returning mock file tree');
    return Promise.resolve(new Response(JSON.stringify(mockFiles), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    }));
  }

  // Mock /api/files/<filename>
  const fileMatch = url.match(/\/api\/files\/(.+)/);
  if (fileMatch && (!init || init?.method !== 'PUT')) {
    const filename = decodeURIComponent(fileMatch[1]);
    const content = mockFileContents[filename] || `# File: ${filename}\n# This is demo content`;
    console.log('[Demo] Returning file:', filename);
    return Promise.resolve(new Response(JSON.stringify({
      filename: filename,
      content: content,
      size: content.length,
      modified: new Date().toISOString()
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    }));
  }

  // Mock /api/files/<filename> PUT (save)
  if (fileMatch && init?.method === 'PUT') {
    console.log('[Demo] Simulated save for:', fileMatch[1]);
    return Promise.resolve(new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    }));
  }

  // Mock /api/entities
  if (url.includes('/api/entities')) {
    console.log('[Demo] Returning mock entities');
    return Promise.resolve(new Response(JSON.stringify(mockEntities), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    }));
  }

  // Fall back to original fetch
  return originalFetch.call(this, input, init);
};

console.log('[Demo] Mock API initialized');

// Now import the main app
import './main';

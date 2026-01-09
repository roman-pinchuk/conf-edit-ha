// Mock data
const mockFiles = [
  {
    name: 'configuration.yaml',
    path: 'configuration.yaml',
    type: 'file',
    size: 1024,
    modified: new Date().toISOString()
  },
  {
    name: 'automations',
    path: 'automations',
    type: 'directory',
    children: [
      {
        name: 'lights.yaml',
        path: 'automations/lights.yaml',
        type: 'file',
        size: 512,
        modified: new Date().toISOString()
      },
      {
        name: 'climate.yaml',
        path: 'automations/climate.yaml',
        type: 'file',
        size: 768,
        modified: new Date().toISOString()
      }
    ]
  },
  {
    name: 'scripts',
    path: 'scripts',
    type: 'directory',
    children: [
      {
        name: 'notifications.yaml',
        path: 'scripts/notifications.yaml',
        type: 'file',
        size: 256,
        modified: new Date().toISOString()
      }
    ]
  }
];

const mockFileContents = {
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

// Intercept fetch calls and return mock data BEFORE loading the app
const originalFetch = window.fetch;
window.fetch = function(url, options) {
  console.log('[Demo] Intercepted fetch:', url);

  // Mock /api/files
  if (url.includes('/api/files') && !url.match(/\/api\/files\/.+/)) {
    console.log('[Demo] Returning mock file tree');
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve(mockFiles)
    });
  }

  // Mock /api/files/<filename>
  const fileMatch = url.match(/\/api\/files\/(.+)/);
  if (fileMatch && (!options || options?.method !== 'PUT')) {
    const filename = decodeURIComponent(fileMatch[1]);
    const content = mockFileContents[filename] || `# File: ${filename}\n# This is demo content`;
    console.log('[Demo] Returning mock file content for:', filename);
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({
        filename: filename,
        content: content,
        size: content.length,
        modified: new Date().toISOString()
      })
    });
  }

  // Mock /api/files/<filename> PUT (save)
  if (fileMatch && options?.method === 'PUT') {
    console.log('[Demo] File save simulated (no actual save in demo)');
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ success: true })
    });
  }

  // Mock /api/entities
  if (url.includes('/api/entities')) {
    console.log('[Demo] Returning mock entities');
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve(mockEntities)
    });
  }

  // Fall back to original fetch for other requests
  return originalFetch.apply(this, arguments);
};

console.log('[Demo] Mock API initialized');

// Now load the real app
import('./static/assets/index-DukJEmev.js');

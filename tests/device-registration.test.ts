import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock the blockchain environment
const mockBlockchain = {
  blockHeight: 100,
  sender: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM',
  devices: new Map(),
  categoryDevices: new Map(),
  userDevices: new Map(),
  deviceCounter: 0,
  
  // Mock functions
  mapSet: vi.fn((map, key, value) => {
    if (map === 'devices') {
      mockBlockchain.devices.set(JSON.stringify(key), value);
    } else if (map === 'category-devices') {
      mockBlockchain.categoryDevices.set(JSON.stringify(key), value);
    } else if (map === 'user-devices') {
      mockBlockchain.userDevices.set(JSON.stringify(key), value);
    }
    return true;
  }),
  
  mapGet: vi.fn((map, key) => {
    if (map === 'devices') {
      return mockBlockchain.devices.get(JSON.stringify(key));
    } else if (map === 'category-devices') {
      return mockBlockchain.categoryDevices.get(JSON.stringify(key));
    } else if (map === 'user-devices') {
      return mockBlockchain.userDevices.get(JSON.stringify(key));
    }
    return undefined;
  }),
  
  varGet: vi.fn(() => mockBlockchain.deviceCounter),
  
  varSet: vi.fn((value) => {
    mockBlockchain.deviceCounter = value;
    return true;
  })
};

// Mock the contract functions
const deviceRegistrationContract = {
  registerDevice: (
      name: string,
      category: string,
      description: string,
      accessibilityFeatures: string[],
      inputMethods: string[],
      outputMethods: string[]
  ) => {
    const deviceId = mockBlockchain.varGet();
    
    // Store device information
    mockBlockchain.mapSet('devices', { device_id: deviceId }, {
      registrar: mockBlockchain.sender,
      name,
      category,
      description,
      'accessibility-features': accessibilityFeatures,
      'input-methods': inputMethods,
      'output-methods': outputMethods,
      timestamp: mockBlockchain.blockHeight
    });
    
    // Update category-to-device mapping
    const categoryList = mockBlockchain.mapGet('category-devices', { category }) || { device_ids: [] };
    mockBlockchain.mapSet('category-devices', { category }, {
      device_ids: [...categoryList.device_ids, deviceId]
    });
    
    // Update user-to-device mapping
    const userList = mockBlockchain.mapGet('user-devices', { user: mockBlockchain.sender }) || { device_ids: [] };
    mockBlockchain.mapSet('user-devices', { user: mockBlockchain.sender }, {
      device_ids: [...userList.device_ids, deviceId]
    });
    
    // Increment counter
    mockBlockchain.varSet(deviceId + 1);
    
    return { success: true, value: deviceId };
  },
  
  updateDevice: (
      deviceId: number,
      description: string,
      accessibilityFeatures: string[],
      inputMethods: string[],
      outputMethods: string[]
  ) => {
    const deviceData = mockBlockchain.mapGet('devices', { device_id: deviceId });
    
    if (!deviceData || deviceData.registrar !== mockBlockchain.sender) {
      return { success: false, error: 1 };
    }
    
    mockBlockchain.mapSet('devices', { device_id: deviceId }, {
      ...deviceData,
      description,
      'accessibility-features': accessibilityFeatures,
      'input-methods': inputMethods,
      'output-methods': outputMethods,
      timestamp: mockBlockchain.blockHeight
    });
    
    return { success: true };
  },
  
  getDevice: (deviceId: number) => {
    return mockBlockchain.mapGet('devices', { device_id: deviceId });
  },
  
  getDevicesByCategory: (category: string) => {
    return mockBlockchain.mapGet('category-devices', { category }) || { device_ids: [] };
  },
  
  getUserDevices: (user: string) => {
    return mockBlockchain.mapGet('user-devices', { user }) || { device_ids: [] };
  },
  
  getDeviceCount: () => {
    return mockBlockchain.varGet();
  }
};

describe('Device Registration Contract', () => {
  beforeEach(() => {
    // Reset the mock blockchain state
    mockBlockchain.devices.clear();
    mockBlockchain.categoryDevices.clear();
    mockBlockchain.userDevices.clear();
    mockBlockchain.deviceCounter = 0;
    mockBlockchain.blockHeight = 100;
    mockBlockchain.sender = 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM';
    
    // Reset mock function calls
    vi.clearAllMocks();
  });
  
  it('should register a new device', () => {
    const result = deviceRegistrationContract.registerDevice(
        'Adaptive Controller',
        'Physical Interface',
        'A customizable controller for limited mobility',
        ['Limited Mobility', 'One-handed'],
        ['Button', 'Joystick'],
        ['Haptic Feedback']
    );
    
    expect(result.success).toBe(true);
    expect(result.value).toBe(0);
    expect(mockBlockchain.deviceCounter).toBe(1);
    
    // Check device was stored correctly
    const deviceData = deviceRegistrationContract.getDevice(0);
    expect(deviceData).toBeDefined();
    expect(deviceData.name).toBe('Adaptive Controller');
    expect(deviceData.category).toBe('Physical Interface');
    expect(deviceData['accessibility-features']).toContain('Limited Mobility');
    
    // Check category mapping
    const categoryDevices = deviceRegistrationContract.getDevicesByCategory('Physical Interface');
    expect(categoryDevices.device_ids).toContain(0);
    
    // Check user mapping
    const userDevices = deviceRegistrationContract.getUserDevices(mockBlockchain.sender);
    expect(userDevices.device_ids).toContain(0);
  });
  
  it('should update an existing device', () => {
    // First register a device
    deviceRegistrationContract.registerDevice(
        'Adaptive Controller',
        'Physical Interface',
        'A customizable controller for limited mobility',
        ['Limited Mobility'],
        ['Button'],
        ['Haptic Feedback']
    );
    
    // Update the device
    const updateResult = deviceRegistrationContract.updateDevice(
        0,
        'An updated description',
        ['Limited Mobility', 'Visual Impairment'],
        ['Button', 'Voice'],
        ['Haptic Feedback', 'Audio']
    );
    
    expect(updateResult.success).toBe(true);
    
    // Check device was updated correctly
    const deviceData = deviceRegistrationContract.getDevice(0);
    expect(deviceData.description).toBe('An updated description');
    expect(deviceData['accessibility-features']).toContain('Visual Impairment');
    expect(deviceData['input-methods']).toContain('Voice');
    expect(deviceData['output-methods']).toContain('Audio');
  });
  
  it('should fail to update a device if not the owner', () => {
    // First register a device
    deviceRegistrationContract.registerDevice(
        'Adaptive Controller',
        'Physical Interface',
        'A customizable controller for limited mobility',
        ['Limited Mobility'],
        ['Button'],
        ['Haptic Feedback']
    );
    
    // Change the sender
    mockBlockchain.sender = 'ST2PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM';
    
    // Try to update the device
    const updateResult = deviceRegistrationContract.updateDevice(
        0,
        'An updated description',
        ['Limited Mobility', 'Visual Impairment'],
        ['Button', 'Voice'],
        ['Haptic Feedback', 'Audio']
    );
    
    expect(updateResult.success).toBe(false);
    expect(updateResult.error).toBe(1);
  });
  
  it('should register multiple devices and track them correctly', () => {
    // Register first device
    deviceRegistrationContract.registerDevice(
        'Adaptive Controller',
        'Physical Interface',
        'A customizable controller for limited mobility',
        ['Limited Mobility'],
        ['Button'],
        ['Haptic Feedback']
    );
    
    // Register second device
    deviceRegistrationContract.registerDevice(
        'Eye Tracker',
        'Visual Interface',
        'An eye tracking system for hands-free control',
        ['Limited Mobility', 'Paralysis'],
        ['Eye Movement'],
        ['Visual Feedback']
    );
    
    // Check device count
    expect(deviceRegistrationContract.getDeviceCount()).toBe(2);
    
    // Check category mappings
    const physicalDevices = deviceRegistrationContract.getDevicesByCategory('Physical Interface');
    expect(physicalDevices.device_ids).toContain(0);
    expect(physicalDevices.device_ids).not.toContain(1);
    
    const visualDevices = deviceRegistrationContract.getDevicesByCategory('Visual Interface');
    expect(visualDevices.device_ids).toContain(1);
    expect(visualDevices.device_ids).not.toContain(0);
    
    // Check user mapping
    const userDevices = deviceRegistrationContract.getUserDevices(mockBlockchain.sender);
    expect(userDevices.device_ids).toContain(0);
    expect(userDevices.device_ids).toContain(1);
    expect(userDevices.device_ids.length).toBe(2);
  });
});

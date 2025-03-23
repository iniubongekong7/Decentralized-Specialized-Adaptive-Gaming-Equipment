import { describe, it, expect, beforeEach, vi } from "vitest"

// Mock the blockchain environment
const mockBlockchain = {
  blockHeight: 100,
  sender: "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM",
  designs: new Map(),
  deviceDesigns: new Map(),
  creatorDesigns: new Map(),
  designRatings: new Map(),
  designAverageRatings: new Map(),
  designCounter: 0,
  
  // Mock functions
  mapSet: vi.fn((map, key, value) => {
    if (map === "designs") {
      mockBlockchain.designs.set(JSON.stringify(key), value)
    } else if (map === "device-designs") {
      mockBlockchain.deviceDesigns.set(JSON.stringify(key), value)
    } else if (map === "creator-designs") {
      mockBlockchain.creatorDesigns.set(JSON.stringify(key), value)
    } else if (map === "design-ratings") {
      mockBlockchain.designRatings.set(JSON.stringify(key), value)
    } else if (map === "design-average-ratings") {
      mockBlockchain.designAverageRatings.set(JSON.stringify(key), value)
    }
    return true
  }),
  
  mapGet: vi.fn((map, key) => {
    if (map === "designs") {
      return mockBlockchain.designs.get(JSON.stringify(key))
    } else if (map === "device-designs") {
      return mockBlockchain.deviceDesigns.get(JSON.stringify(key))
    } else if (map === "creator-designs") {
      return mockBlockchain.creatorDesigns.get(JSON.stringify(key))
    } else if (map === "design-ratings") {
      return mockBlockchain.designRatings.get(JSON.stringify(key))
    } else if (map === "design-average-ratings") {
      return mockBlockchain.designAverageRatings.get(JSON.stringify(key))
    }
    return undefined
  }),
  
  varGet: vi.fn(() => mockBlockchain.designCounter),
  
  varSet: vi.fn((value) => {
    mockBlockchain.designCounter = value
    return true
  }),
}

// Mock the contract functions
const designSharingContract = {
  shareDesign: (
      deviceId: number,
      title: string,
      description: string,
      filesHash: Uint8Array,
      licenseType: string,
      materials: string[],
      toolsRequired: string[],
      difficultyLevel: number,
  ) => {
    const designId = mockBlockchain.varGet()
    
    // Store design information
    mockBlockchain.mapSet(
        "designs",
        { design_id: designId },
        {
          creator: mockBlockchain.sender,
          device_id: deviceId,
          title,
          description,
          "files-hash": filesHash,
          "license-type": licenseType,
          materials,
          "tools-required": toolsRequired,
          "difficulty-level": difficultyLevel,
          timestamp: mockBlockchain.blockHeight,
        },
    )
    
    // Update device-to-design mapping
    const deviceList = mockBlockchain.mapGet("device-designs", { device_id: deviceId }) || { design_ids: [] }
    mockBlockchain.mapSet(
        "device-designs",
        { device_id: deviceId },
        {
          design_ids: [...deviceList.design_ids, designId],
        },
    )
    
    // Update creator-to-design mapping
    const creatorList = mockBlockchain.mapGet("creator-designs", { creator: mockBlockchain.sender }) || {
      design_ids: [],
    }
    mockBlockchain.mapSet(
        "creator-designs",
        { creator: mockBlockchain.sender },
        {
          design_ids: [...creatorList.design_ids, designId],
        },
    )
    
    // Initialize rating
    mockBlockchain.mapSet(
        "design-average-ratings",
        { design_id: designId },
        {
          "total-rating": 0,
          count: 0,
        },
    )
    
    // Increment counter
    mockBlockchain.varSet(designId + 1)
    
    return { success: true, value: designId }
  },
  
  rateDesign: (designId: number, rating: number, comment: string) => {
    const designData = mockBlockchain.mapGet("designs", { design_id: designId })
    
    if (!designData || rating > 5) {
      return { success: false, error: 1 }
    }
    
    const currentRating = mockBlockchain.mapGet("design-ratings", { design_id: designId, rater: mockBlockchain.sender })
    const averageRating = mockBlockchain.mapGet("design-average-ratings", { design_id: designId }) || {
      "total-rating": 0,
      count: 0,
    }
    
    // Store the rating
    mockBlockchain.mapSet(
        "design-ratings",
        { design_id: designId, rater: mockBlockchain.sender },
        {
          rating,
          comment,
        },
    )
    
    // Update average rating
    if (currentRating) {
      // Update existing rating
      mockBlockchain.mapSet(
          "design-average-ratings",
          { design_id: designId },
          {
            "total-rating": averageRating["total-rating"] - currentRating.rating + rating,
            count: averageRating.count,
          },
      )
    } else {
      // Add new rating
      mockBlockchain.mapSet(
          "design-average-ratings",
          { design_id: designId },
          {
            "total-rating": averageRating["total-rating"] + rating,
            count: averageRating.count + 1,
          },
      )
    }
    
    return { success: true }
  },
  
  getDesign: (designId: number) => {
    return mockBlockchain.mapGet("designs", { design_id: designId })
  },
  
  getDesignsByDevice: (deviceId: number) => {
    return mockBlockchain.mapGet("device-designs", { device_id: deviceId }) || { design_ids: [] }
  },
  
  getCreatorDesigns: (creator: string) => {
    return mockBlockchain.mapGet("creator-designs", { creator }) || { design_ids: [] }
  },
  
  getDesignRating: (designId: number, rater: string) => {
    return mockBlockchain.mapGet("design-ratings", { design_id: designId, rater })
  },
  
  getDesignAverageRating: (designId: number) => {
    const ratingData = mockBlockchain.mapGet("design-average-ratings", { design_id: designId })
    
    if (ratingData && ratingData.count > 0) {
      return ratingData["total-rating"] / ratingData.count
    }
    
    return null
  },
  
  getDesignCount: () => {
    return mockBlockchain.varGet()
  },
}

describe("Design Sharing Contract", () => {
  beforeEach(() => {
    // Reset the mock blockchain state
    mockBlockchain.designs.clear()
    mockBlockchain.deviceDesigns.clear()
    mockBlockchain.creatorDesigns.clear()
    mockBlockchain.designRatings.clear()
    mockBlockchain.designAverageRatings.clear()
    mockBlockchain.designCounter = 0
    mockBlockchain.blockHeight = 100
    mockBlockchain.sender = "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM"
    
    // Reset mock function calls
    vi.clearAllMocks()
  })
  
  it("should share a new design", () => {
    const filesHash = new Uint8Array(32).fill(1)
    const result = designSharingContract.shareDesign(
        1, // device ID
        "Ergonomic Joystick Adapter",
        "An adapter for standard joysticks to improve ergonomics",
        filesHash,
        "Creative Commons",
        ["PLA Plastic", "Rubber"],
        ["3D Printer", "Screwdriver"],
        2, // difficulty level
    )
    
    expect(result.success).toBe(true)
    expect(result.value).toBe(0)
    expect(mockBlockchain.designCounter).toBe(1)
    
    // Check design was stored correctly
    const designData = designSharingContract.getDesign(0)
    expect(designData).toBeDefined()
    expect(designData.title).toBe("Ergonomic Joystick Adapter")
    expect(designData["license-type"]).toBe("Creative Commons")
    expect(designData.materials).toContain("PLA Plastic")
    
    // Check device mapping
    const deviceDesigns = designSharingContract.getDesignsByDevice(1)
    expect(deviceDesigns.design_ids).toContain(0)
    
    // Check creator mapping
    const creatorDesigns = designSharingContract.getCreatorDesigns(mockBlockchain.sender)
    expect(creatorDesigns.design_ids).toContain(0)
    
    // Check rating initialization
    const averageRating = mockBlockchain.mapGet("design-average-ratings", { design_id: 0 })
    expect(averageRating).toBeDefined()
    expect(averageRating["total-rating"]).toBe(0)
    expect(averageRating.count).toBe(0)
  })
  
  it("should rate a design", () => {
    // First share a design
    const filesHash = new Uint8Array(32).fill(1)
    designSharingContract.shareDesign(
        1,
        "Ergonomic Joystick Adapter",
        "An adapter for standard joysticks to improve ergonomics",
        filesHash,
        "Creative Commons",
        ["PLA Plastic", "Rubber"],
        ["3D Printer", "Screwdriver"],
        2,
    )
    
    // Rate the design
    const rateResult = designSharingContract.rateDesign(0, 4, "Works great, easy to print and assemble")
    
    expect(rateResult.success).toBe(true)
    
    // Check rating was stored correctly
    const ratingData = designSharingContract.getDesignRating(0, mockBlockchain.sender)
    expect(ratingData).toBeDefined()
    expect(ratingData.rating).toBe(4)
    expect(ratingData.comment).toBe("Works great, easy to print and assemble")
    
    // Check average rating
    const averageRating = designSharingContract.getDesignAverageRating(0)
    expect(averageRating).toBe(4)
  })
  
  it("should update an existing rating", () => {
    // First share a design
    const filesHash = new Uint8Array(32).fill(1)
    designSharingContract.shareDesign(
        1,
        "Ergonomic Joystick Adapter",
        "An adapter for standard joysticks to improve ergonomics",
        filesHash,
        "Creative Commons",
        ["PLA Plastic", "Rubber"],
        ["3D Printer", "Screwdriver"],
        2,
    )
    
    // Rate the design
    designSharingContract.rateDesign(0, 4, "Initial rating")
    
    // Update the rating
    designSharingContract.rateDesign(0, 5, "Updated after more use")
    
    // Check rating was updated correctly
    const ratingData = designSharingContract.getDesignRating(0, mockBlockchain.sender)
    expect(ratingData.rating).toBe(5)
    expect(ratingData.comment).toBe("Updated after more use")
    
    // Check average rating was updated
    const averageRating = designSharingContract.getDesignAverageRating(0)
    expect(averageRating).toBe(5)
  })
  
  it("should calculate average rating correctly with multiple ratings", () => {
    // First share a design
    const filesHash = new Uint8Array(32).fill(1)
    designSharingContract.shareDesign(
        1,
        "Ergonomic Joystick Adapter",
        "An adapter for standard joysticks to improve ergonomics",
        filesHash,
        "Creative Commons",
        ["PLA Plastic", "Rubber"],
        ["3D Printer", "Screwdriver"],
        2,
    )
    
    // First user rates the design
    designSharingContract.rateDesign(0, 4, "First user rating")
    
    // Change the sender to simulate a different user
    mockBlockchain.sender = "ST2PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM"
    
    // Second user rates the design
    designSharingContract.rateDesign(0, 2, "Second user rating")
    
    // Change the sender to simulate a third user
    mockBlockchain.sender = "ST3PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM"
    
    // Third user rates the design
    designSharingContract.rateDesign(0, 5, "Third user rating")
    
    // Check average rating
    const averageRating = designSharingContract.getDesignAverageRating(0)
    expect(averageRating).toBe((4 + 2 + 5) / 3)
  })
  
  it("should fail to rate a non-existent design", () => {
    const rateResult = designSharingContract.rateDesign(
        999, // non-existent design ID
        4,
        "This design does not exist",
    )
    
    expect(rateResult.success).toBe(false)
    expect(rateResult.error).toBe(1)
  })
  
  it("should fail to rate with an invalid rating value", () => {
    // First share a design
    const filesHash = new Uint8Array(32).fill(1)
    designSharingContract.shareDesign(
        1,
        "Ergonomic Joystick Adapter",
        "An adapter for standard joysticks to improve ergonomics",
        filesHash,
        "Creative Commons",
        ["PLA Plastic", "Rubber"],
        ["3D Printer", "Screwdriver"],
        2,
    )
    
    // Try to rate with an invalid value
    const rateResult = designSharingContract.rateDesign(
        0,
        6, // Rating should be 0-5
        "Invalid rating",
    )
    
    expect(rateResult.success).toBe(false)
    expect(rateResult.error).toBe(1)
  })
})


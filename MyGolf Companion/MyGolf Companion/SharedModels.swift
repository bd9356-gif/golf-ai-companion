import Foundation

// MARK: - Shared models used across multiple views

struct GolfGroup: Codable {
    var id: UUID?
    var userId: UUID?
    var golfer1: String
    var golfer2: String
    var golfer3: String
    var golfer4: String

    enum CodingKeys: String, CodingKey {
        case id, golfer1 = "golfer_1", golfer2 = "golfer_2",
             golfer3 = "golfer_3", golfer4 = "golfer_4", userId = "user_id"
    }

    var names: [String] { [golfer1, golfer2, golfer3, golfer4].filter { !$0.isEmpty } }
}

struct GameCard: Codable, Identifiable {
    var id: UUID?
    var userId: UUID?
    var createdBy: String
    var gameContent: String
    var createdAt: Date?
    var situationTitle: String?

    enum CodingKeys: String, CodingKey {
        case id, userId = "user_id", createdBy = "created_by",
             gameContent = "game_content", createdAt = "created_at",
             situationTitle = "situation_title"
    }
}

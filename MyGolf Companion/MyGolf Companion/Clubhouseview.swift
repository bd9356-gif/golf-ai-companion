import SwiftUI

// MARK: - Color Tokens
// Primary:   #1B5E20  (forest green)
// Accent:    #4CAF50  (bright green)
// Light:     #E8F5E9  (tile background)
// Parchment: #F9F6F0  (page background)
// Ink:       #1A1A1A

struct ClubhouseView: View {
    @EnvironmentObject var authViewModel: AuthViewModel

    private let yourGameSections: [ClubhouseSection] = [
        ClubhouseSection(
            icon: "i-had-a-five",
            iconColor: Color(hex: "#C8941A"),
            title: "I Had a Five™",
            subtitle: "Build this week's game",
            destination: .iHadAFive
        ),
        ClubhouseSection(
            icon: "my-bag",
            iconColor: Color(hex: "#1B5E20"),
            title: "MyBag",
            subtitle: "Your skill + game for Saturday",
            destination: .myBag
        ),
        ClubhouseSection(
            icon: "courses",
            iconColor: Color(hex: "#2E7D32"),
            title: "My Courses",
            subtitle: "Your golf address book",
            destination: .myCourses
        ),
        ClubhouseSection(
            icon: "i-had-a-five",
            iconColor: Color(hex: "#C8401A"),
            title: "19th Hole",
            subtitle: "A golf life in moments",
            destination: .nineteenthHole
        ),
    ]

    private let aiClubhouseSections: [ClubhouseSection] = [
        ClubhouseSection(
            icon: "pro-bill",
            iconColor: Color(hex: "#1B5E20"),
            title: "Ask The Pro",
            subtitle: "Get clear answers",
            destination: .askThePro
        ),
        ClubhouseSection(
            icon: "golf-tv",
            iconColor: Color(hex: "#C62828"),
            title: "Golf TV",
            subtitle: "Watch and learn",
            destination: .golfTV
        ),
        ClubhouseSection(
            icon: "driving-range",
            iconColor: Color(hex: "#E65100"),
            title: "Golf Library",
            subtitle: "Guides & techniques",
            destination: .golfLibrary
        ),
        ClubhouseSection(
            icon: "playbook",
            iconColor: Color(hex: "#4527A0"),
            title: "My Playbook",
            subtitle: "Your saved lessons",
            destination: .myPlaybook
        ),
    ]

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 0) {

                    // MARK: Banner
                    bannerSection

                    // MARK: Your Game
                    sectionGroup(
                        title: "Your Game",
                        sections: yourGameSections
                    )
                    .padding(.top, 24)

                    // MARK: AI Clubhouse
                    aiClubhouseGrid
                        .padding(.top, 8)

                    Spacer(minLength: 32)
                }
            }
            .background(Color(hex: "#F9F6F0"))
            .navigationBarHidden(true)
        }
    }

    // MARK: - AI Clubhouse Grid
    private var aiClubhouseGrid: some View {
        VStack(alignment: .leading, spacing: 10) {
            // Section header
            HStack(spacing: 10) {
                Image("pro-bill")
                    .resizable().scaledToFit()
                    .frame(width: 44, height: 44)
                    .cornerRadius(10)
                VStack(alignment: .leading, spacing: 1) {
                    Text("AI Clubhouse")
                        .font(.system(size: 15, weight: .bold))
                        .foregroundColor(Color(hex: "#1B5E20"))
                    Text("Learn. Practice. Master.")
                        .font(.system(size: 11))
                        .foregroundColor(Color(hex: "#5C5C5C"))
                }
            }
            .padding(.horizontal, 16)

            // 2x2 grid
            LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 10) {
                ForEach(aiClubhouseSections) { section in
                    NavigationLink(destination: destinationView(for: section.destination)) {
                        ClubhouseGridCard(section: section)
                    }
                    .buttonStyle(PlainButtonStyle())
                }
            }
            .padding(.horizontal, 16)
        }
        .padding(.bottom, 16)
    }

    @ViewBuilder
    private func destinationView(for destination: ClubhouseDestination) -> some View {
        switch destination {
        case .iHadAFive:       IHadAFiveView()
        case .myBag:           MyBagView()
        case .myCourses:       MyCoursesView()
        case .nineteenthHole:  NineteenthHoleView()
        case .askThePro:       AskTheProView()
        case .golfTV:          GolfTVView()
        case .golfLibrary:     GolfLibraryView()
        case .myPlaybook:      MyPlaybookView()
        }
    }

    // MARK: - Banner
    private var bannerSection: some View {
        VStack(spacing: 0) {
            Image("MasterHero")
                .resizable()
                .scaledToFit()
                .frame(maxWidth: .infinity)
                .padding(.horizontal, 16)
                .padding(.top, 16)
                .padding(.bottom, 8)
        }
        .background(Color(hex: "#F9F6F0"))
    }

    // MARK: - Section Group
    private func sectionGroup(title: String, sections: [ClubhouseSection]) -> some View {
        VStack(alignment: .leading, spacing: 0) {
            // Section header
            HStack {
                Text(title.uppercased())
                    .font(.system(size: 11, weight: .bold))
                    .tracking(1.4)
                    .foregroundColor(Color(hex: "#1B5E20"))
                Spacer()
            }
            .padding(.horizontal, 16)
            .padding(.bottom, 10)

            // Tiles
            VStack(spacing: 10) {
                ForEach(sections) { section in
                    ClubhouseTile(section: section)
                }
            }
            .padding(.horizontal, 16)
        }
        .padding(.bottom, 16)
    }
}

// MARK: - Tile
struct ClubhouseTile: View {
    let section: ClubhouseSection

    var body: some View {
        NavigationLink(destination: destinationView(for: section.destination)) {
            HStack(spacing: 14) {
                // Icon
                ZStack {
                    RoundedRectangle(cornerRadius: 12)
                        .fill(section.iconColor.opacity(0.12))
                        .frame(width: 48, height: 48)
                    Image(section.icon)
                        .resizable()
                        .scaledToFit()
                        .frame(width: 32, height: 32)
                }

                // Text
                VStack(alignment: .leading, spacing: 3) {
                    Text(section.title)
                        .font(.system(size: 16, weight: .bold))
                        .foregroundColor(Color(hex: "#1A1A1A"))
                    Text(section.subtitle)
                        .font(.system(size: 13))
                        .foregroundColor(Color(hex: "#5C5C5C"))
                }

                Spacer()

                Image(systemName: "chevron.right")
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundColor(Color(hex: "#AAAAAA"))
            }
            .padding(14)
            .background(Color.white)
            .cornerRadius(16)
            .overlay(
                RoundedRectangle(cornerRadius: 16)
                    .stroke(Color(hex: "#E0EAE0"), lineWidth: 1)
            )
            .shadow(color: Color.black.opacity(0.04), radius: 4, x: 0, y: 2)
        }
        .buttonStyle(PlainButtonStyle())
    }

    @ViewBuilder
    private func destinationView(for destination: ClubhouseDestination) -> some View {
        switch destination {
        case .iHadAFive:       IHadAFiveView()
        case .myBag:           MyBagView()
        case .myCourses:       MyCoursesView()
        case .nineteenthHole:  NineteenthHoleView()
        case .askThePro:       AskTheProView()
        case .golfTV:          GolfTVView()
        case .golfLibrary:     GolfLibraryView()
        case .myPlaybook:      MyPlaybookView()
        }
    }
}

// MARK: - Models
// MARK: - Grid Card (for AI Clubhouse 2x2)
struct ClubhouseGridCard: View {
    let section: ClubhouseSection

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack(spacing: 8) {
                Image(section.icon)
                    .resizable().scaledToFit()
                    .frame(width: 32, height: 32)
                    .cornerRadius(8)
                Text(section.title)
                    .font(.caption).fontWeight(.bold)
                    .foregroundColor(.primary)
                    .lineLimit(1)
            }
            Text(section.subtitle)
                .font(.caption2).foregroundColor(.secondary)
                .lineLimit(2)
                .fixedSize(horizontal: false, vertical: true)
        }
        .frame(maxWidth: .infinity, minHeight: 60, alignment: .topLeading)
        .padding(10)
        .background(Color.white)
        .cornerRadius(12)
        .overlay(RoundedRectangle(cornerRadius: 12).stroke(Color(hex: "#1B5E20").opacity(0.2), lineWidth: 1.5))
        .shadow(color: .black.opacity(0.04), radius: 3, x: 0, y: 2)
    }
}

struct ClubhouseSection: Identifiable {
    let id = UUID()
    let icon: String
    let iconColor: Color
    let title: String
    let subtitle: String
    let destination: ClubhouseDestination
}

enum ClubhouseDestination {
    case iHadAFive
    case myBag
    case myCourses
    case nineteenthHole
    case askThePro
    case golfTV
    case golfLibrary
    case myPlaybook
}

// MARK: - Placeholder Views (each will be built out)











// MARK: - Color Extension
extension Color {
    init(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        let a, r, g, b: UInt64
        switch hex.count {
        case 3:
            (a, r, g, b) = (255, (int >> 8) * 17, (int >> 4 & 0xF) * 17, (int & 0xF) * 17)
        case 6:
            (a, r, g, b) = (255, int >> 16, int >> 8 & 0xFF, int & 0xFF)
        case 8:
            (a, r, g, b) = (int >> 24, int >> 16 & 0xFF, int >> 8 & 0xFF, int & 0xFF)
        default:
            (a, r, g, b) = (255, 0, 0, 0)
        }
        self.init(
            .sRGB,
            red: Double(r) / 255,
            green: Double(g) / 255,
            blue: Double(b) / 255,
            opacity: Double(a) / 255
        )
    }
}

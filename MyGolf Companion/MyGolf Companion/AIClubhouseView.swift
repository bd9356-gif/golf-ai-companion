import SwiftUI

enum ClubhouseMode: CaseIterable {
    case askThePro, golfTV, golfLibrary, myPlaybook

    var label: String {
        switch self {
        case .askThePro:  return "🎙️ Ask The Pro"
        case .golfTV:     return "📺 Golf TV"
        case .golfLibrary: return "📚 Golf Library"
        case .myPlaybook: return "📓 My Playbook"
        }
    }

    var heroTitle: String {
        switch self {
        case .askThePro:  return "Ask The Pro"
        case .golfTV:     return "Golf TV"
        case .golfLibrary: return "Golf Library"
        case .myPlaybook: return "My Playbook"
        }
    }

    var tagline: String {
        switch self {
        case .askThePro:  return "Ask anything. Get clear answers."
        case .golfTV:     return "Watch and learn."
        case .golfLibrary: return "Guides & techniques."
        case .myPlaybook: return "Your saved lessons."
        }
    }

    var iconName: String {
        switch self {
        case .askThePro:  return "pro-bill"
        case .golfTV:     return "golf-tv"
        case .golfLibrary: return "driving-range"
        case .myPlaybook: return "playbook"
        }
    }
}

struct AIClubhouseView: View {
    @State private var mode: ClubhouseMode = .askThePro

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {

                // ── Banner ──
                VStack(spacing: 4) {
                    Text("AI Clubhouse")
                        .font(.system(size: 28, weight: .bold))
                        .foregroundColor(Color(hex: "#1B5E20"))
                    Text("Learn. Practice. Master.")
                        .font(.system(size: 13))
                        .foregroundColor(Color(hex: "#5C5C5C"))
                        .italic()
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 16)
                .background(Color.white)

                // ── Mode strip ──
                HStack(spacing: 12) {
                    Image(mode.iconName)
                        .resizable().scaledToFit()
                        .frame(width: 56, height: 56)
                        .cornerRadius(12)
                    VStack(alignment: .leading, spacing: 2) {
                        Text(mode.heroTitle)
                            .font(.headline).fontWeight(.bold)
                            .foregroundColor(Color(hex: "#1A1A1A"))
                        Text(mode.tagline)
                            .font(.caption)
                            .foregroundColor(Color(hex: "#5C5C5C"))
                    }
                    Spacer()
                }
                .padding(.horizontal, 16).padding(.vertical, 10)
                .background(Color.white)

                Divider()

                // ── Mode tabs ──
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 8) {
                        ForEach(ClubhouseMode.allCases, id: \.self) { m in
                            Button { mode = m } label: {
                                Text(m.label)
                                    .font(.subheadline).fontWeight(.semibold)
                                    .padding(.horizontal, 18).padding(.vertical, 8)
                                    .background(mode == m ? Color(hex: "#1B5E20") : Color(hex: "#F0F0F0"))
                                    .foregroundColor(mode == m ? .white : Color(hex: "#1A1A1A"))
                                    .cornerRadius(20)
                            }
                        }
                    }
                    .padding(.horizontal, 16).padding(.vertical, 10)
                }
                .background(Color.white)

                Divider()

                // ── Content ──
                switch mode {
                case .askThePro:  AskTheProView()
                case .golfTV:     GolfTVView()
                case .golfLibrary: GolfLibraryView()
                case .myPlaybook: MyPlaybookView()
                }
            }
            .background(Color(hex: "#F9F6F0"))
            .navigationBarHidden(true)
        }
    }
}

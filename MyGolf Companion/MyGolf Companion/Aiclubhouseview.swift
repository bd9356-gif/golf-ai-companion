import SwiftUI

struct AIClubhouseView: View {
    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 0) {
                    headerBanner

                    VStack(spacing: 12) {
                        NavigationLink(destination: AskTheProView()) {
                            ClubhouseFeatureTile(
                                icon: "person.fill.questionmark",
                                iconColor: Color(hex: "#1B5E20"),
                                title: "Ask The Pro",
                                subtitle: "Ask anything. Get clear answers."
                            )
                        }
                        NavigationLink(destination: GolfTVView()) {
                            ClubhouseFeatureTile(
                                icon: "play.rectangle.fill",
                                iconColor: Color(hex: "#C62828"),
                                title: "Golf TV",
                                subtitle: "Watch and learn"
                            )
                        }
                        NavigationLink(destination: DrivingRangeView()) {
                            ClubhouseFeatureTile(
                                icon: "books.vertical.fill",
                                iconColor: Color(hex: "#E65100"),
                                title: "Driving Range",
                                subtitle: "Guides & techniques"
                            )
                        }
                        NavigationLink(destination: MyPlaybookView()) {
                            ClubhouseFeatureTile(
                                icon: "book.closed.fill",
                                iconColor: Color(hex: "#4527A0"),
                                title: "My Playbook",
                                subtitle: "Your saved lessons"
                            )
                        }
                    }
                    .padding(16)
                }
            }
            .background(Color(hex: "#F9F6F0"))
            .navigationBarHidden(true)
        }
    }

    private var headerBanner: some View {
        VStack(spacing: 0) {
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text("AI Clubhouse")
                        .font(.system(size: 24, weight: .bold))
                        .foregroundColor(Color(hex: "#1B5E20"))
                    Text("Learn. Practice. Master.")
                        .font(.system(size: 13))
                        .foregroundColor(Color(hex: "#5C5C5C"))
                        .italic()
                }
                Spacer()
                Text("🎓").font(.system(size: 36))
            }
            .padding(.horizontal, 16).padding(.vertical, 14)
            Divider()
        }
        .background(Color.white)
    }
}

struct ClubhouseFeatureTile: View {
    let icon: String
    let iconColor: Color
    let title: String
    let subtitle: String

    var body: some View {
        HStack(spacing: 14) {
            ZStack {
                RoundedRectangle(cornerRadius: 12)
                    .fill(iconColor.opacity(0.12))
                    .frame(width: 48, height: 48)
                Image(systemName: icon)
                    .font(.system(size: 20, weight: .semibold))
                    .foregroundColor(iconColor)
            }
            VStack(alignment: .leading, spacing: 3) {
                Text(title)
                    .font(.system(size: 16, weight: .bold))
                    .foregroundColor(Color(hex: "#1A1A1A"))
                Text(subtitle)
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
        .overlay(RoundedRectangle(cornerRadius: 16).stroke(Color(hex: "#E0EAE0"), lineWidth: 1))
        .shadow(color: Color.black.opacity(0.04), radius: 4, x: 0, y: 2)
    }
}

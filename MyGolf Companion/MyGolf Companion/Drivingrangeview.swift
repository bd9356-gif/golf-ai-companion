import SwiftUI
import Supabase

struct GuideTopic: Identifiable {
    let id = UUID()
    let icon: String
    let title: String
    let prompt: String
}

struct DrivingRangeView: View {
    @State private var selectedTopic: GuideTopic? = nil
    @State private var guideContent: String = ""
    @State private var isLoading = false

    let topics: [GuideTopic] = [
        GuideTopic(icon: "🏌️", title: "Full Swing Fundamentals", prompt: "full swing fundamentals for an amateur golfer"),
        GuideTopic(icon: "⛳", title: "Short Game Basics", prompt: "short game and chipping basics"),
        GuideTopic(icon: "🎯", title: "Putting Technique", prompt: "putting technique and green reading"),
        GuideTopic(icon: "🗺️", title: "Course Management", prompt: "course management and smart strategy"),
        GuideTopic(icon: "💪", title: "Grip & Stance", prompt: "proper grip and stance fundamentals"),
        GuideTopic(icon: "🏖️", title: "Bunker Play", prompt: "getting out of bunkers consistently"),
    ]

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 0) {
                    headerBanner

                    if let topic = selectedTopic {
                        guideView(topic: topic)
                    } else {
                        topicGrid
                    }
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
                    Text("Driving Range")
                        .font(.system(size: 22, weight: .bold))
                        .foregroundColor(Color(hex: "#1B5E20"))
                    Text("Guides & techniques")
                        .font(.system(size: 13))
                        .foregroundColor(Color(hex: "#5C5C5C"))
                        .italic()
                }
                Spacer()
                if selectedTopic != nil {
                    Button { selectedTopic = nil; guideContent = "" } label: {
                        Text("Back")
                            .font(.system(size: 13, weight: .semibold))
                            .foregroundColor(Color(hex: "#1B5E20"))
                    }
                } else {
                    Text("📚").font(.system(size: 32))
                }
            }
            .padding(.horizontal, 16).padding(.vertical, 14)
            Divider()
        }
        .background(Color.white)
    }

    private var topicGrid: some View {
        LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
            ForEach(topics) { topic in
                Button {
                    selectedTopic = topic
                    Task { await loadGuide(topic: topic) }
                } label: {
                    VStack(spacing: 10) {
                        Text(topic.icon).font(.system(size: 32))
                        Text(topic.title)
                            .font(.system(size: 13, weight: .semibold))
                            .foregroundColor(Color(hex: "#1A1A1A"))
                            .multilineTextAlignment(.center)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 20)
                    .background(Color.white)
                    .cornerRadius(16)
                    .overlay(RoundedRectangle(cornerRadius: 16).stroke(Color(hex: "#E0EAE0"), lineWidth: 1))
                }
            }
        }
        .padding(16)
    }

    private func guideView(topic: GuideTopic) -> some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack(spacing: 10) {
                Text(topic.icon).font(.system(size: 28))
                Text(topic.title)
                    .font(.system(size: 18, weight: .bold))
                    .foregroundColor(Color(hex: "#1A1A1A"))
            }

            if isLoading {
                ProgressView()
                    .padding(.top, 24)
                    .frame(maxWidth: .infinity)
            } else {
                Text(guideContent)
                    .font(.system(size: 15))
                    .foregroundColor(Color(hex: "#2C2C2C"))
                    .lineSpacing(6)
            }
        }
        .padding(16)
        .background(Color.white)
        .cornerRadius(16)
        .shadow(color: Color.black.opacity(0.04), radius: 4, x: 0, y: 2)
        .padding(16)
    }

    func loadGuide(topic: GuideTopic) async {
        isLoading = true

        guard let url = URL(string: "https://golf-ai-companion.vercel.app/api/driving-range-guide") else { return }
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        let body: [String: Any] = ["topic": topic.prompt]
        request.httpBody = try? JSONSerialization.data(withJSONObject: body)

        do {
            let (data, _) = try await URLSession.shared.data(for: request)
            if let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
               let guide = json["guide"] as? String {
                guideContent = guide
            } else {
                guideContent = "Sorry, couldn't load this guide. Please try again."
            }
        } catch {
            guideContent = "Sorry, couldn't load this guide. Please try again."
        }
        isLoading = false
    }
}

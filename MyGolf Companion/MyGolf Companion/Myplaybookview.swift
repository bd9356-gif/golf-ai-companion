import SwiftUI
import Supabase

struct SavedAnswerRecord: Codable, Identifiable {
    var id: UUID
    var question: String
    var answer: String
    var createdAt: Date?
    var relatedVideoId: UUID?

    enum CodingKeys: String, CodingKey {
        case id, question, answer
        case createdAt = "created_at"
        case relatedVideoId = "related_video_id"
    }
}

struct MyPlaybookView: View {
    @EnvironmentObject var authViewModel: AuthViewModel
    @State private var savedAnswers: [SavedAnswerRecord] = []
    @State private var savedVideos: [GolfVideo] = []
    @State private var relatedAnswerVideoIds: Set<UUID> = []
    @State private var isLoading = true

    private let supabase = SupabaseClient.shared.client

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 0) {
                    headerBanner

                    if isLoading {
                        ProgressView().padding(48)
                    } else if savedAnswers.isEmpty && savedVideos.isEmpty {
                        emptyState
                    } else {
                        VStack(alignment: .leading, spacing: 20) {
                            if !savedVideos.isEmpty {
                                VStack(alignment: .leading, spacing: 10) {
                                    Text("SAVED VIDEOS")
                                        .font(.system(size: 11, weight: .bold))
                                        .tracking(1.4)
                                        .foregroundColor(Color(hex: "#1B5E20"))
                                    ForEach(savedVideos) { video in
                                        HStack(spacing: 8) {
                                            VideoRow(video: video, isSaved: true, isExplained: relatedAnswerVideoIds.contains(video.id), onSave: {
                                                Task { await unsaveVideo(video) }
                                            })
                                        }
                                        Button {
                                            Task { await shortlistVideo(video) }
                                        } label: {
                                            HStack(spacing: 4) {
                                                Image(systemName: "bag.fill").font(.system(size: 11))
                                                Text("Add to Side Pocket").font(.system(size: 12, weight: .semibold))
                                            }
                                            .foregroundColor(Color(hex: "#1B5E20"))
                                            .padding(.horizontal, 12).padding(.vertical, 6)
                                            .background(Color(hex: "#E8F5E9"))
                                            .cornerRadius(12)
                                        }
                                        .padding(.bottom, 4)
                                    }
                                }
                            }

                            if !savedAnswers.isEmpty {
                                VStack(alignment: .leading, spacing: 10) {
                                    Text("SAVED ANSWERS")
                                        .font(.system(size: 11, weight: .bold))
                                        .tracking(1.4)
                                        .foregroundColor(Color(hex: "#1B5E20"))
                                    ForEach(savedAnswers) { answer in
                                        PlaybookCard(answer: answer)
                                    }
                                }
                            }
                        }
                        .padding(16)
                    }
                }
            }
            .background(Color(hex: "#F9F6F0"))
            .navigationBarHidden(true)
            .onAppear { Task { await loadAll() } }
        }
    }

    private var headerBanner: some View {
        VStack(spacing: 0) {
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text("My Playbook")
                        .font(.system(size: 22, weight: .bold))
                        .foregroundColor(Color(hex: "#1B5E20"))
                    Text("Your saved lessons")
                        .font(.system(size: 13))
                        .foregroundColor(Color(hex: "#5C5C5C"))
                        .italic()
                }
                Spacer()
                Text("📓").font(.system(size: 32))
            }
            .padding(.horizontal, 16).padding(.vertical, 14)
            Divider()
        }
        .background(Color.white)
    }

    private var emptyState: some View {
        VStack(spacing: 12) {
            Text("📓").font(.system(size: 48))
            Text("Your Playbook is empty")
                .font(.system(size: 17, weight: .bold))
                .foregroundColor(Color(hex: "#1A1A1A"))
            Text("Save videos and answers to build\nyour personal golf notebook")
                .font(.system(size: 14))
                .foregroundColor(Color(hex: "#5C5C5C"))
                .multilineTextAlignment(.center)
        }
        .padding(.top, 60)
        .padding(.horizontal, 32)
    }

    func loadAll() async {
        guard let userId = authViewModel.currentUser?.id else { return }
        isLoading = true

        let answers: [SavedAnswerRecord] = (try? await supabase
            .from("saved_answers")
            .select()
            .eq("user_id", value: userId)
            .order("created_at", ascending: false)
            .execute()
            .value) ?? []
        savedAnswers = answers
        relatedAnswerVideoIds = Set(answers.compactMap { $0.relatedVideoId })

        struct SavedVideoRow: Codable { var videoId: UUID
            enum CodingKeys: String, CodingKey { case videoId = "video_id" }
        }
        let savedRows: [SavedVideoRow] = (try? await supabase
            .from("saved_videos")
            .select("video_id")
            .eq("user_id", value: userId)
            .eq("bag_status", value: "playbook")
            .execute()
            .value) ?? []
        let videoIds = savedRows.map { $0.videoId }

        if !videoIds.isEmpty {
            let videos: [GolfVideo] = (try? await supabase
                .from("videos")
                .select()
                .in("id", values: videoIds.map { $0.uuidString })
                .execute()
                .value) ?? []
            savedVideos = videos
        }

        isLoading = false
    }

    func shortlistVideo(_ video: GolfVideo) async {
        guard let userId = authViewModel.currentUser?.id else { return }
        try? await supabase.from("saved_videos")
            .update(["bag_status": "side_pocket"])
            .eq("user_id", value: userId)
            .eq("video_id", value: video.id)
            .execute()
        savedVideos.removeAll { $0.id == video.id }
    }

    func unsaveVideo(_ video: GolfVideo) async {
        guard let userId = authViewModel.currentUser?.id else { return }
        try? await supabase.from("saved_videos")
            .delete()
            .eq("user_id", value: userId)
            .eq("video_id", value: video.id)
            .execute()
        savedVideos.removeAll { $0.id == video.id }
    }
}

struct PlaybookCard: View {
    let answer: SavedAnswerRecord
    @State private var isExpanded = false

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            Button {
                withAnimation(.easeInOut(duration: 0.2)) { isExpanded.toggle() }
            } label: {
                HStack(alignment: .top, spacing: 12) {
                    Text("💡")
                        .font(.system(size: 18))
                    VStack(alignment: .leading, spacing: 4) {
                        Text(answer.question)
                            .font(.system(size: 15, weight: .bold))
                            .foregroundColor(Color(hex: "#1A1A1A"))
                            .multilineTextAlignment(.leading)
                        if !isExpanded {
                            Text(answer.answer)
                                .font(.system(size: 13))
                                .foregroundColor(Color(hex: "#5C5C5C"))
                                .lineLimit(2)
                        }
                        if answer.relatedVideoId != nil {
                            HStack(spacing: 4) {
                                Image(systemName: "play.rectangle.fill")
                                    .font(.system(size: 10))
                                Text("From a saved video")
                                    .font(.system(size: 11, weight: .semibold))
                            }
                            .foregroundColor(Color(hex: "#1B5E20"))
                        }
                    }
                    Spacer()
                    Image(systemName: isExpanded ? "chevron.up" : "chevron.down")
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundColor(Color(hex: "#1B5E20"))
                }
                .padding(14)
            }
            .buttonStyle(PlainButtonStyle())

            if isExpanded {
                Text(answer.answer)
                    .font(.system(size: 14))
                    .foregroundColor(Color(hex: "#2C2C2C"))
                    .lineSpacing(4)
                    .padding(.horizontal, 14)
                    .padding(.bottom, 14)
            }
        }
        .background(Color.white)
        .cornerRadius(14)
        .overlay(RoundedRectangle(cornerRadius: 14).stroke(Color(hex: "#E0EAE0"), lineWidth: 1))
    }
}

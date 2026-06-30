import SwiftUI
import Supabase

struct SavedVideoFull: Codable, Identifiable {
    var id: UUID
    var userId: UUID
    var videoId: UUID
    var bagStatus: String
    var video: GolfVideo?

    enum CodingKeys: String, CodingKey {
        case id
        case userId = "user_id"
        case videoId = "video_id"
        case bagStatus = "bag_status"
    }
}

struct MyBagView: View {
    @EnvironmentObject var authViewModel: AuthViewModel
    @State private var inBagItem: (savedId: UUID, video: GolfVideo)? = nil
    @State private var sidePocketItems: [(savedId: UUID, video: GolfVideo)] = []
    @State private var relatedAnswers: [UUID: SavedAnswerRecord] = [:]
    @State private var isLoading = true
    @State private var pendingPromotion: (savedId: UUID, video: GolfVideo)? = nil
    @State private var showReplaceConfirm = false

    private let supabase = SupabaseClient.shared.client

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 0) {
                    headerBanner

                    if isLoading {
                        ProgressView().padding(48)
                    } else {
                        VStack(spacing: 24) {
                            inTheBagSection
                            sidePocketSection
                            playbookLinkSection
                        }
                        .padding(.top, 16)
                        .padding(.bottom, 32)
                    }
                }
            }
            .background(Color(hex: "#F9F6F0"))
            .navigationBarHidden(true)
            .onAppear { Task { await loadBag() } }
            .alert("Replace Your Focus?", isPresented: $showReplaceConfirm, presenting: pendingPromotion) { item in
                Button("Replace", role: .destructive) {
                    Task { await promoteToInBag(item) }
                }
                Button("Cancel", role: .cancel) { pendingPromotion = nil }
            } message: { item in
                Text("\"\(item.video.title)\" will replace your current focus. The old one moves to your Side Pocket.")
            }
        }
    }

    // MARK: - Header
    private var headerBanner: some View {
        VStack(spacing: 0) {
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text("MyBag")
                        .font(.system(size: 24, weight: .bold))
                        .foregroundColor(Color(hex: "#1B5E20"))
                    Text("Your skill + game for Saturday")
                        .font(.system(size: 13))
                        .foregroundColor(Color(hex: "#5C5C5C"))
                        .italic()
                }
                Spacer()
                Text("🎒").font(.system(size: 32))
            }
            .padding(.horizontal, 16).padding(.vertical, 14)
            Divider()
        }
        .background(Color.white)
    }

    // MARK: - In The Bag
    private var inTheBagSection: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("IN THE BAG")
                .font(.system(size: 11, weight: .bold))
                .tracking(1.4)
                .foregroundColor(Color(hex: "#1B5E20"))
                .padding(.horizontal, 16)

            if let item = inBagItem {
                VStack(spacing: 0) {
                    HStack(spacing: 4) {
                        Text("⛳").font(.system(size: 13))
                        Text("This week's focus")
                            .font(.system(size: 12, weight: .semibold))
                            .foregroundColor(Color(hex: "#1B5E20"))
                    }
                    .padding(.horizontal, 14).padding(.top, 12)

                    VideoFocusCard(video: item.video, relatedAnswer: relatedAnswers[item.video.id])
                        .padding(14)

                    Button {
                        Task { await demoteToSidePocket(item) }
                    } label: {
                        Text("Move to Side Pocket")
                            .font(.system(size: 13, weight: .semibold))
                            .foregroundColor(Color(hex: "#888888"))
                    }
                    .padding(.bottom, 14)
                }
                .background(Color(hex: "#E8F5E9"))
                .cornerRadius(16)
                .padding(.horizontal, 16)
            } else {
                emptyCard(
                    icon: "⛳",
                    title: "Nothing in the bag yet",
                    subtitle: "Promote something from your Side Pocket or Playbook"
                )
            }
        }
    }

    // MARK: - Side Pocket
    private var sidePocketSection: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                Text("SIDE POCKET")
                    .font(.system(size: 11, weight: .bold))
                    .tracking(1.4)
                    .foregroundColor(Color(hex: "#1B5E20"))
                Spacer()
                Text("\(sidePocketItems.count)/5")
                    .font(.system(size: 11))
                    .foregroundColor(Color(hex: "#888888"))
            }
            .padding(.horizontal, 16)

            if sidePocketItems.isEmpty {
                emptyCard(
                    icon: "🎒",
                    title: "Side Pocket is empty",
                    subtitle: "Shortlist videos from My Playbook to keep them on your radar"
                )
            } else {
                VStack(spacing: 10) {
                    ForEach(sidePocketItems, id: \.savedId) { item in
                        SidePocketCard(
                            video: item.video,
                            relatedAnswer: relatedAnswers[item.video.id],
                            onPromote: {
                                if inBagItem != nil {
                                    pendingPromotion = item
                                    showReplaceConfirm = true
                                } else {
                                    Task { await promoteToInBag(item) }
                                }
                            },
                            onRemove: {
                                Task { await removeFromSidePocket(item) }
                            }
                        )
                    }
                }
                .padding(.horizontal, 16)
            }
        }
    }

    // MARK: - Playbook Link
    private var playbookLinkSection: some View {
        NavigationLink(destination: MyPlaybookView()) {
            HStack {
                Text("📓")
                    .font(.system(size: 20))
                VStack(alignment: .leading, spacing: 2) {
                    Text("Browse My Playbook")
                        .font(.system(size: 15, weight: .bold))
                        .foregroundColor(Color(hex: "#1A1A1A"))
                    Text("Shortlist more videos to your Side Pocket")
                        .font(.system(size: 12))
                        .foregroundColor(Color(hex: "#5C5C5C"))
                }
                Spacer()
                Image(systemName: "chevron.right")
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundColor(Color(hex: "#AAAAAA"))
            }
            .padding(16)
            .background(Color.white)
            .cornerRadius(16)
            .overlay(RoundedRectangle(cornerRadius: 16).stroke(Color(hex: "#E0EAE0"), lineWidth: 1))
        }
        .padding(.horizontal, 16)
    }

    private func emptyCard(icon: String, title: String, subtitle: String) -> some View {
        VStack(spacing: 8) {
            Text(icon).font(.system(size: 32))
            Text(title)
                .font(.system(size: 14, weight: .semibold))
                .foregroundColor(Color(hex: "#1A1A1A"))
            Text(subtitle)
                .font(.system(size: 12))
                .foregroundColor(Color(hex: "#888888"))
                .multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 24)
        .padding(.horizontal, 24)
        .background(Color.white)
        .cornerRadius(16)
        .overlay(RoundedRectangle(cornerRadius: 16).stroke(Color(hex: "#E0EAE0"), style: StrokeStyle(lineWidth: 1, dash: [5])))
        .padding(.horizontal, 16)
    }

    // MARK: - Data
    func loadBag() async {
        guard let userId = authViewModel.currentUser?.id else { return }
        isLoading = true

        struct SavedRow: Codable {
            var id: UUID
            var videoId: UUID
            var bagStatus: String
            enum CodingKeys: String, CodingKey {
                case id, videoId = "video_id", bagStatus = "bag_status"
            }
        }

        let rows: [SavedRow] = (try? await supabase
            .from("saved_videos")
            .select("id, video_id, bag_status")
            .eq("user_id", value: userId)
            .in("bag_status", values: ["in_bag", "side_pocket"])
            .execute()
            .value) ?? []

        let videoIds = rows.map { $0.videoId }
        var videoMap: [UUID: GolfVideo] = [:]
        if !videoIds.isEmpty {
            let videos: [GolfVideo] = (try? await supabase
                .from("videos")
                .select()
                .in("id", values: videoIds.map { $0.uuidString })
                .execute()
                .value) ?? []
            for v in videos { videoMap[v.id] = v }
        }

        if let inBagRow = rows.first(where: { $0.bagStatus == "in_bag" }), let v = videoMap[inBagRow.videoId] {
            inBagItem = (savedId: inBagRow.id, video: v)
        } else {
            inBagItem = nil
        }

        sidePocketItems = rows.filter { $0.bagStatus == "side_pocket" }
            .compactMap { row -> (savedId: UUID, video: GolfVideo)? in
                guard let v = videoMap[row.videoId] else { return nil }
                return (savedId: row.id, video: v)
            }

        // Load related AI explanations for all videos currently in the bag
        let allVideoIds = videoIds
        if !allVideoIds.isEmpty {
            let answers: [SavedAnswerRecord] = (try? await supabase
                .from("saved_answers")
                .select()
                .eq("user_id", value: userId)
                .in("related_video_id", values: allVideoIds.map { $0.uuidString })
                .execute()
                .value) ?? []
            var map: [UUID: SavedAnswerRecord] = [:]
            for a in answers {
                if let vid = a.relatedVideoId { map[vid] = a }
            }
            relatedAnswers = map
        }

        isLoading = false
    }

    func promoteToInBag(_ item: (savedId: UUID, video: GolfVideo)) async {
        // Demote current in_bag to side_pocket first
        if let current = inBagItem {
            try? await supabase.from("saved_videos")
                .update(["bag_status": "side_pocket"])
                .eq("id", value: current.savedId)
                .execute()
        }
        try? await supabase.from("saved_videos")
            .update(["bag_status": "in_bag"])
            .eq("id", value: item.savedId)
            .execute()
        pendingPromotion = nil
        await loadBag()
    }

    func demoteToSidePocket(_ item: (savedId: UUID, video: GolfVideo)) async {
        try? await supabase.from("saved_videos")
            .update(["bag_status": "side_pocket"])
            .eq("id", value: item.savedId)
            .execute()
        await loadBag()
    }

    func removeFromSidePocket(_ item: (savedId: UUID, video: GolfVideo)) async {
        try? await supabase.from("saved_videos")
            .update(["bag_status": "playbook"])
            .eq("id", value: item.savedId)
            .execute()
        await loadBag()
    }
}

// MARK: - In The Bag Card
struct VideoFocusCard: View {
    let video: GolfVideo
    var relatedAnswer: SavedAnswerRecord? = nil
    @State private var showAnswer = false

    var youtubeURL: URL? {
        guard let id = video.youtubeVideoId else { return nil }
        return URL(string: "https://www.youtube.com/watch?v=\(id)")
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            Link(destination: youtubeURL ?? URL(string: "https://youtube.com")!) {
                HStack(spacing: 12) {
                    ZStack {
                        if let thumbUrl = video.thumbnailUrl, let url = URL(string: thumbUrl) {
                            AsyncImage(url: url) { image in
                                image.resizable().aspectRatio(contentMode: .fill)
                            } placeholder: {
                                Color(hex: "#D0E8D0")
                            }
                            .frame(width: 100, height: 72)
                            .clipShape(RoundedRectangle(cornerRadius: 12))
                        } else {
                            RoundedRectangle(cornerRadius: 12)
                                .fill(Color(hex: "#D0E8D0"))
                                .frame(width: 100, height: 72)
                        }
                        Image(systemName: "play.fill")
                            .font(.system(size: 20))
                            .foregroundColor(.white)
                            .shadow(radius: 2)
                    }
                    VStack(alignment: .leading, spacing: 4) {
                        Text(video.title)
                            .font(.system(size: 15, weight: .bold))
                            .foregroundColor(Color(hex: "#1A1A1A"))
                            .lineLimit(2)
                        if let channel = video.channelName {
                            Text(channel)
                                .font(.system(size: 12))
                                .foregroundColor(Color(hex: "#5C5C5C"))
                        }
                        if let bucket = video.primaryBucket {
                            Text(bucket.replacingOccurrences(of: "_", with: " ").capitalized)
                                .font(.system(size: 11, weight: .semibold))
                                .foregroundColor(.white)
                                .padding(.horizontal, 8).padding(.vertical, 3)
                                .background(Color(hex: "#1B5E20"))
                                .cornerRadius(10)
                        }
                    }
                    Spacer()
                }
            }

            if let answer = relatedAnswer {
                Button {
                    withAnimation(.easeInOut(duration: 0.2)) { showAnswer.toggle() }
                } label: {
                    HStack(spacing: 6) {
                        Image(systemName: "text.bubble.fill").font(.system(size: 12))
                        Text("AI Explanation")
                            .font(.system(size: 12, weight: .semibold))
                        Spacer()
                        Image(systemName: showAnswer ? "chevron.up" : "chevron.down")
                            .font(.system(size: 10, weight: .semibold))
                    }
                    .foregroundColor(Color(hex: "#1B5E20"))
                    .padding(.horizontal, 12).padding(.vertical, 8)
                    .background(Color.white)
                    .cornerRadius(10)
                }
                if showAnswer {
                    Text(answer.answer)
                        .font(.system(size: 13))
                        .foregroundColor(Color(hex: "#2C2C2C"))
                        .lineSpacing(3)
                        .padding(12)
                        .background(Color.white)
                        .cornerRadius(10)
                }
            }
        }
    }
}

// MARK: - Side Pocket Card
struct SidePocketCard: View {
    let video: GolfVideo
    var relatedAnswer: SavedAnswerRecord? = nil
    let onPromote: () -> Void
    let onRemove: () -> Void

    var body: some View {
        HStack(spacing: 12) {
            ZStack {
                if let thumbUrl = video.thumbnailUrl, let url = URL(string: thumbUrl) {
                    AsyncImage(url: url) { image in
                        image.resizable().aspectRatio(contentMode: .fill)
                    } placeholder: {
                        Color(hex: "#E8F5E9")
                    }
                    .frame(width: 64, height: 46)
                    .clipShape(RoundedRectangle(cornerRadius: 8))
                } else {
                    RoundedRectangle(cornerRadius: 8)
                        .fill(Color(hex: "#E8F5E9"))
                        .frame(width: 64, height: 46)
                }
            }
            VStack(alignment: .leading, spacing: 2) {
                Text(video.title)
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundColor(Color(hex: "#1A1A1A"))
                    .lineLimit(1)
                HStack(spacing: 6) {
                    if let channel = video.channelName {
                        Text(channel)
                            .font(.system(size: 11))
                            .foregroundColor(Color(hex: "#888888"))
                    }
                    if relatedAnswer != nil {
                        Image(systemName: "text.bubble.fill")
                            .font(.system(size: 9))
                            .foregroundColor(Color(hex: "#1B5E20"))
                    }
                }
            }
            Spacer()
            Button(action: onPromote) {
                Text("Use This")
                    .font(.system(size: 11, weight: .semibold))
                    .foregroundColor(.white)
                    .padding(.horizontal, 10).padding(.vertical, 6)
                    .background(Color(hex: "#1B5E20"))
                    .cornerRadius(12)
            }
            Button(action: onRemove) {
                Image(systemName: "xmark.circle.fill")
                    .font(.system(size: 16))
                    .foregroundColor(Color(hex: "#CCCCCC"))
            }
        }
        .padding(10)
        .background(Color.white)
        .cornerRadius(14)
        .overlay(RoundedRectangle(cornerRadius: 14).stroke(Color(hex: "#E0EAE0"), lineWidth: 1))
    }
}

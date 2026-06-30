import SwiftUI
import Supabase

struct ChannelCount: Codable, Identifiable {
    var channelName: String
    var videoCount: Int
    var id: String { channelName }

    enum CodingKeys: String, CodingKey {
        case channelName = "channel_name"
        case videoCount = "video_count"
    }
}

struct GolfVideo: Codable, Identifiable {
    var id: UUID
    var title: String
    var youtubeVideoId: String?
    var thumbnailUrl: String?
    var primaryBucket: String?
    var proId: UUID?
    var channelName: String?

    enum CodingKeys: String, CodingKey {
        case id, title
        case youtubeVideoId = "youtube_video_id"
        case thumbnailUrl = "thumbnail_url"
        case primaryBucket = "primary_bucket"
        case proId = "pro_id"
        case channelName = "channel_name"
    }
}

struct GolfTVView: View {
    @EnvironmentObject var authViewModel: AuthViewModel
    @State private var videos: [GolfVideo] = []
    @State private var isLoading = true
    @State private var isLoadingMore = false
    @State private var selectedBucket: String = "all"
    @State private var coreChannels: [ChannelCount] = []
    @State private var selectedChannel: String? = nil
    @State private var pendingExplainVideo: GolfVideo? = nil
    @State private var showExplainPrompt = false
    @State private var isExplaining = false
    @State private var savedVideoIds: Set<UUID> = []
    @State private var explainedVideoIds: Set<UUID> = []
    @State private var currentPage = 0
    @State private var hasMore = true
    private let pageSize = 30

    private let supabase = SupabaseClient.shared.client

    let buckets: [(key: String, label: String, icon: String)] = [
        ("all", "All", "square.grid.2x2"),
        ("full_swing", "Full Swing", "figure.golf"),
        ("short_game", "Short Game", "scope"),
        ("putting", "Putting", "circle.dotted"),
        ("course_management", "Course Mgmt", "map")
    ]

    var filteredVideos: [GolfVideo] {
        selectedBucket == "all" ? videos : videos.filter { $0.primaryBucket == selectedBucket }
    }

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                headerBanner
                creatorRow
                bucketFilter

                if isLoading {
                    ProgressView().padding(48)
                    Spacer()
                } else if filteredVideos.isEmpty {
                    VStack(spacing: 12) {
                        Text("📺").font(.system(size: 48))
                        Text("No videos yet in this category")
                            .font(.system(size: 15))
                            .foregroundColor(Color(hex: "#5C5C5C"))
                    }
                    .padding(.top, 60)
                    Spacer()
                } else {
                    ScrollView {
                        LazyVStack(spacing: 12) {
                            ForEach(filteredVideos) { video in
                                VideoRow(
                                    video: video,
                                    isSaved: savedVideoIds.contains(video.id),
                                    isExplained: explainedVideoIds.contains(video.id),
                                    onSave: { Task { await toggleSave(video) } }
                                )
                            }

                            if hasMore && selectedBucket == "all" {
                                if isLoadingMore {
                                    ProgressView().padding(.vertical, 16)
                                } else {
                                    Button {
                                        Task { await loadMoreVideos() }
                                    } label: {
                                        Text("Load More Videos")
                                            .font(.system(size: 14, weight: .semibold))
                                            .foregroundColor(Color(hex: "#1B5E20"))
                                            .padding(.vertical, 14)
                                            .frame(maxWidth: .infinity)
                                            .background(Color(hex: "#E8F5E9"))
                                            .cornerRadius(14)
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
            .onAppear { Task { await loadVideos() } }
            .alert("Want AI to Explain This?", isPresented: $showExplainPrompt, presenting: pendingExplainVideo) { video in
                Button("Yes, Explain It") {
                    Task { await explainVideo(video) }
                }
                Button("Just Save the Video", role: .cancel) {
                    pendingExplainVideo = nil
                }
            } message: { video in
                Text("Ask The Pro can write a quick explanation of \"\(video.title)\" and save it to your Playbook too.")
            }
        }
    }

    private var headerBanner: some View {
        VStack(spacing: 0) {
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text("Golf TV")
                        .font(.system(size: 22, weight: .bold))
                        .foregroundColor(Color(hex: "#1B5E20"))
                    Text("Watch and learn")
                        .font(.system(size: 13))
                        .foregroundColor(Color(hex: "#5C5C5C"))
                        .italic()
                }
                Spacer()
                Text("📺").font(.system(size: 32))
            }
            .padding(.horizontal, 16).padding(.vertical, 14)
            Divider()
        }
        .background(Color.white)
    }

    private var creatorRow: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 10) {
                Button {
                    selectedChannel = nil
                    Task { await loadVideos() }
                } label: {
                    VStack(spacing: 6) {
                        ZStack {
                            Circle().fill(Color(hex: "#E8F5E9")).frame(width: 52, height: 52)
                            Text("⛳").font(.system(size: 22))
                        }
                        Text("All")
                            .font(.system(size: 11, weight: .semibold))
                            .foregroundColor(selectedChannel == nil ? Color(hex: "#1B5E20") : Color(hex: "#888888"))
                    }
                }

                ForEach(coreChannels) { channel in
                    Button {
                        if selectedChannel == channel.channelName {
                            selectedChannel = nil
                            Task { await loadVideos() }
                        } else {
                            selectedChannel = channel.channelName
                            Task { await loadVideosForChannel(channel.channelName) }
                        }
                    } label: {
                        VStack(spacing: 6) {
                            ZStack {
                                Circle()
                                    .fill(selectedChannel == channel.channelName ? Color(hex: "#1B5E20") : Color(hex: "#E8F5E9"))
                                    .frame(width: 52, height: 52)
                                Text(String(channel.channelName.prefix(1)))
                                    .font(.system(size: 18, weight: .bold))
                                    .foregroundColor(selectedChannel == channel.channelName ? .white : Color(hex: "#1B5E20"))
                            }
                            Text(channel.channelName)
                                .font(.system(size: 11, weight: .semibold))
                                .foregroundColor(selectedChannel == channel.channelName ? Color(hex: "#1B5E20") : Color(hex: "#888888"))
                                .lineLimit(1)
                                .frame(width: 64)
                        }
                    }
                }
            }
            .padding(.horizontal, 16).padding(.vertical, 12)
        }
        .background(Color.white)
    }

    private var bucketFilter: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                ForEach(buckets, id: \.key) { bucket in
                    Button {
                        selectedBucket = bucket.key
                    } label: {
                        HStack(spacing: 6) {
                            Image(systemName: bucket.icon).font(.system(size: 12))
                            Text(bucket.label).font(.system(size: 13, weight: .semibold))
                        }
                        .foregroundColor(selectedBucket == bucket.key ? .white : Color(hex: "#1B5E20"))
                        .padding(.horizontal, 14).padding(.vertical, 8)
                        .background(selectedBucket == bucket.key ? Color(hex: "#1B5E20") : Color(hex: "#E8F5E9"))
                        .cornerRadius(20)
                    }
                }
            }
            .padding(.horizontal, 16).padding(.vertical, 10)
        }
        .background(Color.white)
    }

    func loadVideos() async {
        isLoading = true
        currentPage = 0
        await loadCoreChannels()
        do {
            let result: [GolfVideo] = try await supabase
                .from("videos")
                .select()
                .eq("editorial_status", value: "approved")
                .order("published_at", ascending: false)
                .range(from: 0, to: pageSize - 1)
                .execute()
                .value
            videos = result
            hasMore = result.count == pageSize
            print("✅ Loaded \(result.count) videos")
        } catch {
            print("❌ Video load error: \(error)")
        }
        await loadSavedVideos()
        await loadExplainedVideos()
        isLoading = false
    }

    func loadExplainedVideos() async {
        guard let userId = authViewModel.currentUser?.id else { return }
        struct ExplainedRow: Codable { var relatedVideoId: UUID?
            enum CodingKeys: String, CodingKey { case relatedVideoId = "related_video_id" }
        }
        let result: [ExplainedRow] = (try? await supabase
            .from("saved_answers")
            .select("related_video_id")
            .eq("user_id", value: userId)
            .not("related_video_id", operator: .is, value: "null")
            .execute()
            .value) ?? []
        explainedVideoIds = Set(result.compactMap { $0.relatedVideoId })
    }

    func loadVideosForChannel(_ channel: String) async {
        isLoading = true
        hasMore = false
        do {
            let result: [GolfVideo] = try await supabase
                .from("videos")
                .select()
                .eq("editorial_status", value: "approved")
                .eq("channel_name", value: channel)
                .order("published_at", ascending: false)
                .execute()
                .value
            videos = result
        } catch {
            print("❌ Channel load error: \(error)")
        }
        isLoading = false
    }

    func loadCoreChannels() async {
        let result: [ChannelCount] = (try? await supabase
            .from("channel_video_counts")
            .select()
            .gte("video_count", value: 10)
            .order("video_count", ascending: false)
            .execute()
            .value) ?? []
        coreChannels = result
    }

    func loadMoreVideos() async {
        isLoadingMore = true
        currentPage += 1
        let from = currentPage * pageSize
        let to = from + pageSize - 1
        do {
            let result: [GolfVideo] = try await supabase
                .from("videos")
                .select()
                .eq("editorial_status", value: "approved")
                .order("published_at", ascending: false)
                .range(from: from, to: to)
                .execute()
                .value
            videos.append(contentsOf: result)
            hasMore = result.count == pageSize
        } catch {
            print("❌ Load more error: \(error)")
        }
        isLoadingMore = false
    }

    func loadSavedVideos() async {
        guard let userId = authViewModel.currentUser?.id else { return }
        struct SavedVideoRow: Codable { var videoId: UUID
            enum CodingKeys: String, CodingKey { case videoId = "video_id" }
        }
        let result: [SavedVideoRow] = (try? await supabase
            .from("saved_videos")
            .select("video_id")
            .eq("user_id", value: userId)
            .execute()
            .value) ?? []
        savedVideoIds = Set(result.map { $0.videoId })
    }

    func toggleSave(_ video: GolfVideo) async {
        guard let userId = authViewModel.currentUser?.id else { return }
        if savedVideoIds.contains(video.id) {
            try? await supabase.from("saved_videos")
                .delete()
                .eq("user_id", value: userId)
                .eq("video_id", value: video.id)
                .execute()
            savedVideoIds.remove(video.id)
        } else {
            struct NewSavedVideo: Codable {
                var userId: UUID
                var videoId: UUID
                enum CodingKeys: String, CodingKey {
                    case userId = "user_id", videoId = "video_id"
                }
            }
            try? await supabase.from("saved_videos")
                .insert(NewSavedVideo(userId: userId, videoId: video.id))
                .execute()
            savedVideoIds.insert(video.id)
            pendingExplainVideo = video
            showExplainPrompt = true
        }
    }

    func explainVideo(_ video: GolfVideo) async {
        guard let userId = authViewModel.currentUser?.id else { return }
        isExplaining = true
        let question = video.title

        guard let url = URL(string: "https://golf-ai-companion.vercel.app/api/explain-video") else { isExplaining = false; return }
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        let body: [String: Any] = ["videoTitle": video.title]
        request.httpBody = try? JSONSerialization.data(withJSONObject: body)

        do {
            let (data, _) = try await URLSession.shared.data(for: request)
            if let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
               let explanation = json["explanation"] as? String {
                struct NewSavedAnswer: Codable {
                    var userId: UUID
                    var question: String
                    var answer: String
                    var relatedVideoId: UUID
                    enum CodingKeys: String, CodingKey {
                        case userId = "user_id", question, answer
                        case relatedVideoId = "related_video_id"
                    }
                }
                let saved = NewSavedAnswer(userId: userId, question: question, answer: explanation, relatedVideoId: video.id)
                try? await supabase.from("saved_answers").insert(saved).execute()
                explainedVideoIds.insert(video.id)
            }
        } catch {
            print("❌ Explain error: \(error)")
        }
        isExplaining = false
        pendingExplainVideo = nil
    }
}

struct VideoRow: View {
    let video: GolfVideo
    let isSaved: Bool
    var isExplained: Bool = false
    let onSave: () -> Void

    var youtubeURL: URL? {
        guard let id = video.youtubeVideoId else { return nil }
        return URL(string: "https://www.youtube.com/watch?v=\(id)")
    }

    var body: some View {
        HStack(spacing: 12) {
            Link(destination: youtubeURL ?? URL(string: "https://youtube.com")!) {
                HStack(spacing: 12) {
                    ZStack {
                        if let thumbUrl = video.thumbnailUrl, let url = URL(string: thumbUrl) {
                            AsyncImage(url: url) { image in
                                image.resizable().aspectRatio(contentMode: .fill)
                            } placeholder: {
                                Color(hex: "#E8F5E9")
                            }
                            .frame(width: 90, height: 64)
                            .clipShape(RoundedRectangle(cornerRadius: 10))
                        } else {
                            RoundedRectangle(cornerRadius: 10)
                                .fill(Color(hex: "#E8F5E9"))
                                .frame(width: 90, height: 64)
                        }
                        Image(systemName: "play.fill")
                            .font(.system(size: 18))
                            .foregroundColor(.white)
                            .shadow(radius: 2)
                    }
                    VStack(alignment: .leading, spacing: 4) {
                        Text(video.title)
                            .font(.system(size: 14, weight: .semibold))
                            .foregroundColor(Color(hex: "#1A1A1A"))
                            .lineLimit(2)
                        HStack(spacing: 6) {
                            if let channel = video.channelName {
                                Text(channel)
                                    .font(.system(size: 11))
                                    .foregroundColor(Color(hex: "#888888"))
                            }
                            if let bucket = video.primaryBucket {
                                Text(bucket.replacingOccurrences(of: "_", with: " ").capitalized)
                                    .font(.system(size: 11, weight: .semibold))
                                    .foregroundColor(Color(hex: "#1B5E20"))
                            }
                            if isExplained {
                                HStack(spacing: 3) {
                                    Image(systemName: "text.bubble.fill").font(.system(size: 9))
                                    Text("AI Explained").font(.system(size: 10, weight: .semibold))
                                }
                                .foregroundColor(.white)
                                .padding(.horizontal, 6).padding(.vertical, 2)
                                .background(Color(hex: "#1B5E20"))
                                .cornerRadius(8)
                            }
                        }
                    }
                    Spacer()
                }
            }

            Button(action: onSave) {
                Image(systemName: isSaved ? "bookmark.fill" : "bookmark")
                    .font(.system(size: 17))
                    .foregroundColor(isSaved ? Color(hex: "#1B5E20") : Color(hex: "#CCCCCC"))
            }
        }
        .padding(10)
        .background(Color.white)
        .cornerRadius(14)
        .overlay(RoundedRectangle(cornerRadius: 14).stroke(Color(hex: "#E0EAE0"), lineWidth: 1))
    }
}

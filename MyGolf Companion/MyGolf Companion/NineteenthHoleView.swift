import SwiftUI
import Supabase
import PhotosUI

// MARK: - Models
struct GolfMemory: Codable, Identifiable {
    var id: UUID?
    var userId: UUID?
    var photoUrl: String?
    var caption: String
    var memoryDate: String
    var createdAt: Date?

    enum CodingKeys: String, CodingKey {
        case id, caption
        case userId = "user_id"
        case photoUrl = "photo_url"
        case memoryDate = "memory_date"
        case createdAt = "created_at"
    }
}

struct GolfJournalEntry: Codable, Identifiable {
    var id: UUID?
    var userId: UUID?
    var title: String?
    var entry: String
    var entryDate: String
    var createdAt: Date?

    enum CodingKeys: String, CodingKey {
        case id, title, entry
        case userId = "user_id"
        case entryDate = "entry_date"
        case createdAt = "created_at"
    }
}

// MARK: - Main View
struct NineteenthHoleView: View {
    @EnvironmentObject var authViewModel: AuthViewModel
    @State private var memories: [GolfMemory] = []
    @State private var journalEntries: [GolfJournalEntry] = []
    @State private var currentGameCard: GameCard? = nil
    @State private var isLoading = true
    @State private var showAddMemory = false
    @State private var showAddJournal = false

    private let supabase = SupabaseClient.shared.client

    var groupedMemories: [(month: String, items: [GolfMemory])] {
        let formatter = DateFormatter()
        formatter.dateFormat = "MMMM yyyy"
        let grouped = Dictionary(grouping: memories) { m -> String in
            let f = DateFormatter(); f.dateFormat = "yyyy-MM-dd"
            let date = f.date(from: m.memoryDate) ?? Date()
            return formatter.string(from: date)
        }
        return grouped.keys.sorted { a, b in
            let f = DateFormatter(); f.dateFormat = "MMMM yyyy"
            return (f.date(from: a) ?? Date.distantPast) > (f.date(from: b) ?? Date.distantPast)
        }.map { (month: $0, items: grouped[$0]!) }
    }

    var groupedJournal: [(month: String, items: [GolfJournalEntry])] {
        let formatter = DateFormatter()
        formatter.dateFormat = "MMMM yyyy"
        let grouped = Dictionary(grouping: journalEntries) { e -> String in
            let f = DateFormatter(); f.dateFormat = "yyyy-MM-dd"
            let date = f.date(from: e.entryDate) ?? Date()
            return formatter.string(from: date)
        }
        return grouped.keys.sorted { a, b in
            let f = DateFormatter(); f.dateFormat = "MMMM yyyy"
            return (f.date(from: a) ?? Date.distantPast) > (f.date(from: b) ?? Date.distantPast)
        }.map { (month: $0, items: grouped[$0]!) }
    }

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Sticky header — never scrolls
                headerBanner

                ScrollView {
                    VStack(spacing: 0) {
                        if isLoading {
                            ProgressView().padding(48)
                        } else {
                            VStack(spacing: 24) {
                                // Add buttons row
                                HStack(spacing: 12) {
                                    Button { showAddMemory = true } label: {
                                        HStack(spacing: 6) {
                                            Image(systemName: "photo").font(.system(size: 14))
                                            Text("Add Memory").font(.system(size: 14, weight: .semibold))
                                        }
                                        .foregroundColor(.white)
                                        .frame(maxWidth: .infinity).padding(.vertical, 12)
                                        .background(Color(hex: "#1B5E20")).cornerRadius(12)
                                    }
                                    Button { showAddJournal = true } label: {
                                        HStack(spacing: 6) {
                                            Image(systemName: "pencil").font(.system(size: 14))
                                            Text("Add Journal").font(.system(size: 14, weight: .semibold))
                                        }
                                        .foregroundColor(Color(hex: "#1B5E20"))
                                        .frame(maxWidth: .infinity).padding(.vertical, 12)
                                        .background(Color(hex: "#E8F5E9")).cornerRadius(12)
                                        .overlay(RoundedRectangle(cornerRadius: 12).stroke(Color(hex: "#1B5E20"), lineWidth: 1))
                                    }
                                }
                                .padding(.horizontal, 16)

                                // 1. This Week's Game
                                thisWeeksGameSection

                                // 2. Photo Memories
                                photoMemoriesSection

                                // 3. Golf Journal
                                golfJournalSection
                            }
                            .padding(.top, 16)
                            .padding(.bottom, 32)
                        }
                    }
                } // ScrollView
                .background(Color(hex: "#F9F6F0"))
            }
            .background(Color(hex: "#F9F6F0"))
            .navigationBarHidden(true)
            .onAppear { Task { await loadAll() } }
            .sheet(isPresented: $showAddMemory) {
                AddMemoryView(onSave: { memory in
                    Task { await saveMemory(memory) }
                    showAddMemory = false
                })
            }
            .sheet(isPresented: $showAddJournal) {
                AddJournalView(onSave: { entry in
                    Task { await saveJournalEntry(entry) }
                    showAddJournal = false
                })
            }
        }
    }

    // MARK: - Header
    private var headerBanner: some View {
        VStack(spacing: 0) {
            HStack {
                Image("19th-hole")
                    .resizable()
                    .scaledToFit()
                    .frame(maxWidth: .infinity)
                Spacer()
            }
            .padding(.horizontal, 16).padding(.vertical, 14)
            Divider()
        }
        .background(Color.white)
    }

    // MARK: - This Week's Game
    private var thisWeeksGameSection: some View {
        VStack(alignment: .leading, spacing: 10) {
            sectionHeader(title: "THIS WEEK'S GAME", icon: "🏆")

            if let card = currentGameCard {
                ThisWeeksGameCard(card: card)
                    .padding(.horizontal, 16)
            } else {
                emptyCard(
                    icon: "🏆",
                    message: "No game card yet — head to I Had a Five™ to settle it."
                )
            }
        }
    }

    // MARK: - Photo Memories
    private var photoMemoriesSection: some View {
        VStack(alignment: .leading, spacing: 10) {
            sectionHeader(title: "PHOTO MEMORIES", icon: "📸")

            if memories.isEmpty {
                emptyCard(icon: "📸", message: "Add your first golf photo memory.")
            } else {
                ForEach(groupedMemories, id: \.month) { group in
                    CollapsibleMonthSection(month: group.month) {
                        ForEach(group.items) { memory in
                            MemoryCard(memory: memory, onDelete: {
                                Task { await deleteMemory(memory) }
                            })
                            .padding(.horizontal, 16)
                        }
                    }
                }
            }
        }
    }

    // MARK: - Golf Journal
    private var golfJournalSection: some View {
        VStack(alignment: .leading, spacing: 10) {
            sectionHeader(title: "GOLF JOURNAL", icon: "📓")

            if journalEntries.isEmpty {
                emptyCard(icon: "📓", message: "Your private golf reflections live here.")
            } else {
                ForEach(groupedJournal, id: \.month) { group in
                    CollapsibleMonthSection(month: group.month) {
                        ForEach(group.items) { entry in
                            JournalCard(entry: entry, onDelete: {
                                Task { await deleteJournalEntry(entry) }
                            })
                            .padding(.horizontal, 16)
                        }
                    }
                }
            }
        }
    }

    // MARK: - Helpers
    private func sectionHeader(title: String, icon: String) -> some View {
        HStack(spacing: 6) {
            Text(icon).font(.system(size: 14))
            Text(title)
                .font(.system(size: 11, weight: .bold))
                .tracking(1.4)
                .foregroundColor(Color(hex: "#1B5E20"))
        }
        .padding(.horizontal, 16)
    }

    private func emptyCard(icon: String, message: String) -> some View {
        HStack(spacing: 10) {
            Text(icon).font(.system(size: 20))
            Text(message)
                .font(.system(size: 13))
                .foregroundColor(Color(hex: "#888888"))
                .italic()
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color.white)
        .cornerRadius(14)
        .overlay(RoundedRectangle(cornerRadius: 14).stroke(Color(hex: "#E0EAE0"), style: StrokeStyle(lineWidth: 1, dash: [5])))
        .padding(.horizontal, 16)
    }

    // MARK: - Data
    func loadAll() async {
        guard let userId = authViewModel.currentUser?.id else { return }
        isLoading = true

        let cards: [GameCard] = (try? await supabase
            .from("game_cards")
            .select()
            .eq("user_id", value: userId)
            .order("created_at", ascending: false)
            .limit(1)
            .execute()
            .value) ?? []
        currentGameCard = cards.first

        let mems: [GolfMemory] = (try? await supabase
            .from("golf_memories")
            .select()
            .eq("user_id", value: userId)
            .order("memory_date", ascending: false)
            .execute()
            .value) ?? []
        memories = mems

        let entries: [GolfJournalEntry] = (try? await supabase
            .from("golf_journal")
            .select()
            .eq("user_id", value: userId)
            .order("entry_date", ascending: false)
            .execute()
            .value) ?? []
        journalEntries = entries

        isLoading = false
    }

    func saveMemory(_ memory: GolfMemory) async {
        guard let userId = authViewModel.currentUser?.id else { return }
        var m = memory; m.userId = userId
        try? await supabase.from("golf_memories").insert(m).execute()
        await loadAll()
    }

    func deleteMemory(_ memory: GolfMemory) async {
        guard let id = memory.id else { return }
        try? await supabase.from("golf_memories").delete().eq("id", value: id).execute()
        memories.removeAll { $0.id == id }
    }

    func saveJournalEntry(_ entry: GolfJournalEntry) async {
        guard let userId = authViewModel.currentUser?.id else { return }
        var e = entry; e.userId = userId
        try? await supabase.from("golf_journal").insert(e).execute()
        await loadAll()
    }

    func deleteJournalEntry(_ entry: GolfJournalEntry) async {
        guard let id = entry.id else { return }
        try? await supabase.from("golf_journal").delete().eq("id", value: id).execute()
        journalEntries.removeAll { $0.id == id }
    }
}

// MARK: - This Week's Game Card
struct ThisWeeksGameCard: View {
    let card: GameCard
    @State private var isExpanded = false

    var formattedDate: String {
        let display = DateFormatter()
        display.dateStyle = .long
        return display.string(from: card.createdAt ?? Date())
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            Button {
                withAnimation(.easeInOut(duration: 0.2)) { isExpanded.toggle() }
            } label: {
                HStack {
                    VStack(alignment: .leading, spacing: 2) {
                        Text(card.situationTitle ?? "I Had a Five™")
                            .font(.system(size: 16, weight: .bold))
                            .foregroundColor(Color(hex: "#1A1A1A"))
                        Text("Created by \(card.createdBy) · \(formattedDate)")
                            .font(.system(size: 12))
                            .foregroundColor(Color(hex: "#888888"))
                    }
                    Spacer()
                    Image(systemName: isExpanded ? "chevron.up" : "chevron.down")
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundColor(Color(hex: "#1B5E20"))
                }
                .padding(14)
                .background(Color(hex: "#E8F5E9"))
            }
            .buttonStyle(PlainButtonStyle())

            if isExpanded {
                Text(card.gameContent)
                    .font(.system(size: 14))
                    .foregroundColor(Color(hex: "#2C2C2C"))
                    .padding(14)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(Color.white)
            }
        }
        .cornerRadius(16)
        .shadow(color: Color.black.opacity(0.05), radius: 4, x: 0, y: 2)
    }
}

// MARK: - Collapsible Month Section
struct CollapsibleMonthSection<Content: View>: View {
    let month: String
    @State private var isExpanded = false
    @ViewBuilder let content: () -> Content

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Button {
                withAnimation(.easeInOut(duration: 0.2)) { isExpanded.toggle() }
            } label: {
                HStack(spacing: 10) {
                    Rectangle()
                        .fill(Color(hex: "#1B5E20").opacity(0.3))
                        .frame(height: 1)
                    Text(month.uppercased())
                        .font(.system(size: 13, weight: .bold))
                        .tracking(1.6)
                        .foregroundColor(Color(hex: "#1B5E20"))
                        .fixedSize()
                    Image(systemName: isExpanded ? "chevron.up" : "chevron.down")
                        .font(.system(size: 12, weight: .bold))
                        .foregroundColor(Color(hex: "#1B5E20"))
                    Rectangle()
                        .fill(Color(hex: "#1B5E20").opacity(0.3))
                        .frame(height: 1)
                }
                .padding(.horizontal, 16)
                .padding(.vertical, 10)
                .background(Color(hex: "#F9F6F0"))
            }
            .buttonStyle(PlainButtonStyle())

            if isExpanded {
                VStack(spacing: 8) {
                    content()
                }
            }
        }
    }
}

// MARK: - Memory Card
struct MemoryCard: View {
    let memory: GolfMemory
    let onDelete: () -> Void
    @State private var showDeleteConfirm = false
    @State private var showShareSheet = false
    @State private var showPhoto = false

    var formattedDate: String {
        let f = DateFormatter(); f.dateFormat = "yyyy-MM-dd"
        if let date = f.date(from: memory.memoryDate) {
            let d = DateFormatter(); d.dateStyle = .long
            return d.string(from: date)
        }
        return memory.memoryDate
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            VStack(alignment: .leading, spacing: 8) {
                Text(memory.caption)
                    .font(.system(size: 15))
                    .foregroundColor(Color(hex: "#1A1A1A"))
                    .lineSpacing(3)

                HStack {
                    Text(formattedDate)
                        .font(.system(size: 12))
                        .foregroundColor(Color(hex: "#AAAAAA"))
                    Spacer()
                    HStack(spacing: 20) {
                        if memory.photoUrl != nil {
                            Button {
                                withAnimation(.easeInOut(duration: 0.2)) { showPhoto.toggle() }
                            } label: {
                                Image(systemName: showPhoto ? "photo.fill" : "photo")
                                    .font(.system(size: 20))
                                    .foregroundColor(Color(hex: "#1B5E20"))
                            }
                        }
                        Button { showShareSheet = true } label: {
                            Image(systemName: "square.and.arrow.up")
                                .font(.system(size: 20))
                                .foregroundColor(Color(hex: "#1B5E20"))
                        }
                        Button { showDeleteConfirm = true } label: {
                            Image(systemName: "trash")
                                .font(.system(size: 20))
                                .foregroundColor(Color(hex: "#CCCCCC"))
                        }
                    }
                }
            }
            .padding(14)

            if showPhoto, let photoUrl = memory.photoUrl, let url = URL(string: photoUrl) {
                AsyncImage(url: url) { image in
                    image.resizable().aspectRatio(contentMode: .fit)
                        .frame(maxWidth: .infinity).frame(maxHeight: 280).clipped()
                } placeholder: {
                    Rectangle().fill(Color(hex: "#E8F5E9")).frame(height: 200).overlay(ProgressView())
                }
            }
        }
        .background(Color.white)
        .cornerRadius(14)
        .overlay(
            HStack {
                Rectangle()
                    .fill(Color(hex: "#1B5E20"))
                    .frame(width: 4)
                Spacer()
            }
            .clipShape(RoundedRectangle(cornerRadius: 14))
        )
        .shadow(color: Color.black.opacity(0.04), radius: 4, x: 0, y: 2)
        .alert("Delete this memory?", isPresented: $showDeleteConfirm) {
            Button("Delete", role: .destructive, action: onDelete)
            Button("Cancel", role: .cancel) {}
        }
        .sheet(isPresented: $showShareSheet) {
            if let photoUrl = memory.photoUrl, let url = URL(string: photoUrl) {
                ShareSheet(items: [url, memory.caption])
            } else {
                ShareSheet(items: [memory.caption])
            }
        }
    }
}

// MARK: - Journal Card
struct JournalCard: View {
    let entry: GolfJournalEntry
    let onDelete: () -> Void
    @State private var isExpanded = false
    @State private var showDeleteConfirm = false

    var formattedDate: String {
        let f = DateFormatter(); f.dateFormat = "yyyy-MM-dd"
        if let date = f.date(from: entry.entryDate) {
            let d = DateFormatter(); d.dateStyle = .long
            return d.string(from: date)
        }
        return entry.entryDate
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            Button {
                withAnimation(.easeInOut(duration: 0.2)) { isExpanded.toggle() }
            } label: {
                HStack(alignment: .top) {
                    VStack(alignment: .leading, spacing: 3) {
                        if let title = entry.title, !title.isEmpty {
                            Text(title)
                                .font(.system(size: 15, weight: .bold))
                                .foregroundColor(Color(hex: "#1A1A1A"))
                        } else {
                            Text(entry.entry)
                                .font(.system(size: 15, weight: .semibold))
                                .foregroundColor(Color(hex: "#1A1A1A"))
                                .lineLimit(1)
                        }
                        Text(formattedDate)
                            .font(.system(size: 12))
                            .foregroundColor(Color(hex: "#888888"))
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
                VStack(alignment: .leading, spacing: 12) {
                    Text(entry.entry)
                        .font(.system(size: 14))
                        .foregroundColor(Color(hex: "#2C2C2C"))
                        .lineSpacing(5)

                    HStack {
                        Spacer()
                        Button { showDeleteConfirm = true } label: {
                            Image(systemName: "trash")
                                .font(.system(size: 14))
                                .foregroundColor(Color(hex: "#CCCCCC"))
                        }
                    }
                }
                .padding(14)
                .background(Color(hex: "#FAFAFA"))
            }
        }
        .background(Color.white)
        .cornerRadius(14)
        .shadow(color: Color.black.opacity(0.05), radius: 4, x: 0, y: 2)
        .alert("Delete this journal entry?", isPresented: $showDeleteConfirm) {
            Button("Delete", role: .destructive, action: onDelete)
            Button("Cancel", role: .cancel) {}
        }
    }
}

// MARK: - Add Memory View
struct AddMemoryView: View {
    let onSave: (GolfMemory) -> Void
    @Environment(\.dismiss) var dismiss
    @EnvironmentObject var authViewModel: AuthViewModel

    @State private var caption = ""
    @State private var memoryDate = Date()
    @State private var selectedPhoto: PhotosPickerItem? = nil
    @State private var selectedImage: UIImage? = nil
    @State private var isUploading = false
    @State private var isGeneratingCaption = false

    private let supabase = SupabaseClient.shared.client

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 20) {
                    PhotosPicker(selection: $selectedPhoto, matching: .images) {
                        if let image = selectedImage {
                            Image(uiImage: image)
                                .resizable().aspectRatio(contentMode: .fit)
                                .frame(maxWidth: .infinity).cornerRadius(16)
                        } else {
                            ZStack {
                                RoundedRectangle(cornerRadius: 16).fill(Color(hex: "#E8F5E9")).frame(height: 180)
                                VStack(spacing: 8) {
                                    Image(systemName: "photo.on.rectangle.angled").font(.system(size: 36)).foregroundColor(Color(hex: "#1B5E20"))
                                    Text("Tap to add a photo").font(.system(size: 14, weight: .semibold)).foregroundColor(Color(hex: "#1B5E20"))
                                }
                            }
                        }
                    }
                    .onChange(of: selectedPhoto) {
                        Task {
                            if let data = try? await selectedPhoto?.loadTransferable(type: Data.self),
                               let image = UIImage(data: data) { selectedImage = image }
                        }
                    }

                    VStack(alignment: .leading, spacing: 8) {
                        HStack {
                            Text("Caption").font(.system(size: 14, weight: .bold)).foregroundColor(Color(hex: "#1A1A1A"))
                            Spacer()
                            Button {
                                Task { await generateCaption() }
                            } label: {
                                HStack(spacing: 4) {
                                    if isGeneratingCaption { ProgressView().scaleEffect(0.7) }
                                    else { Image(systemName: "sparkles").font(.system(size: 12)) }
                                    Text("Expand it").font(.system(size: 12, weight: .semibold))
                                }
                                .foregroundColor(Color(hex: "#1B5E20"))
                            }
                            .disabled(isGeneratingCaption || caption.isEmpty)
                        }
                        TextField("A few words... AI will expand it", text: $caption, axis: .vertical)
                            .font(.system(size: 15)).lineLimit(3...6).padding(12)
                            .background(Color(hex: "#F5F5F5")).cornerRadius(12)
                    }

                    VStack(alignment: .leading, spacing: 8) {
                        Text("When").font(.system(size: 14, weight: .bold)).foregroundColor(Color(hex: "#1A1A1A"))
                        DatePicker("", selection: $memoryDate, displayedComponents: .date)
                            .datePickerStyle(.compact).labelsHidden()
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                }
                .padding(20)
            }
            .background(Color(hex: "#F9F6F0"))
            .navigationTitle("Add a Memory")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button(isUploading ? "Saving..." : "Save") { Task { await save() } }
                        .disabled(caption.isEmpty || isUploading)
                }
            }
        }
    }

    func save() async {
        guard let userId = authViewModel.currentUser?.id else { return }
        isUploading = true
        var photoUrl: String? = nil

        if let image = selectedImage {
            let resized = resizeImage(image, maxWidth: 1200)
            if let data = resized.jpegData(compressionQuality: 0.7) {
                let filename = "\(userId)/\(UUID().uuidString).jpg"
                do {
                    try await supabase.storage.from("golf-memories").upload(filename, data: data, options: FileOptions(contentType: "image/jpeg"))
                    photoUrl = try? supabase.storage.from("golf-memories").getPublicURL(path: filename).absoluteString
                } catch { print("❌ Photo upload failed: \(error)") }
            }
        }

        let formatter = DateFormatter(); formatter.dateFormat = "yyyy-MM-dd"
        let memory = GolfMemory(photoUrl: photoUrl, caption: caption, memoryDate: formatter.string(from: memoryDate))
        onSave(memory)
        isUploading = false
    }

    func resizeImage(_ image: UIImage, maxWidth: CGFloat) -> UIImage {
        let ratio = image.size.height / image.size.width
        let newWidth = min(image.size.width, maxWidth)
        let newSize = CGSize(width: newWidth, height: newWidth * ratio)
        UIGraphicsBeginImageContextWithOptions(newSize, false, 1.0)
        image.draw(in: CGRect(origin: .zero, size: newSize))
        let resized = UIGraphicsGetImageFromCurrentImageContext() ?? image
        UIGraphicsEndImageContext()
        return resized
    }

    func generateCaption() async {
        guard !caption.trimmingCharacters(in: .whitespaces).isEmpty else { return }
        isGeneratingCaption = true
        let prompt = "A golfer typed these quick notes about a golf memory: \"\(caption)\". Rewrite this into one warm, personal sentence that captures the moment. Keep it natural, under 20 words. Return only the sentence, nothing else."

        guard let url = URL(string: "https://golf-ai-companion.vercel.app/api/ask-the-pro") else { return }
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try? JSONSerialization.data(withJSONObject: ["question": prompt])

        if let (data, _) = try? await URLSession.shared.data(for: request),
           let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
           let reply = json["reply"] as? String {
            caption = reply.trimmingCharacters(in: .whitespacesAndNewlines)
        }
        isGeneratingCaption = false
    }
}

// MARK: - Add Journal View
struct AddJournalView: View {
    let onSave: (GolfJournalEntry) -> Void
    @Environment(\.dismiss) var dismiss
    @EnvironmentObject var authViewModel: AuthViewModel

    @State private var title = ""
    @State private var entry = ""
    @State private var entryDate = Date()
    @State private var isExpanding = false

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 20) {
                    VStack(alignment: .leading, spacing: 8) {
                        Text("Title (optional)")
                            .font(.system(size: 14, weight: .bold)).foregroundColor(Color(hex: "#1A1A1A"))
                        TextField("e.g. The day I broke 90", text: $title)
                            .font(.system(size: 15)).padding(12)
                            .background(Color(hex: "#F5F5F5")).cornerRadius(12)
                    }

                    VStack(alignment: .leading, spacing: 8) {
                        HStack {
                            Text("Reflection")
                                .font(.system(size: 14, weight: .bold)).foregroundColor(Color(hex: "#1A1A1A"))
                            Spacer()
                            Button {
                                Task { await expandEntry() }
                            } label: {
                                HStack(spacing: 4) {
                                    if isExpanding { ProgressView().scaleEffect(0.7) }
                                    else { Image(systemName: "sparkles").font(.system(size: 12)) }
                                    Text("Expand it").font(.system(size: 12, weight: .semibold))
                                }
                                .foregroundColor(Color(hex: "#1B5E20"))
                            }
                            .disabled(isExpanding || entry.isEmpty)
                        }
                        TextField("Write what you remember, how it felt, what made it special...", text: $entry, axis: .vertical)
                            .font(.system(size: 15)).lineLimit(6...20).padding(12)
                            .background(Color(hex: "#F5F5F5")).cornerRadius(12)
                    }

                    VStack(alignment: .leading, spacing: 8) {
                        Text("Date")
                            .font(.system(size: 14, weight: .bold)).foregroundColor(Color(hex: "#1A1A1A"))
                        DatePicker("", selection: $entryDate, displayedComponents: .date)
                            .datePickerStyle(.compact).labelsHidden()
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                }
                .padding(20)
            }
            .background(Color(hex: "#F9F6F0"))
            .navigationTitle("Golf Journal")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") {
                        let formatter = DateFormatter(); formatter.dateFormat = "yyyy-MM-dd"
                        let e = GolfJournalEntry(title: title.isEmpty ? nil : title, entry: entry, entryDate: formatter.string(from: entryDate))
                        onSave(e)
                    }
                    .disabled(entry.isEmpty)
                }
            }
        }
    }

    func expandEntry() async {
        guard !entry.trimmingCharacters(in: .whitespaces).isEmpty else { return }
        isExpanding = true
        let prompt = "A golfer wrote these rough notes about a golf memory or reflection: \"\(entry)\". Expand this into a heartfelt, personal paragraph that captures the feeling and significance of this golf moment. Keep it genuine, 2-4 sentences. Return only the paragraph, nothing else."

        guard let url = URL(string: "https://golf-ai-companion.vercel.app/api/ask-the-pro") else { return }
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try? JSONSerialization.data(withJSONObject: ["question": prompt])

        if let (data, _) = try? await URLSession.shared.data(for: request),
           let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
           let reply = json["reply"] as? String {
            entry = reply.trimmingCharacters(in: .whitespacesAndNewlines)
        }
        isExpanding = false
    }
}

// MARK: - Share Sheet
struct ShareSheet: UIViewControllerRepresentable {
    let items: [Any]
    func makeUIViewController(context: Context) -> UIActivityViewController {
        UIActivityViewController(activityItems: items, applicationActivities: nil)
    }
    func updateUIViewController(_ uvc: UIActivityViewController, context: Context) {}
}

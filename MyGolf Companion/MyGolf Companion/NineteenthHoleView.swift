import SwiftUI
import Supabase
import PhotosUI

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

struct NineteenthHoleView: View {
    @EnvironmentObject var authViewModel: AuthViewModel
    @State private var memories: [GolfMemory] = []
    @State private var isLoading = true
    @State private var showAddMemory = false

    private let supabase = SupabaseClient.shared.client

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 0) {
                    headerBanner

                    if isLoading {
                        ProgressView().padding(48)
                    } else if memories.isEmpty {
                        emptyState
                    } else {
                        LazyVStack(spacing: 16) {
                            ForEach(memories) { memory in
                                MemoryCard(memory: memory, onDelete: {
                                    Task { await deleteMemory(memory) }
                                })
                            }
                        }
                        .padding(16)
                    }
                }
            }
            .background(Color(hex: "#F9F6F0"))
            .navigationBarHidden(true)
            .onAppear { Task { await loadMemories() } }
            .sheet(isPresented: $showAddMemory) {
                AddMemoryView(onSave: { memory in
                    Task { await saveMemory(memory) }
                    showAddMemory = false
                })
            }
        }
    }

    private var headerBanner: some View {
        VStack(spacing: 0) {
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text("19th Hole")
                        .font(.system(size: 24, weight: .bold))
                        .foregroundColor(Color(hex: "#1B5E20"))
                    Text("A golf life in moments")
                        .font(.system(size: 13))
                        .foregroundColor(Color(hex: "#5C5C5C"))
                        .italic()
                }
                Spacer()
                Button {
                    showAddMemory = true
                } label: {
                    Image(systemName: "plus.circle.fill")
                        .font(.system(size: 30))
                        .foregroundColor(Color(hex: "#1B5E20"))
                }
            }
            .padding(.horizontal, 16).padding(.vertical, 14)
            Divider()
        }
        .background(Color.white)
    }

    private var emptyState: some View {
        VStack(spacing: 16) {
            Text("🍺").font(.system(size: 52))
            Text("Your 19th Hole is empty")
                .font(.system(size: 17, weight: .bold))
                .foregroundColor(Color(hex: "#1A1A1A"))
            Text("Add a photo and caption to capture\nthe moments you'll never forget")
                .font(.system(size: 14))
                .foregroundColor(Color(hex: "#5C5C5C"))
                .multilineTextAlignment(.center)
            Button {
                showAddMemory = true
            } label: {
                Text("Add a Memory")
                    .font(.system(size: 15, weight: .bold))
                    .foregroundColor(.white)
                    .padding(.horizontal, 28).padding(.vertical, 12)
                    .background(Color(hex: "#1B5E20"))
                    .cornerRadius(14)
            }
        }
        .padding(.top, 60).padding(.horizontal, 32)
    }

    func loadMemories() async {
        guard let userId = authViewModel.currentUser?.id else { return }
        isLoading = true
        let result: [GolfMemory] = (try? await supabase
            .from("golf_memories")
            .select()
            .eq("user_id", value: userId)
            .order("memory_date", ascending: false)
            .execute()
            .value) ?? []
        memories = result
        isLoading = false
    }

    func saveMemory(_ memory: GolfMemory) async {
        guard let userId = authViewModel.currentUser?.id else { return }
        var m = memory
        m.userId = userId
        try? await supabase.from("golf_memories").insert(m).execute()
        await loadMemories()
    }

    func deleteMemory(_ memory: GolfMemory) async {
        guard let id = memory.id else { return }
        try? await supabase.from("golf_memories").delete().eq("id", value: id).execute()
        memories.removeAll { $0.id == id }
    }
}

// MARK: - Memory Card
struct MemoryCard: View {
    let memory: GolfMemory
    let onDelete: () -> Void
    @State private var showDeleteConfirm = false
    @State private var showShareSheet = false

    var formattedDate: String {
        let f = DateFormatter()
        f.dateFormat = "yyyy-MM-dd"
        if let date = f.date(from: memory.memoryDate) {
            let display = DateFormatter()
            display.dateStyle = .long
            return display.string(from: date)
        }
        return memory.memoryDate
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            // Photo
            if let photoUrl = memory.photoUrl, let url = URL(string: photoUrl) {
                AsyncImage(url: url) { image in
                    image
                        .resizable()
                        .aspectRatio(contentMode: .fill)
                        .frame(maxWidth: .infinity)
                        .frame(height: 240)
                        .clipped()
                } placeholder: {
                    Rectangle()
                        .fill(Color(hex: "#E8F5E9"))
                        .frame(height: 240)
                        .overlay(ProgressView())
                }
            } else {
                Rectangle()
                    .fill(Color(hex: "#E8F5E9"))
                    .frame(height: 120)
                    .overlay(
                        Text("⛳").font(.system(size: 40))
                    )
            }

            // Caption + date + actions
            VStack(alignment: .leading, spacing: 8) {
                Text(memory.caption)
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundColor(Color(hex: "#1A1A1A"))

                HStack {
                    Text(formattedDate)
                        .font(.system(size: 12))
                        .foregroundColor(Color(hex: "#888888"))
                    Spacer()
                    Button {
                        showShareSheet = true
                    } label: {
                        Image(systemName: "square.and.arrow.up")
                            .font(.system(size: 15))
                            .foregroundColor(Color(hex: "#1B5E20"))
                    }
                    Button {
                        showDeleteConfirm = true
                    } label: {
                        Image(systemName: "trash")
                            .font(.system(size: 15))
                            .foregroundColor(Color(hex: "#CCCCCC"))
                    }
                }
            }
            .padding(14)
        }
        .background(Color.white)
        .cornerRadius(16)
        .shadow(color: Color.black.opacity(0.06), radius: 6, x: 0, y: 2)
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

                    // Photo picker
                    PhotosPicker(selection: $selectedPhoto, matching: .images) {
                        if let image = selectedImage {
                            Image(uiImage: image)
                                .resizable()
                                .aspectRatio(contentMode: .fill)
                                .frame(maxWidth: .infinity)
                                .frame(height: 220)
                                .clipped()
                                .cornerRadius(16)
                        } else {
                            ZStack {
                                RoundedRectangle(cornerRadius: 16)
                                    .fill(Color(hex: "#E8F5E9"))
                                    .frame(height: 180)
                                VStack(spacing: 8) {
                                    Image(systemName: "photo.on.rectangle.angled")
                                        .font(.system(size: 36))
                                        .foregroundColor(Color(hex: "#1B5E20"))
                                    Text("Tap to add a photo")
                                        .font(.system(size: 14, weight: .semibold))
                                        .foregroundColor(Color(hex: "#1B5E20"))
                                }
                            }
                        }
                    }
                    .onChange(of: selectedPhoto) {
                        Task {
                            if let data = try? await selectedPhoto?.loadTransferable(type: Data.self),
                               let image = UIImage(data: data) {
                                selectedImage = image
                            }
                        }
                    }

                    // Caption
                    VStack(alignment: .leading, spacing: 8) {
                        HStack {
                            Text("Caption")
                                .font(.system(size: 14, weight: .bold))
                                .foregroundColor(Color(hex: "#1A1A1A"))
                            Spacer()
                            Button {
                                Task { await generateCaption() }
                            } label: {
                                HStack(spacing: 4) {
                                    if isGeneratingCaption {
                                        ProgressView().scaleEffect(0.7)
                                    } else {
                                        Image(systemName: "sparkles")
                                            .font(.system(size: 12))
                                    }
                                    Text("Help me write it")
                                        .font(.system(size: 12, weight: .semibold))
                                }
                                .foregroundColor(Color(hex: "#1B5E20"))
                            }
                            .disabled(isGeneratingCaption)
                        }

                        TextField("What made this moment special...", text: $caption, axis: .vertical)
                            .font(.system(size: 15))
                            .lineLimit(3...6)
                            .padding(12)
                            .background(Color(hex: "#F5F5F5"))
                            .cornerRadius(12)
                    }

                    // Date
                    VStack(alignment: .leading, spacing: 8) {
                        Text("When")
                            .font(.system(size: 14, weight: .bold))
                            .foregroundColor(Color(hex: "#1A1A1A"))
                        DatePicker("", selection: $memoryDate, displayedComponents: .date)
                            .datePickerStyle(.compact)
                            .labelsHidden()
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                }
                .padding(20)
            }
            .background(Color(hex: "#F9F6F0"))
            .navigationTitle("Add a Memory")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button(isUploading ? "Saving..." : "Save") {
                        Task { await save() }
                    }
                    .disabled(caption.isEmpty || isUploading)
                }
            }
        }
    }

    func save() async {
        guard let userId = authViewModel.currentUser?.id else { return }
        isUploading = true

        var photoUrl: String? = nil

        if let image = selectedImage,
           let data = image.jpegData(compressionQuality: 0.8) {
            let filename = "\(userId)/\(UUID().uuidString).jpg"
            try? await supabase.storage
                .from("golf-memories")
                .upload(filename, data: data, options: FileOptions(contentType: "image/jpeg"))
            let urlResult = try? supabase.storage.from("golf-memories").getPublicURL(path: filename)
            photoUrl = urlResult?.absoluteString
        }

        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        let memory = GolfMemory(
            photoUrl: photoUrl,
            caption: caption,
            memoryDate: formatter.string(from: memoryDate)
        )
        onSave(memory)
        isUploading = false
    }

    func generateCaption() async {
        isGeneratingCaption = true
        let prompt = "A golfer wants to write a short caption for a golf memory photo. Help them write one sentence that captures a special golf moment. Keep it warm, personal, under 15 words. Just return the caption, nothing else."

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

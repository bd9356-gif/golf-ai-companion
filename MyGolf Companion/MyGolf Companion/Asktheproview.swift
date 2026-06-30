import SwiftUI
import Supabase

struct ChatMessage: Identifiable {
    let id = UUID()
    let role: String // "user" | "assistant"
    let content: String
}

struct AskTheProView: View {
    @EnvironmentObject var authViewModel: AuthViewModel
    @State private var messages: [ChatMessage] = []
    @State private var input: String = ""
    @State private var isLoading = false
    @State private var savedIndexes: Set<Int> = []

    private let supabase = SupabaseClient.shared.client

    let suggestedQuestions = [
        "How do I stop slicing the ball?",
        "What are the fundamentals of a good putting stroke?",
        "How should I practice chipping around the green?",
        "What causes fat shots and how do I fix them?",
        "How do I get more distance off the tee?",
        "What should I work on to break 90?"
    ]

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                headerBanner

                ScrollViewReader { proxy in
                    ScrollView {
                        VStack(spacing: 12) {
                            if messages.isEmpty {
                                emptyState
                            } else {
                                ForEach(Array(messages.enumerated()), id: \.element.id) { index, message in
                                    ChatBubble(
                                        message: message,
                                        isSaved: savedIndexes.contains(index),
                                        onSave: message.role == "assistant" ? {
                                            Task { await saveAnswer(at: index) }
                                        } : nil
                                    )
                                    .id(message.id)
                                }
                            }
                            if isLoading {
                                HStack {
                                    ProgressView()
                                        .progressViewStyle(CircularProgressViewStyle(tint: Color(hex: "#1B5E20")))
                                    Text("Thinking...")
                                        .font(.system(size: 13))
                                        .foregroundColor(Color(hex: "#5C5C5C"))
                                    Spacer()
                                }
                                .padding(.horizontal, 16)
                            }
                        }
                        .padding(16)
                    }
                    .onChange(of: messages.count) {
                        if let last = messages.last {
                            withAnimation { proxy.scrollTo(last.id, anchor: .bottom) }
                        }
                    }
                }

                inputBar
            }
            .background(Color(hex: "#F9F6F0"))
            .navigationBarHidden(true)
        }
    }

    private var headerBanner: some View {
        VStack(spacing: 0) {
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text("Ask The Pro")
                        .font(.system(size: 22, weight: .bold))
                        .foregroundColor(Color(hex: "#1B5E20"))
                    Text("Ask anything. Get clear answers.")
                        .font(.system(size: 13))
                        .foregroundColor(Color(hex: "#5C5C5C"))
                        .italic()
                }
                Spacer()
                Text("🎙️").font(.system(size: 32))
            }
            .padding(.horizontal, 16).padding(.vertical, 14)
            Divider()
        }
        .background(Color.white)
    }

    private var emptyState: some View {
        VStack(spacing: 16) {
            Text("⛳")
                .font(.system(size: 48))
                .padding(.top, 24)
            Text("What's on your mind?")
                .font(.system(size: 17, weight: .bold))
                .foregroundColor(Color(hex: "#1A1A1A"))
            VStack(spacing: 8) {
                ForEach(suggestedQuestions, id: \.self) { q in
                    Button {
                        Task { await sendMessage(q) }
                    } label: {
                        HStack {
                            Text(q)
                                .font(.system(size: 14))
                                .foregroundColor(Color(hex: "#1A1A1A"))
                                .multilineTextAlignment(.leading)
                            Spacer()
                            Image(systemName: "arrow.up.right")
                                .font(.system(size: 12))
                                .foregroundColor(Color(hex: "#1B5E20"))
                        }
                        .padding(14)
                        .background(Color.white)
                        .cornerRadius(12)
                        .overlay(RoundedRectangle(cornerRadius: 12).stroke(Color(hex: "#D0E8D0"), lineWidth: 1))
                    }
                }
            }
        }
    }

    private var inputBar: some View {
        HStack(spacing: 10) {
            TextField("Ask The Pro anything...", text: $input, axis: .vertical)
                .font(.system(size: 15))
                .padding(12)
                .background(Color(hex: "#F0F0F0"))
                .cornerRadius(20)
                .lineLimit(1...4)

            Button {
                let text = input
                input = ""
                Task { await sendMessage(text) }
            } label: {
                Image(systemName: "arrow.up.circle.fill")
                    .font(.system(size: 32))
                    .foregroundColor(input.trimmingCharacters(in: .whitespaces).isEmpty ? Color(hex: "#CCCCCC") : Color(hex: "#1B5E20"))
            }
            .disabled(input.trimmingCharacters(in: .whitespaces).isEmpty || isLoading)
        }
        .padding(12)
        .background(Color.white)
    }

    func sendMessage(_ text: String) async {
        guard !text.trimmingCharacters(in: .whitespaces).isEmpty else { return }
        messages.append(ChatMessage(role: "user", content: text))
        isLoading = true

        guard let url = URL(string: "https://golf-ai-companion.vercel.app/api/ask-the-pro") else { return }
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        let body: [String: Any] = ["question": text]
        request.httpBody = try? JSONSerialization.data(withJSONObject: body)

        do {
            let (data, _) = try await URLSession.shared.data(for: request)
            if let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
               let reply = json["reply"] as? String {
                messages.append(ChatMessage(role: "assistant", content: reply))
            } else {
                messages.append(ChatMessage(role: "assistant", content: "Sorry, something went wrong. Please try again."))
            }
        } catch {
            messages.append(ChatMessage(role: "assistant", content: "Sorry, something went wrong. Please try again."))
        }
        isLoading = false
    }

    func saveAnswer(at index: Int) async {
        guard let userId = authViewModel.currentUser?.id,
              index > 0, messages.indices.contains(index) else { return }
        let question = messages[index - 1].content
        let answer = messages[index].content

        struct SavedAnswer: Codable {
            var userId: UUID
            var question: String
            var answer: String
            enum CodingKeys: String, CodingKey {
                case userId = "user_id", question, answer
            }
        }

        let saved = SavedAnswer(userId: userId, question: question, answer: answer)
        try? await supabase.from("saved_answers").insert(saved).execute()
        savedIndexes.insert(index)
    }
}

struct ChatBubble: View {
    let message: ChatMessage
    let isSaved: Bool
    let onSave: (() -> Void)?

    var body: some View {
        HStack {
            if message.role == "user" { Spacer(minLength: 40) }

            VStack(alignment: message.role == "user" ? .trailing : .leading, spacing: 6) {
                Text(message.content)
                    .font(.system(size: 15))
                    .foregroundColor(message.role == "user" ? .white : Color(hex: "#1A1A1A"))
                    .padding(12)
                    .background(message.role == "user" ? Color(hex: "#1B5E20") : Color.white)
                    .cornerRadius(16)
                    .overlay(
                        message.role == "assistant" ?
                        RoundedRectangle(cornerRadius: 16).stroke(Color(hex: "#E0EAE0"), lineWidth: 1) : nil
                    )

                if let onSave = onSave {
                    Button(action: onSave) {
                        HStack(spacing: 4) {
                            Image(systemName: isSaved ? "checkmark.circle.fill" : "bookmark")
                                .font(.system(size: 11))
                            Text(isSaved ? "Saved to Playbook" : "Save to Playbook")
                                .font(.system(size: 11, weight: .semibold))
                        }
                        .foregroundColor(isSaved ? Color(hex: "#1B5E20") : Color(hex: "#888888"))
                    }
                    .disabled(isSaved)
                }
            }

            if message.role == "assistant" { Spacer(minLength: 40) }
        }
    }
}

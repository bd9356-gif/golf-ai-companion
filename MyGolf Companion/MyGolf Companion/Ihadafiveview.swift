import SwiftUI
import Supabase

// MARK: - Models
struct GolfGroup: Codable {
    var id: UUID?
    var userId: UUID?
    var golfer1: String
    var golfer2: String
    var golfer3: String
    var golfer4: String

    enum CodingKeys: String, CodingKey {
        case id, golfer1 = "golfer_1", golfer2 = "golfer_2",
             golfer3 = "golfer_3", golfer4 = "golfer_4", userId = "user_id"
    }

    var names: [String] { [golfer1, golfer2, golfer3, golfer4].filter { !$0.isEmpty } }
}

struct Situation: Codable, Identifiable, Hashable {
    var id: UUID
    var category: String
    var title: String
}

struct GameCard: Codable, Identifiable {
    var id: UUID?
    var userId: UUID?
    var createdBy: String
    var gameContent: String
    var createdAt: Date?
    var situationTitle: String?

    enum CodingKeys: String, CodingKey {
        case id, userId = "user_id", createdBy = "created_by",
             gameContent = "game_content", createdAt = "created_at",
             situationTitle = "situation_title"
    }
}

struct OptionsCardData {
    var situation: String
    var options: [String]
    var realRule: String

    static func parse(from json: String) -> OptionsCardData? {
        guard let data = json.data(using: .utf8),
              let obj = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              let options = obj["options"] as? [String],
              let realRule = obj["real_rule"] as? String else { return nil }
        return OptionsCardData(
            situation: obj["situation"] as? String ?? "",
            options: options,
            realRule: realRule
        )
    }
}

// MARK: - Main View
struct IHadAFiveView: View {
    @EnvironmentObject var authViewModel: AuthViewModel
    @State private var group: GolfGroup? = nil
    @State private var gameCards: [GameCard] = []
    @State private var situations: [Situation] = []
    @State private var isLoading = true
    @State private var isGenerating = false
    @State private var showGroupSetup = false
    @State private var currentCard: GameCard? = nil
    @State private var nextCreator: String = ""
    @State private var errorMessage: String? = nil
    @State private var selectedSituation: Situation? = nil
    @State private var oneRuleForAll: Bool = false
    @State private var groupPick: String? = nil
    @State private var currentOptions: OptionsCardData? = nil
    @State private var golferPicks: [String: String] = [:] // golfer name -> picked option

    private let supabase = SupabaseClient.shared.client

    var allPicksMade: Bool {
        if oneRuleForAll { return groupPick != nil }
        guard let g = group else { return false }
        return g.names.allSatisfy { golferPicks[$0] != nil }
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 0) {
                    headerBanner

                    if isLoading {
                        ProgressView().padding(48)
                    } else if group == nil {
                        VStack(spacing: 12) {
                            Text("Set up your foursome first!")
                                .font(.system(size: 16, weight: .semibold))
                                .foregroundColor(Color(hex: "#1B5E20"))
                                .padding(.top, 24)
                            GroupSetupView(onSave: { newGroup in
                                Task { await saveGroup(newGroup) }
                            })
                        }
                        .padding(16)
                    } else if showGroupSetup {
                        GroupSetupView(existing: group, onSave: { newGroup in
                            Task { await saveGroup(newGroup) }
                        })
                        .padding(16)
                    } else {
                        VStack(spacing: 16) {
                            whosUpCard
                            situationPicker

                            if selectedSituation != nil && currentOptions == nil {
                                modeToggle
                                getOptionsButton
                            }

                            if let error = errorMessage {
                                Text(error)
                                    .font(.system(size: 13))
                                    .foregroundColor(.red)
                                    .padding(.horizontal, 16)
                            }

                            if let options = currentOptions {
                                optionsSection(options: options)

                                if allPicksMade {
                                    saveCardButton
                                }
                            }

                            if let card = currentCard, currentOptions == nil {
                                savedCardView(card: card)
                                nextWeekSection
                            }

                            if !gameCards.isEmpty && currentOptions == nil {
                                historySection
                            }
                        }
                        .padding(.top, 16)
                        .padding(.bottom, 32)
                    }
                }
            }
            .background(Color(hex: "#F9F6F0"))
            .navigationBarHidden(true)
            .onAppear { Task { await loadData() } }
        }
    }

    // MARK: - Header
    private var headerBanner: some View {
        VStack(spacing: 0) {
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text("I Had a Five™")
                        .font(.system(size: 24, weight: .bold))
                        .foregroundColor(Color(hex: "#1B5E20"))
                    Text("The App Settles the Debate")
                        .font(.system(size: 13))
                        .foregroundColor(Color(hex: "#5C5C5C"))
                        .italic()
                }
                Spacer()
                Button { showGroupSetup = true } label: {
                    Text("Edit Group")
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundColor(Color(hex: "#1B5E20"))
                        .padding(.horizontal, 12).padding(.vertical, 6)
                        .background(Color(hex: "#E8F5E9")).cornerRadius(20)
                }
            }
            .padding(.horizontal, 16).padding(.vertical, 14)
            Divider()
        }
        .background(Color.white)
    }

    // MARK: - Who's Up
    private var whosUpCard: some View {
        HStack(spacing: 12) {
            Text("🎯").font(.system(size: 28))
            VStack(alignment: .leading, spacing: 2) {
                Text(nextCreator.isEmpty ? (group?.golfer1 ?? "") : nextCreator)
                    .font(.system(size: 20, weight: .bold))
                    .foregroundColor(Color(hex: "#1A1A1A"))
                Text("picks this week's situation")
                    .font(.system(size: 13))
                    .foregroundColor(Color(hex: "#5C5C5C"))
            }
            Spacer()
        }
        .padding(16)
        .background(Color(hex: "#E8F5E9"))
        .cornerRadius(14)
        .padding(.horizontal, 16)
    }

    // MARK: - Situation Picker
    private var situationPicker: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("This Round's Situation")
                .font(.system(size: 15, weight: .bold))
                .foregroundColor(Color(hex: "#1A1A1A"))

            Menu {
                ForEach(situations) { situation in
                    Button(situation.title) {
                        selectedSituation = situation
                        currentOptions = nil
                        golferPicks = [:]
                        groupPick = nil
                    }
                }
            } label: {
                HStack {
                    Text(selectedSituation?.title ?? "Pick a situation...")
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundColor(selectedSituation == nil ? Color(hex: "#888888") : Color(hex: "#1A1A1A"))
                    Spacer()
                    Image(systemName: "chevron.down")
                        .font(.system(size: 13, weight: .semibold))
                        .foregroundColor(Color(hex: "#1B5E20"))
                }
                .padding(16)
                .background(Color.white)
                .cornerRadius(14)
                .overlay(RoundedRectangle(cornerRadius: 14).stroke(Color(hex: "#D0E8D0"), lineWidth: 1.5))
            }
        }
        .padding(.horizontal, 16)
    }

    // MARK: - Mode Toggle
    private var modeToggle: some View {
        HStack(spacing: 12) {
            Text("Each Picks")
                .font(.system(size: 13, weight: .semibold))
                .foregroundColor(!oneRuleForAll ? Color(hex: "#1B5E20") : Color(hex: "#888888"))
            Toggle("", isOn: $oneRuleForAll)
                .labelsHidden()
                .tint(Color(hex: "#1B5E20"))
                .onChange(of: oneRuleForAll) {
                    golferPicks = [:]
                    groupPick = nil
                    currentOptions = nil
                }
            Text("One Rule for All")
                .font(.system(size: 13, weight: .semibold))
                .foregroundColor(oneRuleForAll ? Color(hex: "#1B5E20") : Color(hex: "#888888"))
        }
        .padding(14)
        .background(Color.white)
        .cornerRadius(14)
        .overlay(RoundedRectangle(cornerRadius: 14).stroke(Color(hex: "#E0EAE0"), lineWidth: 1))
        .padding(.horizontal, 16)
    }

    // MARK: - Get Options Button
    private var getOptionsButton: some View {
        Button { Task { await fetchOptions() } } label: {
            HStack(spacing: 10) {
                if isGenerating {
                    ProgressView().progressViewStyle(CircularProgressViewStyle(tint: .white)).scaleEffect(0.8)
                } else {
                    Text("⚖️").font(.system(size: 20))
                }
                Text(isGenerating ? "Getting options..." : "Get This Round's Options")
                    .font(.system(size: 17, weight: .bold))
                    .foregroundColor(.white)
            }
            .frame(maxWidth: .infinity).frame(height: 56)
            .background(isGenerating ? Color(hex: "#4A7A4A") : Color(hex: "#1B5E20"))
            .cornerRadius(16)
        }
        .disabled(isGenerating)
        .padding(.horizontal, 16)
    }

    // MARK: - Options Section
    private func optionsSection(options: OptionsCardData) -> some View {
        VStack(spacing: 16) {
            VStack(spacing: 4) {
                Text("⛳ \(options.situation)")
                    .font(.system(size: 18, weight: .bold))
                    .foregroundColor(Color(hex: "#1B5E20"))
                Text(oneRuleForAll ? "Pick one rule for the whole group" : "Each golfer picks their rule for the round")
                    .font(.system(size: 13))
                    .foregroundColor(Color(hex: "#5C5C5C"))
                    .italic()
            }
            .padding(.horizontal, 16)

            if oneRuleForAll {
                // Single pick for everyone
                VStack(alignment: .leading, spacing: 8) {
                    Text(nextCreator.isEmpty ? (group?.golfer1 ?? "You") : nextCreator)
                        .font(.system(size: 15, weight: .bold))
                        .foregroundColor(Color(hex: "#1A1A1A"))
                        .padding(.horizontal, 16)

                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 8) {
                            ForEach(options.options, id: \.self) { option in
                                Button {
                                    groupPick = option
                                } label: {
                                    Text(option)
                                        .font(.system(size: 13, weight: .semibold))
                                        .foregroundColor(groupPick == option ? .white : Color(hex: "#1B5E20"))
                                        .padding(.horizontal, 14).padding(.vertical, 10)
                                        .background(groupPick == option ? Color(hex: "#1B5E20") : Color(hex: "#E8F5E9"))
                                        .cornerRadius(20)
                                        .overlay(RoundedRectangle(cornerRadius: 20).stroke(Color(hex: "#1B5E20"), lineWidth: groupPick == option ? 0 : 1))
                                }
                            }
                        }
                        .padding(.horizontal, 16)
                    }

                    if let pick = groupPick {
                        Text("Everyone plays: \"\(pick)\"")
                            .font(.system(size: 13, weight: .semibold))
                            .foregroundColor(Color(hex: "#1B5E20"))
                            .padding(.horizontal, 16)
                    }
                }
                .padding(.vertical, 8)
                .background(Color.white)
                .cornerRadius(14)
                .overlay(RoundedRectangle(cornerRadius: 14).stroke(Color(hex: "#E0EAE0"), lineWidth: 1))
                .padding(.horizontal, 16)
            } else {
                // Individual picks
                if let g = group {
                    ForEach(g.names, id: \.self) { golfer in
                        golferPickSection(golfer: golfer, options: options.options)
                    }
                }
            }

            // Real rule
            HStack(alignment: .top, spacing: 10) {
                Text("⚖️").font(.system(size: 16))
                VStack(alignment: .leading, spacing: 2) {
                    Text("Official USGA Ruling")
                        .font(.system(size: 12, weight: .bold))
                        .foregroundColor(Color(hex: "#C8401A"))
                    Text(options.realRule)
                        .font(.system(size: 14))
                        .foregroundColor(Color(hex: "#1A1A1A"))
                }
                Spacer()
            }
            .padding(14)
            .background(Color(hex: "#FFF4EC"))
            .cornerRadius(12)
            .padding(.horizontal, 16)
        }
    }

    private func golferPickSection(golfer: String, options: [String]) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text(golfer)
                    .font(.system(size: 15, weight: .bold))
                    .foregroundColor(Color(hex: "#1A1A1A"))
                Spacer()
                if let pick = golferPicks[golfer] {
                    Text("✓ Picked")
                        .font(.system(size: 11, weight: .semibold))
                        .foregroundColor(Color(hex: "#1B5E20"))
                }
            }
            .padding(.horizontal, 16)

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 8) {
                    ForEach(options, id: \.self) { option in
                        Button {
                            golferPicks[golfer] = option
                        } label: {
                            Text(option)
                                .font(.system(size: 13, weight: .semibold))
                                .foregroundColor(golferPicks[golfer] == option ? .white : Color(hex: "#1B5E20"))
                                .padding(.horizontal, 14).padding(.vertical, 10)
                                .background(golferPicks[golfer] == option ? Color(hex: "#1B5E20") : Color(hex: "#E8F5E9"))
                                .cornerRadius(20)
                                .overlay(
                                    RoundedRectangle(cornerRadius: 20)
                                        .stroke(Color(hex: "#1B5E20"), lineWidth: golferPicks[golfer] == option ? 0 : 1)
                                )
                        }
                    }
                }
                .padding(.horizontal, 16)
            }
        }
        .padding(.vertical, 8)
        .background(Color.white)
        .cornerRadius(14)
        .overlay(RoundedRectangle(cornerRadius: 14).stroke(Color(hex: "#E0EAE0"), lineWidth: 1))
        .padding(.horizontal, 16)
    }

    // MARK: - Save Card Button
    private var saveCardButton: some View {
        Button { Task { await saveCard() } } label: {
            HStack(spacing: 8) {
                Text("🏆")
                Text("Lock In This Round's Rules")
                    .font(.system(size: 16, weight: .bold))
                    .foregroundColor(.white)
            }
            .frame(maxWidth: .infinity).frame(height: 54)
            .background(Color(hex: "#1B5E20"))
            .cornerRadius(14)
        }
        .padding(.horizontal, 16)
    }

    // MARK: - Saved Card View
    private func savedCardView(card: GameCard) -> some View {
        VStack(spacing: 0) {
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text("🏆 \(card.situationTitle ?? "This Round")")
                        .font(.system(size: 16, weight: .bold))
                        .foregroundColor(Color(hex: "#1B5E20"))
                    Text("Created by \(card.createdBy)")
                        .font(.system(size: 12)).foregroundColor(Color(hex: "#5C5C5C")).italic()
                }
                Spacer()
                Button {
                    let shareText = card.gameContent
                    let av = UIActivityViewController(activityItems: [shareText], applicationActivities: nil)
                    if let scene = UIApplication.shared.connectedScenes.first as? UIWindowScene,
                       let vc = scene.windows.first?.rootViewController {
                        vc.present(av, animated: true)
                    }
                } label: {
                    HStack(spacing: 4) {
                        Image(systemName: "square.and.arrow.up").font(.system(size: 13))
                        Text("Share").font(.system(size: 13, weight: .semibold))
                    }
                    .foregroundColor(.white).padding(.horizontal, 14).padding(.vertical, 8)
                    .background(Color(hex: "#1B5E20")).cornerRadius(20)
                }
            }
            .padding(16).background(Color(hex: "#E8F5E9"))

            Text(card.gameContent)
                .font(.system(size: 14)).foregroundColor(Color(hex: "#1A1A1A"))
                .padding(16).frame(maxWidth: .infinity, alignment: .leading)
                .background(Color.white)
        }
        .cornerRadius(16)
        .shadow(color: Color.black.opacity(0.06), radius: 8, x: 0, y: 2)
        .padding(.horizontal, 16)
    }

    // MARK: - Next Week
    private var nextWeekSection: some View {
        VStack(spacing: 12) {
            Text("19th Hole — Who's Up Next Week?")
                .font(.system(size: 15, weight: .bold))
                .foregroundColor(Color(hex: "#1A1A1A"))
            if let g = group {
                HStack(spacing: 10) {
                    ForEach(g.names, id: \.self) { name in
                        Button {
                            nextCreator = name
                            Task { await saveNextCreator(name) }
                        } label: {
                            Text(name)
                                .font(.system(size: 14, weight: .semibold))
                                .foregroundColor(nextCreator == name ? .white : Color(hex: "#1B5E20"))
                                .padding(.horizontal, 14).padding(.vertical, 10)
                                .background(nextCreator == name ? Color(hex: "#1B5E20") : Color(hex: "#E8F5E9"))
                                .cornerRadius(20)
                        }
                    }
                }
            }
        }
        .padding(16).background(Color.white).cornerRadius(16)
        .shadow(color: Color.black.opacity(0.04), radius: 4, x: 0, y: 2)
        .padding(.horizontal, 16)
    }

    // MARK: - History
    private var historySection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("PAST ROUNDS")
                .font(.system(size: 11, weight: .bold)).tracking(1.4)
                .foregroundColor(Color(hex: "#1B5E20")).padding(.horizontal, 16)

            let grouped = Dictionary(grouping: gameCards) { card -> String in
                let f = DateFormatter(); f.dateFormat = "MMMM yyyy"
                return f.string(from: card.createdAt ?? Date())
            }
            ForEach(grouped.keys.sorted().reversed(), id: \.self) { month in
                MonthSection(month: month, cards: grouped[month] ?? [], group: group!)
                    .padding(.horizontal, 16)
            }
        }
        .padding(.top, 8)
    }

    // MARK: - Data
    func fetchOptions() async {
        guard let situation = selectedSituation else { return }
        isGenerating = true
        errorMessage = nil

        guard let url = URL(string: "https://golf-ai-companion.vercel.app/api/generate-game-card") else { return }
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        let body: [String: Any] = ["situationTitle": situation.title]
        request.httpBody = try? JSONSerialization.data(withJSONObject: body)

        do {
            let (data, _) = try await URLSession.shared.data(for: request)
            if let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
               var text = json["result"] as? String {
                text = text.trimmingCharacters(in: .whitespacesAndNewlines)
                if text.hasPrefix("```") {
                    text = text.components(separatedBy: "\n").dropFirst().joined(separator: "\n")
                    if text.hasSuffix("```") { text = String(text.dropLast(3)) }
                }
                currentOptions = OptionsCardData.parse(from: text.trimmingCharacters(in: .whitespacesAndNewlines))
                if currentOptions == nil { errorMessage = "Couldn't parse options. Please try again." }
            } else {
                errorMessage = "Failed to get options. Please try again."
            }
        } catch {
            errorMessage = "Network error. Please try again."
        }
        isGenerating = false
    }

    func saveCard() async {
        guard let g = group, let options = currentOptions,
              let userId = authViewModel.currentUser?.id else { return }
        let creator = nextCreator.isEmpty ? g.golfer1 : nextCreator

        var content = "⛳ \(options.situation)\n\n"
        if oneRuleForAll, let pick = groupPick {
            content += "Everyone: \(pick)\n"
        } else {
            for name in g.names {
                if let pick = golferPicks[name] {
                    content += "\(name): \(pick)\n"
                }
            }
        }
        content += "\n⚖️ Real rule: \(options.realRule)"

        var card = GameCard(createdBy: creator, gameContent: content, situationTitle: options.situation)
        card.userId = userId
        let saved: GameCard? = try? await supabase.from("game_cards").insert(card).select().single().execute().value
        currentCard = saved ?? card
        gameCards.insert(currentCard!, at: 0)
        currentOptions = nil
        golferPicks = [:]
        groupPick = nil
    }

    func loadData() async {
        guard let userId = authViewModel.currentUser?.id else { return }
        isLoading = true
        let groups: [GolfGroup] = (try? await supabase.from("golf_group").select().eq("user_id", value: userId).limit(1).execute().value) ?? []
        group = groups.first
        nextCreator = UserDefaults.standard.string(forKey: "next_creator_\(userId)") ?? ""
        let sits: [Situation] = (try? await supabase.from("situations").select().eq("active", value: true).order("sort_order").execute().value) ?? []
        situations = sits
        let cards: [GameCard] = (try? await supabase.from("game_cards").select().eq("user_id", value: userId).order("created_at", ascending: false).execute().value) ?? []
        gameCards = cards
        currentCard = cards.first
        isLoading = false
    }

    func saveGroup(_ newGroup: GolfGroup) async {
        guard let userId = authViewModel.currentUser?.id else { return }
        var g = newGroup; g.userId = userId
        try? await supabase.from("golf_group").upsert(g, onConflict: "user_id").execute()
        group = g
        showGroupSetup = false
    }

    func saveNextCreator(_ name: String) async {
        guard let userId = authViewModel.currentUser?.id else { return }
        UserDefaults.standard.set(name, forKey: "next_creator_\(userId)")
    }
}

// MARK: - Group Setup
struct GroupSetupView: View {
    var existing: GolfGroup? = nil
    let onSave: (GolfGroup) -> Void
    @State private var golfer1 = ""
    @State private var golfer2 = ""
    @State private var golfer3 = ""
    @State private var golfer4 = ""

    var body: some View {
        VStack(spacing: 20) {
            VStack(spacing: 4) {
                Text("Your Foursome")
                    .font(.system(size: 22, weight: .bold)).foregroundColor(Color(hex: "#1A1A1A"))
                Text("Enter your golf group names")
                    .font(.system(size: 14)).foregroundColor(Color(hex: "#5C5C5C"))
            }
            .padding(.top, 24)

            VStack(spacing: 12) {
                ForEach(Array(zip(["Golfer 1", "Golfer 2", "Golfer 3", "Golfer 4"],
                                  [$golfer1, $golfer2, $golfer3, $golfer4])), id: \.0) { label, binding in
                    HStack(spacing: 12) {
                        Text("🏌️").font(.system(size: 20))
                        TextField(label, text: binding)
                            .font(.system(size: 16)).padding(14)
                            .background(Color.white).cornerRadius(12)
                            .overlay(RoundedRectangle(cornerRadius: 12).stroke(Color(hex: "#D0E8D0"), lineWidth: 1))
                    }
                }
            }

            Button {
                onSave(GolfGroup(golfer1: golfer1, golfer2: golfer2, golfer3: golfer3, golfer4: golfer4))
            } label: {
                Text("Save My Group")
                    .font(.system(size: 17, weight: .bold)).foregroundColor(.white)
                    .frame(maxWidth: .infinity).frame(height: 54)
                    .background(golfer1.isEmpty ? Color.gray : Color(hex: "#1B5E20")).cornerRadius(14)
            }
            .disabled(golfer1.isEmpty).padding(.top, 8)
        }
        .padding(20).background(Color.white).cornerRadius(20)
        .shadow(color: Color.black.opacity(0.06), radius: 8, x: 0, y: 2)
        .onAppear {
            if let g = existing {
                golfer1 = g.golfer1; golfer2 = g.golfer2
                golfer3 = g.golfer3; golfer4 = g.golfer4
            }
        }
    }
}

// MARK: - Month Section
struct MonthSection: View {
    let month: String
    let cards: [GameCard]
    let group: GolfGroup
    @State private var isExpanded = false

    var body: some View {
        VStack(spacing: 0) {
            Button {
                withAnimation(.easeInOut(duration: 0.2)) { isExpanded.toggle() }
            } label: {
                HStack {
                    Text(month).font(.system(size: 15, weight: .semibold)).foregroundColor(Color(hex: "#1A1A1A"))
                    Spacer()
                    Text("\(cards.count) round\(cards.count == 1 ? "" : "s")").font(.system(size: 12)).foregroundColor(Color(hex: "#5C5C5C"))
                    Image(systemName: isExpanded ? "chevron.up" : "chevron.down").font(.system(size: 12, weight: .semibold)).foregroundColor(Color(hex: "#1B5E20"))
                }
                .padding(14).background(Color.white).cornerRadius(12)
            }
            .buttonStyle(PlainButtonStyle())

            if isExpanded {
                VStack(spacing: 10) {
                    ForEach(cards) { card in
                        VStack(alignment: .leading, spacing: 8) {
                            Text("⛳ \(card.situationTitle ?? "Round")")
                                .font(.system(size: 14, weight: .bold))
                                .foregroundColor(Color(hex: "#1B5E20"))
                            Text(card.gameContent)
                                .font(.system(size: 13))
                                .foregroundColor(Color(hex: "#2C2C2C"))
                        }
                        .padding(14).background(Color.white).cornerRadius(12)
                        .overlay(RoundedRectangle(cornerRadius: 12).stroke(Color(hex: "#E0EAE0"), lineWidth: 1))
                    }
                }
                .padding(.top, 8)
            }
        }
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

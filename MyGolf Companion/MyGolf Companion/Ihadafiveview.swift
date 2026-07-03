import SwiftUI
import Supabase

// MARK: - Models
struct IHAFChallenge: Codable, Identifiable {
    var id: UUID
    var name: String
    var description: String
    var emoji: String
    var sortOrder: Int?
    enum CodingKeys: String, CodingKey {
        case id, name, description, emoji
        case sortOrder = "sort_order"
    }
}

struct IHAFWeekly: Codable, Identifiable {
    var id: UUID?
    var userId: UUID?
    var challengeId: UUID?
    var challengeName: String
    var challengeDesc: String
    var challengeEmoji: String
    var pickedBy: String
    var weekStart: String
    var createdAt: Date?
    enum CodingKeys: String, CodingKey {
        case id, userId = "user_id", challengeId = "challenge_id"
        case challengeName = "challenge_name"
        case challengeDesc = "challenge_desc"
        case challengeEmoji = "challenge_emoji"
        case pickedBy = "picked_by"
        case weekStart = "week_start"
        case createdAt = "created_at"
    }
}

struct PlayerScore: Codable, Identifiable {
    var id = UUID()
    var name: String
    var score: Int
    enum CodingKeys: String, CodingKey { case name, score }
}

struct IHAFRound: Codable, Identifiable {
    var id: UUID?
    var userId: UUID?
    var weeklyId: UUID?
    var challengeName: String
    var challengeEmoji: String
    var courseName: String?
    var playedOn: String
    var scores: [PlayerScore]
    var winnerName: String?
    var winnerScore: Int?
    var aiCallout: String?
    var createdAt: Date?
    enum CodingKeys: String, CodingKey {
        case id, userId = "user_id", weeklyId = "weekly_id"
        case challengeName = "challenge_name"
        case challengeEmoji = "challenge_emoji"
        case courseName = "course_name"
        case playedOn = "played_on"
        case scores
        case winnerName = "winner_name"
        case winnerScore = "winner_score"
        case aiCallout = "ai_callout"
        case createdAt = "created_at"
    }
}

// MARK: - Main View
struct IHadAFiveView: View {
    @EnvironmentObject var authViewModel: AuthViewModel
    @State private var group: GolfGroup? = nil
    @State private var currentWeekly: IHAFWeekly? = nil
    @State private var recentRounds: [IHAFRound] = []
    @State private var isLoading = true
    @State private var showChallengePicker = false
    @State private var showEnterScores = false
    @State private var nextCreator: String = ""

    private let supabase = SupabaseClient.shared.client

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                headerBanner

                ScrollView {
                    VStack(spacing: 20) {
                        if isLoading {
                            ProgressView().padding(48)
                        } else {
                            // This Week's Challenge
                            thisWeeksChallenge

                            // Action Buttons
                            actionButtons

                            // Recent Rounds
                            if !recentRounds.isEmpty {
                                recentRoundsSection
                            }

                            // Season Summary
                            if !recentRounds.isEmpty {
                                seasonSummary
                            }
                        }
                    }
                    .padding(.top, 16)
                    .padding(.bottom, 32)
                }
                .background(Color(hex: "#F9F6F0"))
            }
            .background(Color(hex: "#F9F6F0"))
            .navigationBarHidden(true)
            .onAppear { Task { await loadData() } }
            .sheet(isPresented: $showChallengePicker) {
                ChallengePicker(group: group, currentCreator: nextCreator, onConfirm: { weekly in
                    Task { await saveWeekly(weekly) }
                    showChallengePicker = false
                })
            }
            .sheet(isPresented: $showEnterScores) {
                EnterScoresView(group: group, weekly: currentWeekly, onSave: { round in
                    Task { await saveRound(round) }
                    showEnterScores = false
                })
            }
        }
    }

    // MARK: - Header
    private var headerBanner: some View {
        VStack(spacing: 0) {
            Image("had-five-hero")
                .resizable()
                .scaledToFit()
                .frame(maxWidth: .infinity)
            Divider()
        }
        .background(Color.white)
    }

    // MARK: - This Week's Challenge
    private var thisWeeksChallenge: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("THIS WEEK'S CHALLENGE")
                .font(.system(size: 11, weight: .bold))
                .tracking(1.4)
                .foregroundColor(Color(hex: "#1B5E20"))
                .padding(.horizontal, 16)

            if let weekly = currentWeekly {
                VStack(alignment: .leading, spacing: 12) {
                    HStack(spacing: 12) {
                        Text(weekly.challengeEmoji)
                            .font(.system(size: 36))
                        VStack(alignment: .leading, spacing: 3) {
                            Text(weekly.challengeName)
                                .font(.system(size: 20, weight: .bold))
                                .foregroundColor(Color(hex: "#1A1A1A"))
                            Text(weekly.challengeDesc)
                                .font(.system(size: 14))
                                .foregroundColor(Color(hex: "#5C5C5C"))
                            Text("Lowest total wins.")
                                .font(.system(size: 13, weight: .semibold))
                                .foregroundColor(Color(hex: "#1B5E20"))
                        }
                        Spacer()
                    }
                    Text("Chosen by \(weekly.pickedBy) • \(formatDate(weekly.weekStart))")
                        .font(.system(size: 12))
                        .foregroundColor(Color(hex: "#AAAAAA"))
                }
                .padding(16)
                .background(Color(hex: "#E8F5E9"))
                .cornerRadius(16)
                .padding(.horizontal, 16)
            } else {
                HStack(spacing: 12) {
                    Text("🏆").font(.system(size: 28))
                    VStack(alignment: .leading, spacing: 4) {
                        Text("No challenge set yet")
                            .font(.system(size: 15, weight: .bold))
                            .foregroundColor(Color(hex: "#1A1A1A"))
                        Text("Pick next week's challenge at the 19th hole")
                            .font(.system(size: 13))
                            .foregroundColor(Color(hex: "#5C5C5C"))
                    }
                    Spacer()
                }
                .padding(16)
                .background(Color.white)
                .cornerRadius(16)
                .overlay(RoundedRectangle(cornerRadius: 16).stroke(Color(hex: "#E0EAE0"), style: StrokeStyle(lineWidth: 1, dash: [5])))
                .padding(.horizontal, 16)
            }
        }
    }

    // MARK: - Action Buttons
    private var actionButtons: some View {
        HStack(spacing: 12) {
            Button {
                showChallengePicker = true
            } label: {
                VStack(spacing: 6) {
                    Text("🎯").font(.system(size: 24))
                    Text("Pick Challenge")
                        .font(.system(size: 13, weight: .bold))
                        .foregroundColor(.white)
                }
                .frame(maxWidth: .infinity).padding(.vertical, 14)
                .background(Color(hex: "#1B5E20")).cornerRadius(14)
            }

            Button {
                showEnterScores = true
            } label: {
                VStack(spacing: 6) {
                    Text("🏁").font(.system(size: 24))
                    Text("Enter Scores")
                        .font(.system(size: 13, weight: .bold))
                        .foregroundColor(Color(hex: "#1B5E20"))
                }
                .frame(maxWidth: .infinity).padding(.vertical, 14)
                .background(Color(hex: "#E8F5E9")).cornerRadius(14)
                .overlay(RoundedRectangle(cornerRadius: 14).stroke(Color(hex: "#1B5E20"), lineWidth: 1))
            }
        }
        .padding(.horizontal, 16)
    }

    // MARK: - Recent Rounds
    private var recentRoundsSection: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                Text("RECENT ROUNDS")
                    .font(.system(size: 11, weight: .bold))
                    .tracking(1.4)
                    .foregroundColor(Color(hex: "#1B5E20"))
                Spacer()
            }
            .padding(.horizontal, 16)

            VStack(spacing: 10) {
                ForEach(recentRounds.prefix(5)) { round in
                    RoundCard(round: round, group: group)
                }
            }
            .padding(.horizontal, 16)
        }
    }

    // MARK: - Season Summary
    private var seasonSummary: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("SEASON SUMMARY")
                .font(.system(size: 11, weight: .bold))
                .tracking(1.4)
                .foregroundColor(Color(hex: "#1B5E20"))
                .padding(.horizontal, 16)

            VStack(spacing: 12) {
                HStack {
                    VStack(spacing: 4) {
                        Text("\(recentRounds.count)")
                            .font(.system(size: 28, weight: .bold))
                            .foregroundColor(Color(hex: "#1B5E20"))
                        Text("Rounds")
                            .font(.system(size: 12))
                            .foregroundColor(Color(hex: "#5C5C5C"))
                    }
                    Spacer()
                    if let avg = averageScore {
                        VStack(spacing: 4) {
                            Text(String(format: "%.1f", avg))
                                .font(.system(size: 28, weight: .bold))
                                .foregroundColor(Color(hex: "#1B5E20"))
                            Text("Avg Per Round")
                                .font(.system(size: 12))
                                .foregroundColor(Color(hex: "#5C5C5C"))
                        }
                    }
                    Spacer()
                    if let topWinner = topWinner {
                        VStack(spacing: 4) {
                            playerCircle(topWinner, color: Color(hex: "#1B5E20"), size: 36)
                            Text("Most Wins")
                                .font(.system(size: 12))
                                .foregroundColor(Color(hex: "#5C5C5C"))
                        }
                    }
                }
            }
            .padding(16)
            .background(Color.white)
            .cornerRadius(16)
            .padding(.horizontal, 16)
        }
    }

    // MARK: - Helpers
    var averageScore: Double? {
        let allScores = recentRounds.flatMap { $0.scores }.map { $0.score }
        guard !allScores.isEmpty else { return nil }
        return Double(allScores.reduce(0, +)) / Double(allScores.count)
    }

    var topWinner: String? {
        let winners = recentRounds.compactMap { $0.winnerName }
        guard !winners.isEmpty else { return nil }
        return Dictionary(grouping: winners, by: { $0 })
            .max(by: { $0.value.count < $1.value.count })?.key
    }

    func playerCircle(_ name: String, color: Color, size: CGFloat) -> some View {
        ZStack {
            Circle().fill(color)
                .frame(width: size, height: size)
            Text(String(name.prefix(1)))
                .font(.system(size: size * 0.45, weight: .bold))
                .foregroundColor(.white)
        }
    }

    func formatDate(_ dateStr: String) -> String {
        let f = DateFormatter(); f.dateFormat = "yyyy-MM-dd"
        if let date = f.date(from: dateStr) {
            let d = DateFormatter(); d.dateStyle = .medium
            return d.string(from: date)
        }
        return dateStr
    }

    // MARK: - Data
    func loadData() async {
        guard let userId = authViewModel.currentUser?.id else { return }
        isLoading = true

        let groups: [GolfGroup] = (try? await supabase.from("golf_group").select().eq("user_id", value: userId).limit(1).execute().value) ?? []
        group = groups.first
        nextCreator = UserDefaults.standard.string(forKey: "ihaf_next_creator_\(userId)") ?? (group?.golfer1 ?? "")

        let weeklies: [IHAFWeekly] = (try? await supabase
            .from("ihaf_weekly")
            .select()
            .eq("user_id", value: userId)
            .order("created_at", ascending: false)
            .limit(1)
            .execute()
            .value) ?? []
        currentWeekly = weeklies.first

        let rounds: [IHAFRound] = (try? await supabase
            .from("ihaf_rounds")
            .select()
            .eq("user_id", value: userId)
            .order("played_on", ascending: false)
            .limit(20)
            .execute()
            .value) ?? []
        recentRounds = rounds

        isLoading = false
    }

    func saveWeekly(_ weekly: IHAFWeekly) async {
        guard let userId = authViewModel.currentUser?.id else { return }
        var w = weekly; w.userId = userId
        try? await supabase.from("ihaf_weekly").insert(w).execute()

        // Rotate next creator
        if let g = group {
            let names = g.names
            let current = names.firstIndex(of: weekly.pickedBy) ?? 0
            let next = names[(current + 1) % names.count]
            UserDefaults.standard.set(next, forKey: "ihaf_next_creator_\(userId)")
            nextCreator = next
        }
        await loadData()
    }

    func saveRound(_ round: IHAFRound) async {
        guard let userId = authViewModel.currentUser?.id else { return }
        var r = round; r.userId = userId; r.weeklyId = currentWeekly?.id
        try? await supabase.from("ihaf_rounds").insert(r).execute()
        await loadData()
    }
}

// MARK: - Round Card
struct RoundCard: View {
    let round: IHAFRound
    let group: GolfGroup?
    @State private var isExpanded = false

    var formattedDate: String {
        let f = DateFormatter(); f.dateFormat = "yyyy-MM-dd"
        if let date = f.date(from: round.playedOn) {
            let d = DateFormatter(); d.dateStyle = .medium
            return d.string(from: date)
        }
        return round.playedOn
    }

    var sortedScores: [PlayerScore] {
        round.scores.sorted { $0.score < $1.score }
    }

    var body: some View {
        VStack(spacing: 0) {
            Button {
                withAnimation(.easeInOut(duration: 0.2)) { isExpanded.toggle() }
            } label: {
                HStack(spacing: 12) {
                    Text(round.challengeEmoji).font(.system(size: 20))
                    VStack(alignment: .leading, spacing: 2) {
                        Text(round.courseName ?? round.challengeName)
                            .font(.system(size: 14, weight: .bold))
                            .foregroundColor(Color(hex: "#1A1A1A"))
                        HStack(spacing: 6) {
                            if let winner = round.winnerName {
                                Text("🏆 \(winner)")
                                    .font(.system(size: 12))
                                    .foregroundColor(Color(hex: "#1B5E20"))
                            }
                            Text("• \(formattedDate)")
                                .font(.system(size: 12))
                                .foregroundColor(Color(hex: "#AAAAAA"))
                        }
                    }
                    Spacer()
                    // Player circles
                    HStack(spacing: -6) {
                        ForEach(round.scores.prefix(4)) { score in
                            ZStack {
                                Circle().fill(Color(hex: "#1B5E20"))
                                    .frame(width: 26, height: 26)
                                Text(String(score.name.prefix(1)))
                                    .font(.system(size: 11, weight: .bold))
                                    .foregroundColor(.white)
                            }
                        }
                    }
                    Image(systemName: isExpanded ? "chevron.up" : "chevron.down")
                        .font(.system(size: 11, weight: .semibold))
                        .foregroundColor(Color(hex: "#1B5E20"))
                }
                .padding(14)
            }
            .buttonStyle(PlainButtonStyle())

            if isExpanded {
                VStack(spacing: 8) {
                    ForEach(Array(sortedScores.enumerated()), id: \.element.id) { index, score in
                        HStack {
                            if index == 0 {
                                Text("🏆").font(.system(size: 14))
                            } else {
                                Text("\(index + 1)").font(.system(size: 14))
                                    .foregroundColor(Color(hex: "#888888"))
                                    .frame(width: 20)
                            }
                            Text(score.name)
                                .font(.system(size: 14, weight: index == 0 ? .bold : .regular))
                                .foregroundColor(index == 0 ? Color(hex: "#1B5E20") : Color(hex: "#1A1A1A"))
                            Spacer()
                            Text("\(score.score)")
                                .font(.system(size: 16, weight: .bold))
                                .foregroundColor(index == 0 ? Color(hex: "#1B5E20") : Color(hex: "#1A1A1A"))
                        }
                    }
                    if let callout = round.aiCallout {
                        Text(callout)
                            .font(.system(size: 13))
                            .foregroundColor(Color(hex: "#5C5C5C"))
                            .italic()
                            .multilineTextAlignment(.center)
                            .padding(.top, 4)
                    }
                }
                .padding(14)
                .background(Color(hex: "#F9F6F0"))
            }
        }
        .background(Color.white)
        .cornerRadius(14)
        .shadow(color: Color.black.opacity(0.04), radius: 4, x: 0, y: 2)
    }
}

// MARK: - Challenge Picker
struct ChallengePicker: View {
    let group: GolfGroup?
    let currentCreator: String
    let onConfirm: (IHAFWeekly) -> Void
    @Environment(\.dismiss) var dismiss
    @State private var challenges: [IHAFChallenge] = []
    @State private var selected: IHAFChallenge? = nil
    @State private var isLoadingSurprise = false
    @State private var surpriseChallenge: IHAFChallenge? = nil

    private let supabase = SupabaseClient.shared.client

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                VStack(spacing: 4) {
                    Text("Choose Next Week's")
                        .font(.system(size: 18))
                        .foregroundColor(Color(hex: "#5C5C5C"))
                    Text("I Had a Five™ Challenge")
                        .font(.system(size: 22, weight: .bold))
                        .foregroundColor(Color(hex: "#1B5E20"))
                    Text("\(currentCreator)'s turn to pick")
                        .font(.system(size: 14))
                        .foregroundColor(Color(hex: "#888888"))
                        .italic()
                }
                .padding(.vertical, 20)

                ScrollView {
                    VStack(spacing: 10) {
                        ForEach(challenges) { challenge in
                            if challenge.name == "Surprise Me" {
                                surpriseMeButton(challenge)
                            } else {
                                challengeRow(challenge)
                            }
                        }
                    }
                    .padding(16)
                }

                // Confirm button
                Button {
                    let pick = surpriseChallenge ?? selected
                    guard let c = pick else { return }
                    let formatter = DateFormatter(); formatter.dateFormat = "yyyy-MM-dd"
                    let weekly = IHAFWeekly(
                        challengeName: c.name,
                        challengeDesc: c.description,
                        challengeEmoji: c.emoji,
                        pickedBy: currentCreator,
                        weekStart: formatter.string(from: Date())
                    )
                    onConfirm(weekly)
                } label: {
                    Text("Confirm Challenge")
                        .font(.system(size: 17, weight: .bold))
                        .foregroundColor(.white)
                        .frame(maxWidth: .infinity).padding(.vertical, 16)
                        .background((selected != nil || surpriseChallenge != nil) ? Color(hex: "#1B5E20") : Color.gray)
                        .cornerRadius(14)
                }
                .disabled(selected == nil && surpriseChallenge == nil)
                .padding(16)
            }
            .background(Color(hex: "#F9F6F0"))
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }
            }
            .onAppear { Task { await loadChallenges() } }
        }
    }

    func challengeRow(_ challenge: IHAFChallenge) -> some View {
        Button {
            selected = challenge
            surpriseChallenge = nil
        } label: {
            HStack(spacing: 14) {
                Text(challenge.emoji).font(.system(size: 28))
                VStack(alignment: .leading, spacing: 3) {
                    Text(challenge.name)
                        .font(.system(size: 15, weight: .bold))
                        .foregroundColor(Color(hex: "#1A1A1A"))
                    Text(challenge.description)
                        .font(.system(size: 13))
                        .foregroundColor(Color(hex: "#5C5C5C"))
                }
                Spacer()
                Circle()
                    .stroke(selected?.id == challenge.id ? Color(hex: "#1B5E20") : Color(hex: "#CCCCCC"), lineWidth: 2)
                    .background(Circle().fill(selected?.id == challenge.id ? Color(hex: "#1B5E20") : Color.clear))
                    .frame(width: 22, height: 22)
                    .overlay(
                        selected?.id == challenge.id ?
                        Image(systemName: "checkmark").font(.system(size: 10, weight: .bold)).foregroundColor(.white) : nil
                    )
            }
            .padding(14)
            .background(Color.white)
            .cornerRadius(14)
            .overlay(RoundedRectangle(cornerRadius: 14).stroke(selected?.id == challenge.id ? Color(hex: "#1B5E20") : Color.clear, lineWidth: 2))
        }
        .buttonStyle(PlainButtonStyle())
    }

    func surpriseMeButton(_ challenge: IHAFChallenge) -> some View {
        Button {
            Task { await loadSurprise() }
        } label: {
            HStack(spacing: 14) {
                Text(surpriseChallenge != nil ? surpriseChallenge!.emoji : challenge.emoji)
                    .font(.system(size: 28))
                VStack(alignment: .leading, spacing: 3) {
                    Text(surpriseChallenge != nil ? surpriseChallenge!.name : challenge.name)
                        .font(.system(size: 15, weight: .bold))
                        .foregroundColor(Color(hex: "#1B5E20"))
                    Text(surpriseChallenge != nil ? surpriseChallenge!.description : challenge.description)
                        .font(.system(size: 13))
                        .foregroundColor(Color(hex: "#5C5C5C"))
                }
                Spacer()
                if isLoadingSurprise {
                    ProgressView().scaleEffect(0.8)
                } else {
                    Circle()
                        .stroke(surpriseChallenge != nil ? Color(hex: "#1B5E20") : Color(hex: "#CCCCCC"), lineWidth: 2)
                        .background(Circle().fill(surpriseChallenge != nil ? Color(hex: "#1B5E20") : Color.clear))
                        .frame(width: 22, height: 22)
                        .overlay(
                            surpriseChallenge != nil ?
                            Image(systemName: "checkmark").font(.system(size: 10, weight: .bold)).foregroundColor(.white) : nil
                        )
                }
            }
            .padding(14)
            .background(Color(hex: "#E8F5E9"))
            .cornerRadius(14)
            .overlay(RoundedRectangle(cornerRadius: 14).stroke(surpriseChallenge != nil ? Color(hex: "#1B5E20") : Color.clear, lineWidth: 2))
        }
        .buttonStyle(PlainButtonStyle())
    }

    func loadChallenges() async {
        let result: [IHAFChallenge] = (try? await supabase
            .from("ihaf_challenges")
            .select()
            .order("sort_order")
            .execute()
            .value) ?? []
        challenges = result
    }

    func loadSurprise() async {
        isLoadingSurprise = true
        selected = nil
        guard let url = URL(string: "https://golf-ai-companion.vercel.app/api/ihaf-generate") else { return }
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try? JSONSerialization.data(withJSONObject: ["mode": "surprise"])

        if let (data, _) = try? await URLSession.shared.data(for: request),
           let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
           let c = json["challenge"] as? [String: Any],
           let name = c["name"] as? String,
           let desc = c["description"] as? String,
           let emoji = c["emoji"] as? String {
            surpriseChallenge = IHAFChallenge(id: UUID(), name: name, description: desc, emoji: emoji)
        }
        isLoadingSurprise = false
    }
}

// MARK: - Enter Scores View
struct EnterScoresView: View {
    let group: GolfGroup?
    let weekly: IHAFWeekly?
    let onSave: (IHAFRound) -> Void
    @Environment(\.dismiss) var dismiss
    @EnvironmentObject var authViewModel: AuthViewModel

    @State private var scores: [PlayerScore] = []
    @State private var courseName = ""
    @State private var playedOn = Date()
    @State private var isSaving = false
    @State private var winnerCard: (winner: String, score: Int, callout: String)? = nil

    var sortedScores: [PlayerScore] { scores.sorted { $0.score < $1.score } }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 20) {
                    // Challenge reminder
                    if let weekly = weekly {
                        HStack(spacing: 10) {
                            Text(weekly.challengeEmoji).font(.system(size: 28))
                            VStack(alignment: .leading, spacing: 2) {
                                Text(weekly.challengeName)
                                    .font(.system(size: 17, weight: .bold))
                                    .foregroundColor(Color(hex: "#1B5E20"))
                                Text(weekly.challengeDesc)
                                    .font(.system(size: 13))
                                    .foregroundColor(Color(hex: "#5C5C5C"))
                            }
                            Spacer()
                        }
                        .padding(14)
                        .background(Color(hex: "#E8F5E9"))
                        .cornerRadius(14)
                    }

                    // Winner announcement
                    if let wc = winnerCard {
                        VStack(spacing: 8) {
                            Text("🏆").font(.system(size: 48))
                            Text("I Had a Five™ Champion")
                                .font(.system(size: 14, weight: .bold))
                                .foregroundColor(Color(hex: "#888888"))
                            Text(wc.winner)
                                .font(.system(size: 28, weight: .bold))
                                .foregroundColor(Color(hex: "#1B5E20"))
                            Text("\(wc.score) \(weekly?.challengeName ?? "")")
                                .font(.system(size: 16))
                                .foregroundColor(Color(hex: "#5C5C5C"))
                            Text(wc.callout)
                                .font(.system(size: 14))
                                .foregroundColor(Color(hex: "#5C5C5C"))
                                .italic()
                                .multilineTextAlignment(.center)
                                .padding(.top, 4)
                        }
                        .padding(20)
                        .background(Color(hex: "#E8F5E9"))
                        .cornerRadius(20)
                    }

                    // Score entry
                    VStack(spacing: 10) {
                        ForEach($scores) { $score in
                            HStack(spacing: 16) {
                                ZStack {
                                    Circle().fill(Color(hex: "#1B5E20")).frame(width: 36, height: 36)
                                    Text(String(score.name.prefix(1)))
                                        .font(.system(size: 15, weight: .bold))
                                        .foregroundColor(.white)
                                }
                                Text(score.name)
                                    .font(.system(size: 16, weight: .semibold))
                                    .foregroundColor(Color(hex: "#1A1A1A"))
                                Spacer()
                                HStack(spacing: 16) {
                                    Button {
                                        if score.score > 0 { score.score -= 1 }
                                    } label: {
                                        Image(systemName: "minus.circle.fill")
                                            .font(.system(size: 28))
                                            .foregroundColor(Color(hex: "#1B5E20"))
                                    }
                                    Text("\(score.score)")
                                        .font(.system(size: 24, weight: .bold))
                                        .foregroundColor(Color(hex: "#1A1A1A"))
                                        .frame(width: 36, alignment: .center)
                                    Button {
                                        score.score += 1
                                    } label: {
                                        Image(systemName: "plus.circle.fill")
                                            .font(.system(size: 28))
                                            .foregroundColor(Color(hex: "#1B5E20"))
                                    }
                                }
                            }
                            .padding(14)
                            .background(Color.white)
                            .cornerRadius(14)
                        }
                    }

                    // Course + date
                    VStack(spacing: 10) {
                        TextField("Course name (optional)", text: $courseName)
                            .font(.system(size: 15)).padding(12)
                            .background(Color.white).cornerRadius(12)
                        DatePicker("Played on", selection: $playedOn, displayedComponents: .date)
                            .padding(12).background(Color.white).cornerRadius(12)
                    }

                    // Save button
                    Button {
                        Task { await saveRound() }
                    } label: {
                        Text(isSaving ? "Saving..." : "Save Round")
                            .font(.system(size: 17, weight: .bold))
                            .foregroundColor(.white)
                            .frame(maxWidth: .infinity).padding(.vertical, 16)
                            .background(Color(hex: "#1B5E20")).cornerRadius(14)
                    }
                    .disabled(isSaving)
                }
                .padding(16)
            }
            .background(Color(hex: "#F9F6F0"))
            .navigationTitle("Enter Scores")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Cancel") { dismiss() } }
            }
            .onAppear { setupScores() }
        }
    }

    func setupScores() {
        guard let g = group else { return }
        scores = g.names.map { PlayerScore(name: $0, score: 0) }
    }

    func saveRound() async {
        isSaving = true
        let winner = sortedScores.first
        var callout = ""

        // Get AI callout
        if let w = winner, let weekly = weekly {
            if let url = URL(string: "https://golf-ai-companion.vercel.app/api/ihaf-generate") {
                var request = URLRequest(url: url)
                request.httpMethod = "POST"
                request.setValue("application/json", forHTTPHeaderField: "Content-Type")
                let body: [String: Any] = [
                    "mode": "callout",
                    "challenge": weekly.challengeName,
                    "winner": w.name,
                    "winnerScore": w.score,
                    "golfers": scores.map { ["name": $0.name, "score": $0.score] }
                ]
                request.httpBody = try? JSONSerialization.data(withJSONObject: body)
                if let (data, _) = try? await URLSession.shared.data(for: request),
                   let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                   let c = json["callout"] as? String {
                    callout = c
                }
            }
            winnerCard = (winner: w.name, score: w.score, callout: callout)
        }

        let formatter = DateFormatter(); formatter.dateFormat = "yyyy-MM-dd"
        let round = IHAFRound(
            challengeName: weekly?.challengeName ?? "Challenge",
            challengeEmoji: weekly?.challengeEmoji ?? "🏆",
            courseName: courseName.isEmpty ? nil : courseName,
            playedOn: formatter.string(from: playedOn),
            scores: scores,
            winnerName: winner?.name,
            winnerScore: winner?.score,
            aiCallout: callout.isEmpty ? nil : callout
        )

        // Show winner for a moment then save
        try? await Task.sleep(nanoseconds: 2_000_000_000)
        onSave(round)
        isSaving = false
    }
}

import SwiftUI
import Supabase

struct SavedCourse: Codable, Identifiable {
    var id: UUID?
    var userId: UUID?
    var name: String
    var notes: String?
    var teeTimeUrl: String?
    var phone: String?
    var bookingWindowDays: Int?
    var bookingOpensTime: String?
    var bookingNotes: String?

    enum CodingKeys: String, CodingKey {
        case id, name, notes, phone
        case userId = "user_id"
        case teeTimeUrl = "tee_time_url"
        case bookingWindowDays = "booking_window_days"
        case bookingOpensTime = "booking_opens_time"
        case bookingNotes = "booking_notes"
    }
}

func formatTime12h(_ hhmm: String?) -> String? {
    guard let hhmm = hhmm, !hhmm.isEmpty else { return nil }
    let parts = hhmm.split(separator: ":")
    guard parts.count == 2, let h = Int(parts[0]), let m = Int(parts[1]) else { return nil }
    let ampm = h >= 12 ? "PM" : "AM"
    let h12 = h % 12 == 0 ? 12 : h % 12
    return String(format: "%d:%02d %@", h12, m, ampm)
}

func formatBookingLabel(days: Int?, time: String?) -> String? {
    guard let days = days else { return nil }
    let t = formatTime12h(time)
    if days == 0 {
        return t != nil ? "Same-day booking at \(t!)" : "Same-day booking"
    }
    let base = "Books \(days) day\(days == 1 ? "" : "s") out"
    return t != nil ? "\(base) at \(t!)" : base
}

struct MyCoursesView: View {
    @EnvironmentObject var authViewModel: AuthViewModel
    @State private var courses: [SavedCourse] = []
    @State private var isLoading = true
    @State private var showForm = false
    @State private var editingCourse: SavedCourse? = nil

    private let supabase = SupabaseClient.shared.client

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 0) {
                    headerBanner

                    if isLoading {
                        ProgressView().padding(48)
                    } else if courses.isEmpty {
                        emptyState
                    } else {
                        VStack(spacing: 12) {
                            ForEach(courses) { course in
                                CourseCard(course: course, onEdit: {
                                    editingCourse = course
                                    showForm = true
                                }, onDelete: {
                                    Task { await deleteCourse(course) }
                                })
                            }
                        }
                        .padding(16)
                    }
                }
            }
            .background(Color(hex: "#F9F6F0"))
            .navigationBarHidden(true)
            .onAppear { Task { await loadCourses() } }
            .sheet(isPresented: $showForm, onDismiss: { editingCourse = nil }) {
                CourseFormView(existing: editingCourse, onSave: { course in
                    Task {
                        await saveCourse(course)
                        showForm = false
                    }
                })
            }
        }
    }

    private var headerBanner: some View {
        VStack(spacing: 0) {
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text("My Courses")
                        .font(.system(size: 24, weight: .bold))
                        .foregroundColor(Color(hex: "#1B5E20"))
                    Text("Your golf address book")
                        .font(.system(size: 13))
                        .foregroundColor(Color(hex: "#5C5C5C"))
                        .italic()
                }
                Spacer()
                Button {
                    editingCourse = nil
                    showForm = true
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
        VStack(spacing: 12) {
            Text("🗺️").font(.system(size: 48))
            Text("No courses saved yet")
                .font(.system(size: 17, weight: .bold))
                .foregroundColor(Color(hex: "#1A1A1A"))
            Text("Add your favorite courses, tee time links,\nand booking windows")
                .font(.system(size: 14))
                .foregroundColor(Color(hex: "#5C5C5C"))
                .multilineTextAlignment(.center)
            Button {
                editingCourse = nil
                showForm = true
            } label: {
                Text("Add a Course")
                    .font(.system(size: 15, weight: .bold))
                    .foregroundColor(.white)
                    .padding(.horizontal, 24).padding(.vertical, 12)
                    .background(Color(hex: "#1B5E20"))
                    .cornerRadius(14)
            }
            .padding(.top, 8)
        }
        .padding(.top, 60)
        .padding(.horizontal, 32)
    }

    func loadCourses() async {
        guard let userId = authViewModel.currentUser?.id else { return }
        isLoading = true
        let result: [SavedCourse] = (try? await supabase
            .from("saved_courses")
            .select()
            .eq("user_id", value: userId)
            .order("name")
            .execute()
            .value) ?? []
        courses = result
        isLoading = false
    }

    func saveCourse(_ course: SavedCourse) async {
        guard let userId = authViewModel.currentUser?.id else { return }
        var c = course
        c.userId = userId
        if c.id != nil {
            try? await supabase.from("saved_courses").update(c).eq("id", value: c.id!).execute()
        } else {
            try? await supabase.from("saved_courses").insert(c).execute()
        }
        await loadCourses()
    }

    func deleteCourse(_ course: SavedCourse) async {
        guard let id = course.id else { return }
        try? await supabase.from("saved_courses").delete().eq("id", value: id).execute()
        await loadCourses()
    }
}

// MARK: - Course Card
struct CourseCard: View {
    let course: SavedCourse
    let onEdit: () -> Void
    let onDelete: () -> Void
    @State private var showDeleteConfirm = false

    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text(course.name)
                        .font(.system(size: 17, weight: .bold))
                        .foregroundColor(Color(hex: "#1A1A1A"))
                    if let phone = course.phone, !phone.isEmpty {
                        Text(phone)
                            .font(.system(size: 13))
                            .foregroundColor(Color(hex: "#5C5C5C"))
                    }
                }
                Spacer()
                Menu {
                    Button("Edit", action: onEdit)
                    Button("Delete", role: .destructive) { showDeleteConfirm = true }
                } label: {
                    Image(systemName: "ellipsis.circle")
                        .font(.system(size: 20))
                        .foregroundColor(Color(hex: "#888888"))
                }
            }

            if let label = formatBookingLabel(days: course.bookingWindowDays, time: course.bookingOpensTime) {
                HStack(spacing: 6) {
                    Image(systemName: "clock.fill").font(.system(size: 11))
                    Text(label).font(.system(size: 12, weight: .semibold))
                }
                .foregroundColor(Color(hex: "#1B5E20"))
                .padding(.horizontal, 10).padding(.vertical, 5)
                .background(Color(hex: "#E8F5E9"))
                .cornerRadius(10)
            }

            if let notes = course.notes, !notes.isEmpty {
                Text(notes)
                    .font(.system(size: 14))
                    .foregroundColor(Color(hex: "#2C2C2C"))
            }

            if let bookingNotes = course.bookingNotes, !bookingNotes.isEmpty {
                Text(bookingNotes)
                    .font(.system(size: 12))
                    .foregroundColor(Color(hex: "#888888"))
                    .italic()
            }

            HStack(spacing: 10) {
                if let urlStr = course.teeTimeUrl, !urlStr.isEmpty, let url = URL(string: urlStr) {
                    Link(destination: url) {
                        HStack(spacing: 4) {
                            Image(systemName: "calendar").font(.system(size: 12))
                            Text("Book Tee Time").font(.system(size: 12, weight: .semibold))
                        }
                        .foregroundColor(.white)
                        .padding(.horizontal, 12).padding(.vertical, 8)
                        .background(Color(hex: "#1B5E20"))
                        .cornerRadius(10)
                    }
                }
                if let phone = course.phone, !phone.isEmpty, let telUrl = URL(string: "tel:\(phone.filter { $0.isNumber })") {
                    Link(destination: telUrl) {
                        HStack(spacing: 4) {
                            Image(systemName: "phone.fill").font(.system(size: 12))
                            Text("Call").font(.system(size: 12, weight: .semibold))
                        }
                        .foregroundColor(Color(hex: "#1B5E20"))
                        .padding(.horizontal, 12).padding(.vertical, 8)
                        .background(Color(hex: "#E8F5E9"))
                        .cornerRadius(10)
                    }
                }
            }
        }
        .padding(14)
        .background(Color.white)
        .cornerRadius(16)
        .overlay(RoundedRectangle(cornerRadius: 16).stroke(Color(hex: "#E0EAE0"), lineWidth: 1))
        .alert("Delete \(course.name)?", isPresented: $showDeleteConfirm) {
            Button("Delete", role: .destructive, action: onDelete)
            Button("Cancel", role: .cancel) { }
        }
    }
}

// MARK: - Course Form
struct CourseFormView: View {
    var existing: SavedCourse? = nil
    let onSave: (SavedCourse) -> Void
    @Environment(\.dismiss) var dismiss

    @State private var name = ""
    @State private var notes = ""
    @State private var teeTimeUrl = ""
    @State private var phone = ""
    @State private var bookingWindowDays: Int? = nil
    @State private var bookingOpensTime = ""
    @State private var bookingNotes = ""

    let windowPresets: [(String, Int?)] = [("Not set", nil), ("Same day", 0), ("3 days", 3), ("5 days", 5), ("7 days", 7)]
    let timePresets: [(String, String)] = [("Not set", ""), ("Midnight", "00:00"), ("6 AM", "06:00")]

    var body: some View {
        NavigationStack {
            Form {
                Section("Course Info") {
                    TextField("Course Name", text: $name)
                    TextField("Phone", text: $phone)
                        .keyboardType(.phonePad)
                    TextField("Tee Time Booking URL", text: $teeTimeUrl)
                        .keyboardType(.URL)
                        .autocapitalization(.none)
                    TextField("Notes", text: $notes, axis: .vertical)
                        .lineLimit(2...4)
                }

                Section("Booking Window") {
                    Picker("Opens", selection: $bookingWindowDays) {
                        ForEach(windowPresets, id: \.0) { preset in
                            Text(preset.0).tag(preset.1)
                        }
                    }
                    Picker("At Time", selection: $bookingOpensTime) {
                        ForEach(timePresets, id: \.0) { preset in
                            Text(preset.0).tag(preset.1)
                        }
                    }
                    TextField("Booking Notes (e.g. phone only)", text: $bookingNotes, axis: .vertical)
                }
            }
            .navigationTitle(existing == nil ? "Add Course" : "Edit Course")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") {
                        var course = SavedCourse(
                            id: existing?.id,
                            name: name,
                            notes: notes.isEmpty ? nil : notes,
                            teeTimeUrl: teeTimeUrl.isEmpty ? nil : teeTimeUrl,
                            phone: phone.isEmpty ? nil : phone,
                            bookingWindowDays: bookingWindowDays,
                            bookingOpensTime: bookingOpensTime.isEmpty ? nil : bookingOpensTime,
                            bookingNotes: bookingNotes.isEmpty ? nil : bookingNotes
                        )
                        onSave(course)
                    }
                    .disabled(name.isEmpty)
                }
            }
            .onAppear {
                if let e = existing {
                    name = e.name
                    notes = e.notes ?? ""
                    teeTimeUrl = e.teeTimeUrl ?? ""
                    phone = e.phone ?? ""
                    bookingWindowDays = e.bookingWindowDays
                    bookingOpensTime = e.bookingOpensTime ?? ""
                    bookingNotes = e.bookingNotes ?? ""
                }
            }
        }
    }
}

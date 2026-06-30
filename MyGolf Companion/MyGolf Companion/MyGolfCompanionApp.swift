import SwiftUI
import Supabase

@main
struct MyGolfCompanionApp: App {
    @StateObject private var authViewModel = AuthViewModel()

    init() {
        _ = SupabaseClient.shared
    }

    var body: some Scene {
        WindowGroup {
            Group {
                if authViewModel.isLoading {
                    ProgressView()
                        .progressViewStyle(CircularProgressViewStyle(tint: Color(hex: "#1B5E20")))
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                        .background(Color(hex: "#F9F6F0"))
                } else if authViewModel.isAuthenticated {
                    ContentView()
                        .environmentObject(authViewModel)
                } else {
                    SignInView()
                        .environmentObject(authViewModel)
                }
            }
            .onOpenURL { url in
                Task {
                    try? await SupabaseClient.shared.client.auth.session(from: url)
                    await authViewModel.checkSession()
                }
            }
        }
    }
}

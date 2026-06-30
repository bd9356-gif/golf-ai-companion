import SwiftUI
import Supabase

struct SignInView: View {
    @EnvironmentObject var authViewModel: AuthViewModel
    @State private var errorMessage = ""

    @Environment(\.horizontalSizeClass) var sizeClass

    var body: some View {
        ZStack {
            Color(hex: "#F9F6F0").ignoresSafeArea()

            VStack(spacing: 32) {
                Spacer()

                // Banner
                VStack(spacing: 8) {
                    Image("MasterHero")
                        .resizable()
                        .scaledToFit()
                        .frame(maxWidth: 320)
                        .padding(.horizontal, 24)

                    Text("Your Personal Golf Companion")
                        .font(.system(size: 15))
                        .italic()
                        .foregroundColor(Color(hex: "#4A7A4A"))
                }

                Spacer()

                // Sign in buttons
                VStack(spacing: 12) {

                    if !errorMessage.isEmpty {
                        Text(errorMessage)
                            .font(.caption)
                            .foregroundColor(.red)
                            .multilineTextAlignment(.center)
                            .padding(.horizontal)
                    }

                    // Apple Sign In
                    Button {
                        Task { await authViewModel.signInWithApple() }
                    } label: {
                        HStack {
                            Image(systemName: "apple.logo")
                            Text("Sign in with Apple").fontWeight(.semibold)
                        }
                        .frame(maxWidth: .infinity)
                        .frame(height: 54)
                        .background(Color.black)
                        .foregroundColor(.white)
                        .cornerRadius(14)
                    }

                    // Google Sign In
                    Button {
                        Task {
                            do {
                                try await SupabaseClient.shared.client.auth.signInWithOAuth(
                                    provider: .google,
                                    redirectTo: URL(string: "com.mycompanionapps.golf://login-callback"),
                                    queryParams: [(name: "prompt", value: "select_account")]
                                )
                                await authViewModel.checkSession()
                            } catch {
                                print("Google OAuth error:", error)
                                await MainActor.run { errorMessage = error.localizedDescription }
                            }
                        }
                    } label: {
                        HStack {
                            Image(systemName: "globe")
                            Text("Sign in with Google").fontWeight(.semibold)
                        }
                        .frame(maxWidth: .infinity)
                        .frame(height: 54)
                        .background(Color(.systemGray5))
                        .foregroundColor(.primary)
                        .cornerRadius(14)
                    }
                }
                .padding(.horizontal, 24)
                .padding(.bottom, 40)
                .frame(maxWidth: sizeClass == .regular ? 480 : .infinity)
            }
        }
    }
}

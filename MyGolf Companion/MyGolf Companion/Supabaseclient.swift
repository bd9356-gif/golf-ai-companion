import Foundation
import Supabase

class SupabaseClient {
    static let shared = SupabaseClient()

    let client: Supabase.SupabaseClient

    private init() {
        let url = URL(string: "https://oxipafpvpepfyvwielwy.supabase.co")!
        let key = "sb_publishable_3OhJ9J7Gjzyo_uLjEgQYUQ_h4dBgC_7"

        client = Supabase.SupabaseClient(
            supabaseURL: url,
            supabaseKey: key,
            options: SupabaseClientOptions(
                auth: SupabaseClientOptions.AuthOptions(
                    emitLocalSessionAsInitialSession: true
                )
            )
        )
    }
}

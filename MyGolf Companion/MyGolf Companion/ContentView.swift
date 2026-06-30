import SwiftUI

struct ContentView: View {
    @EnvironmentObject var authViewModel: AuthViewModel
    @State private var selectedTab: Tab = .clubhouse

    enum Tab {
        case clubhouse, myBag, iHadAFive, aiClubhouse, more
    }

    var body: some View {
        TabView(selection: $selectedTab) {

            ClubhouseView()
                .tabItem {
                    Label("Home", systemImage: "house.fill")
                }
                .tag(Tab.clubhouse)

            MyBagView()
                .tabItem {
                    Label("MyBag", systemImage: "bag.fill")
                }
                .tag(Tab.myBag)

            IHadAFiveView()
                .tabItem {
                    Label("I Had a Five™", systemImage: "trophy.fill")
                }
                .tag(Tab.iHadAFive)

            AIClubhouseView()
                .tabItem {
                    Label("Clubhouse", systemImage: "graduationcap.fill")
                }
                .tag(Tab.aiClubhouse)

            MoreView()
                .tabItem {
                    Label("More", systemImage: "ellipsis")
                }
                .tag(Tab.more)
        }
        .accentColor(Color("GolfGreen"))
    }
}

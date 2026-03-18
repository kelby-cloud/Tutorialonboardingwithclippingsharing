import Foundation

struct Contact: Identifiable {
    let id = UUID()
    var name: String
    var handle: String?
    var photoURL: String
    var isOnReclip: Bool
    var isSelected: Bool = false
}

extension Contact {
    static let samples: [Contact] = [
        Contact(name: "Alex Rivera", handle: "@alexr",
                photoURL: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face",
                isOnReclip: true),
        Contact(name: "Jordan Kim", handle: "@jordank",
                photoURL: "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=100&h=100&fit=crop&crop=face",
                isOnReclip: true),
        Contact(name: "Sam Chen", handle: "@samchen",
                photoURL: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face",
                isOnReclip: false),
        Contact(name: "Taylor Swift", handle: "@tswift",
                photoURL: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=face",
                isOnReclip: true),
        Contact(name: "Morgan Lee", handle: "@morganl",
                photoURL: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=face",
                isOnReclip: false),
        Contact(name: "Casey Park", handle: "@caseyp",
                photoURL: "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=100&h=100&fit=crop&crop=face",
                isOnReclip: true),
        Contact(name: "Riley Johnson", handle: "@rileyj",
                photoURL: "https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=100&h=100&fit=crop&crop=face",
                isOnReclip: false),
        Contact(name: "Drew Martinez", handle: "@drewm",
                photoURL: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face",
                isOnReclip: true),
    ]
}

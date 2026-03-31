export default function PreviewMode({ feature = '' }) {
  return (
    <div className="mt-2 p-4 bg-gray-50 border border-gray-200 rounded-xl">
      <p className="text-sm font-semibold text-gray-700 mb-1">
        🔒 Preview Mode
      </p>
      <p className="text-sm text-gray-500 leading-relaxed">
        {feature ? `${feature} is` : 'This feature is'} part of your personalized MyGolf Plan — AI-powered tools need an account to give you the best experience.
      </p>
      <div className="flex gap-3 mt-3">
        <a
          href="/login"
          className="px-4 py-2 bg-green-700 text-white text-sm font-semibold rounded-xl hover:bg-green-800 transition-colors"
        >
          Sign In
        </a>
        <a
          href="/login"
          className="px-4 py-2 border border-gray-200 text-gray-600 text-sm font-semibold rounded-xl hover:bg-gray-50 transition-colors"
        >
          Create Free Account
        </a>
      </div>
    </div>
  )
}

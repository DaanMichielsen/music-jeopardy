export default function TestUploadPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">Upload Test Page</h1>
        <p className="text-gray-600 mb-4">This page is accessible without authentication</p>
        <a 
          href="/upload-avatar?gameId=test&playerId=test" 
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Test Upload Page
        </a>
      </div>
    </div>
  )
} 
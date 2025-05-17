// frontend/src/components/profile/AboutSection.js
const AboutSection = ({ user }) => {
    return (
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <h2 className="font-bold text-navy-800 mb-4">About</h2>
        
        {user.aboutMe ? (
          <p className="text-gray-700 mb-4">{user.aboutMe}</p>
        ) : (
          <p className="text-gray-500 italic mb-4">No bio provided</p>
        )}
        
        <div className="space-y-3">
          <div className="flex items-center text-sm">
            <span className="mr-2">📧</span>
            <span className="text-gray-700">{user.email}</span>
          </div>
          
          {user.nickname && (
            <div className="flex items-center text-sm">
              <span className="mr-2">👤</span>
              <span className="text-gray-700">@{user.nickname}</span>
            </div>
          )}
          
          <div className="flex items-center text-sm">
            <span className="mr-2">{user.isPublic ? '🌎' : '🔒'}</span>
            <span className="text-gray-700">{user.isPublic ? 'Public profile' : 'Private profile'}</span>
          </div>
        </div>
      </div>
    );
  };
  
  export default AboutSection;
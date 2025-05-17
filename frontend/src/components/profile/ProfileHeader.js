// frontend/src/components/profile/ProfileHeader.js
const ProfileHeader = ({ 
    user, 
    isCurrentUser, 
    isFollowing, 
    followStatus,
    onEditProfile, 
    onFollow,
    onTogglePublic
  }) => {
    return (
      <div>
        {/* Cover Photo */}
        <div className="h-48 bg-gradient-to-r from-navy-600 to-navy-400 rounded-lg mb-4 relative">
          {user.coverPhotoPath && (
            <img 
              src={user.coverPhotoPath} 
              alt="Cover" 
              className="w-full h-full object-cover rounded-lg"
            />
          )}
          
          {/* Profile Actions */}
          <div className="absolute top-4 right-4 flex gap-2">
            {isCurrentUser ? (
              <>
                <button 
                  onClick={onTogglePublic}
                  className="px-3 py-1.5 bg-white bg-opacity-90 rounded-md text-sm font-medium flex items-center gap-1 hover:bg-opacity-100"
                >
                  {user.isPublic ? '🌎 Public' : '🔒 Private'}
                </button>
                <button 
                  onClick={onEditProfile}
                  className="px-3 py-1.5 bg-white bg-opacity-90 rounded-md text-sm font-medium hover:bg-opacity-100"
                >
                  Edit Profile
                </button>
              </>
            ) : (
              <button 
                onClick={onFollow}
                className={`px-3 py-1.5 rounded-md text-sm font-medium ${
                  isFollowing
                    ? 'bg-white bg-opacity-90 text-navy-600 hover:bg-opacity-100'
                    : 'bg-navy-600 text-white hover:bg-navy-700'
                }`}
              >
                {isFollowing 
                  ? 'Following' 
                  : followStatus === 'pending' 
                    ? 'Requested' 
                    : 'Follow'}
              </button>
            )}
          </div>
        </div>
        
        {/* Profile Info */}
        <div className="flex flex-wrap">
          {/* Avatar */}
          <div className="w-32 h-32 bg-navy-200 rounded-full border-4 border-white -mt-16 ml-8 flex items-center justify-center text-navy-700 font-bold text-4xl">
            {user.avatarPath ? (
              <img 
                src={user.avatarPath} 
                alt={`${user.firstName} ${user.lastName}`} 
                className="w-full h-full object-cover rounded-full"
              />
            ) : (
              <>
                {user.firstName.charAt(0)}{user.lastName.charAt(0)}
              </>
            )}
          </div>
          
          {/* User Details */}
          <div className="flex-1 ml-4 mt-2">
            <h1 className="text-2xl font-bold text-navy-800">
              {user.firstName} {user.lastName}
            </h1>
            <p className="text-gray-600">
              @{user.nickname || `${user.firstName.toLowerCase()}${user.lastName.toLowerCase()}`}
              {' '}
              {user.isPublic 
                ? <span title="Public profile">🌎</span> 
                : <span title="Private profile">🔒</span>}
            </p>
          </div>
          
          {/* Stats */}
          <div className="w-full md:w-auto flex justify-around md:ml-auto mt-4 md:mt-2">
            <div className="text-center px-4">
              <div className="font-bold text-navy-800">{user.followers}</div>
              <div className="text-sm text-gray-600">Followers</div>
            </div>
            <div className="text-center px-4">
              <div className="font-bold text-navy-800">{user.following}</div>
              <div className="text-sm text-gray-600">Following</div>
            </div>
          </div>
        </div>
      </div>
    );
  };
  
  export default ProfileHeader;